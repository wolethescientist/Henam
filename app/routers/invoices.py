from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, date
import logging
from app.database import get_db
from app.models import Invoice, Job, InvoiceStatus
from app.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, 
    InvoicesResponse, InvoiceWithJobResponse, InvoicePay
)
from app.auth import get_current_user
from app.utils.database_utils import DatabaseUtils, safe_get_by_id
from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError, BusinessLogicError
from app.utils.error_handler import ErrorHandler
from app.services.cache_middleware import cache_route
from app.services.cache_invalidation import cache_invalidation
from app.services.invoice_conversion_service import invoice_conversion_service

logger = logging.getLogger(__name__)
import asyncio

router = APIRouter(prefix="/invoices", tags=["invoices"])


def calculate_invoice_status(amount: float, paid_amount: float, due_date: date) -> InvoiceStatus:
    """
    Calculate invoice status based on payment amount and due date.
    
    Logic:
    - PAID: paid_amount >= amount (fully paid)
    - OVERDUE: paid_amount < amount AND due_date < today (partial payment but overdue)
    - PARTIAL: 0 < paid_amount < amount AND due_date >= today (partial payment, not overdue)
    - PENDING: paid_amount = 0 (no payment yet)
    """
    today = date.today()
    
    if paid_amount >= amount:
        return InvoiceStatus.PAID
    elif paid_amount == 0:
        return InvoiceStatus.PENDING
    elif due_date < today:
        return InvoiceStatus.OVERDUE
    else:
        return InvoiceStatus.PARTIAL


@router.post("", response_model=InvoiceWithJobResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new invoice (standalone or job-based)."""
    
    # Validate input based on invoice type
    if invoice_data.job_id:
        # Legacy job-based invoice
        job = safe_get_by_id(db, Job, invoice_data.job_id)
        if not job:
            raise ResourceNotFoundError(
                detail="Job not found",
                resource_type="Job",
                resource_id=invoice_data.job_id
            )
        client_name = job.client
        job_type = None
        job_details = None
    else:
        # New standalone invoice
        if not invoice_data.job_type or not invoice_data.job_details:
            raise ValidationError(
                detail="For standalone invoices, job_type and job_details are required",
                field="job_type_and_details",
                context={"job_type": invoice_data.job_type, "job_details": invoice_data.job_details}
            )
        client_name = invoice_data.client_name
        job_type = invoice_data.job_type
        job_details = invoice_data.job_details
    
    # Generate invoice number
    invoice_count = db.query(Invoice).count()
    invoice_number = f"INV-{datetime.now().year}-{str(invoice_count + 1).zfill(4)}"
    
    # Calculate pending amount and status
    paid_amount = invoice_data.paid_amount or 0.0
    pending_amount = invoice_data.amount - paid_amount
    status = calculate_invoice_status(invoice_data.amount, paid_amount, invoice_data.due_date.date())
    
    db_invoice = Invoice(
        job_id=invoice_data.job_id,
        job_type=job_type,
        client_name=client_name,
        job_details=job_details,
        invoice_number=invoice_number,
        amount=invoice_data.amount,
        paid_amount=paid_amount,
        pending_amount=pending_amount,
        due_date=invoice_data.due_date,
        status=status,
        description=invoice_data.description,
        converted_to_job=False
    )
    
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # Send notifications about new invoice (non-blocking)
    try:
        import asyncio
        import threading
        
        def send_notifications_background():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(invoice_conversion_service.notify_invoice_created(db_invoice, db, current_user.id))
                loop.close()
                logger.info(f"Invoice creation notifications sent for invoice {db_invoice.id}")
            except Exception as e:
                logger.warning(f"Could not send invoice creation notifications: {e}")
        
        notification_thread = threading.Thread(target=send_notifications_background)
        notification_thread.daemon = True
        notification_thread.start()
    except Exception as e:
        logger.warning(f"Could not start invoice notification thread: {e}")
    
    # Check if invoice should be converted to job (if payment was made)
    if invoice_conversion_service.should_convert_to_job(db_invoice):
        try:
            await invoice_conversion_service.convert_invoice_to_job(db_invoice, db)
            logger.info(f"Invoice {db_invoice.id} converted to job successfully")
        except Exception as e:
            logger.warning(f"Could not convert invoice to job: {e}")
    
    # Reload with relationships for response
    db_invoice = db.query(Invoice).options(
        selectinload(Invoice.job).selectinload(Job.team),
        selectinload(Invoice.converted_job).selectinload(Job.team)
    ).filter(Invoice.id == db_invoice.id).first()
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_invoice_data(db_invoice.id)
        logger.debug(f"Cache invalidated for invoice {db_invoice.id}")
    except Exception as e:
        logger.warning(f"Could not invalidate cache for invoice {db_invoice.id}: {e}")
    
    return db_invoice


@router.get("", response_model=InvoicesResponse)
@cache_route(resource_type="invoice", ttl=120)  # 2 minutes TTL for invoices
async def get_invoices(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    request: Request = None
):
    """Get all invoices with pagination and filtering - optimized to avoid N+1 queries."""
    # OPTIMIZED: Single query with proper joins to avoid N+1 queries
    # Use selectinload for better performance with large datasets
    
    # Base query with optimized eager loading
    query = db.query(Invoice).options(
        selectinload(Invoice.job).selectinload(Job.team),
        selectinload(Invoice.converted_job).selectinload(Job.team)
    )
    
    # Apply filters with proper indexing
    if search:
        # Use LEFT JOIN to include standalone invoices (job_id can be null)
        query = query.outerjoin(Job, Invoice.job_id == Job.id).filter(
            or_(
                Invoice.description.ilike(f"%{search}%"),  # Uses ix_invoices_description if exists
                Invoice.invoice_number.ilike(f"%{search}%"),  # Uses unique index
                Invoice.client_name.ilike(f"%{search}%"),  # Search client name for standalone invoices
                Invoice.job_type.ilike(f"%{search}%"),  # Search job type for standalone invoices
                Job.title.ilike(f"%{search}%")  # Uses ix_jobs_title if exists (for job-linked invoices)
            )
        )
    else:
        # Use LEFT JOIN to include standalone invoices (job_id can be null)
        query = query.outerjoin(Job, Invoice.job_id == Job.id)
    
    if status_filter:
        # Uses ix_invoices_status index
        query = query.filter(Invoice.status == status_filter)
        
    if team_id:
        # Uses ix_jobs_team_id index - only filter job-linked invoices by team
        query = query.filter(or_(Job.team_id == team_id, Invoice.job_id.is_(None)))
    
    # Calculate offset from page
    offset = (page - 1) * limit
    
    # OPTIMIZED: Get total count first (before pagination) for better performance
    total_count = query.count()
    
    # Get invoices with pagination
    # Sort by: 1) Not converted first (False before True), 2) Newest first within each group
    invoices = query.order_by(
        Invoice.converted_to_job.asc(),  # False (not converted) comes before True (converted)
        Invoice.created_at.desc()         # Within each group, newest first
    ).offset(offset).limit(limit).all()
    
    return InvoicesResponse(
        items=invoices,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=(total_count + limit - 1) // limit
    )


@router.get("/{invoice_id}", response_model=InvoiceWithJobResponse)
@cache_route(resource_type="invoice", ttl=120)  # 2 minutes TTL
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    request: Request = None
):
    """Get a specific invoice by ID - optimized with proper joins."""
    # OPTIMIZED: Single query with eager loading to avoid N+1 queries
    invoice = db.query(Invoice).options(
        selectinload(Invoice.job).selectinload(Job.team),
        selectinload(Invoice.converted_job).selectinload(Job.team)
    ).filter(Invoice.id == invoice_id).first()  # Uses primary key index
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceWithJobResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing invoice - optimized with single query."""
    # OPTIMIZED: Single query to get invoice (uses primary key index)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Store old paid amount to check for payment changes
    old_paid_amount = invoice.paid_amount
    
    # Update fields if provided
    if invoice_data.job_id is not None:
        # OPTIMIZED: Verify job exists with single query (uses primary key index)
        job_exists = db.query(Job.id).filter(Job.id == invoice_data.job_id).first()
        if not job_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        invoice.job_id = invoice_data.job_id
    
    if invoice_data.job_type is not None:
        invoice.job_type = invoice_data.job_type
    
    if invoice_data.client_name is not None:
        invoice.client_name = invoice_data.client_name
    
    if invoice_data.job_details is not None:
        invoice.job_details = invoice_data.job_details
    
    if invoice_data.amount is not None:
        invoice.amount = invoice_data.amount
    
    if invoice_data.paid_amount is not None:
        invoice.paid_amount = invoice_data.paid_amount
    
    if invoice_data.due_date is not None:
        invoice.due_date = invoice_data.due_date
    
    if invoice_data.status is not None:
        invoice.status = invoice_data.status
    
    if invoice_data.description is not None:
        invoice.description = invoice_data.description
    
    # Recalculate pending amount and status
    invoice.pending_amount = invoice.amount - invoice.paid_amount
    invoice.status = calculate_invoice_status(invoice.amount, invoice.paid_amount, invoice.due_date.date())
    
    # Update timestamp
    invoice.updated_at = datetime.now()
    
    db.commit()
    
    # Check if payment was made and invoice should be converted to job
    if (invoice.paid_amount > old_paid_amount and 
        invoice_conversion_service.should_convert_to_job(invoice)):
        try:
            await invoice_conversion_service.convert_invoice_to_job(invoice, db)
        except Exception as e:
            print(f"Warning: Could not convert invoice to job: {e}")
    else:
        # Send update notification in background if not converting to job
        def send_update_notification_background():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(invoice_conversion_service.notify_invoice_updated(invoice, db, current_user.id))
                loop.close()
            except Exception as e:
                print(f"Warning: Could not send invoice update notification: {e}")
        
        import threading
        update_thread = threading.Thread(target=send_update_notification_background)
        update_thread.daemon = True
        update_thread.start()
    
    db.refresh(invoice)
    
    # Reload with job relationship for response
    invoice = db.query(Invoice).options(
        selectinload(Invoice.job).selectinload(Job.team),
        selectinload(Invoice.converted_job).selectinload(Job.team)
    ).filter(Invoice.id == invoice.id).first()
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_invoice_data(invoice.id)
    except Exception as e:
        print(f"Warning: Could not invalidate cache: {e}")
    
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an invoice - optimized with single query."""
    # OPTIMIZED: Single query to check existence and delete (uses primary key index)
    deleted_count = db.query(Invoice).filter(Invoice.id == invoice_id).delete()
    
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    db.commit()
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_invoice_data(invoice_id)
    except Exception as e:
        print(f"Warning: Could not invalidate cache: {e}")
    
    return {"message": "Invoice deleted successfully"}


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Download invoice as PDF - using the proper professional format."""
    # OPTIMIZED: Single query with eager loading to avoid N+1 queries
    invoice = db.query(Invoice).options(
        selectinload(Invoice.job).selectinload(Job.team),
        selectinload(Invoice.converted_job).selectinload(Job.team)
    ).filter(Invoice.id == invoice_id).first()  # Uses primary key index
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Use the existing PDF generation service
    from app.services.export_service import generate_invoice_pdf
    from fastapi.responses import Response
    
    try:
        # Generate PDF using the existing professional service
        pdf_buffer = generate_invoice_pdf(invoice, db)
        pdf_content = pdf_buffer.getvalue()
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice_{invoice.invoice_number}.pdf"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )

@router.patch("/{invoice_id}/payment", response_model=InvoiceWithJobResponse)
async def update_invoice_payment(
    invoice_id: int,
    payment_data: InvoicePay,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update payment amount for an invoice."""
    
    # Get the invoice
    invoice = db.query(Invoice).options(
        joinedload(Invoice.job)
    ).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Validate payment amount
    if payment_data.paid_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount cannot be negative"
        )
    
    if payment_data.paid_amount > invoice.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount cannot exceed invoice total"
        )
    
    # Store old paid amount to check for payment changes
    old_paid_amount = invoice.paid_amount
    
    # Update payment amount
    invoice.paid_amount = payment_data.paid_amount
    invoice.pending_amount = invoice.amount - payment_data.paid_amount
    invoice.status = calculate_invoice_status(invoice.amount, invoice.paid_amount, invoice.due_date.date())
    invoice.updated_at = datetime.utcnow()
    
    # Check if payment was made and invoice should be converted to job
    print(f"🔍 Checking conversion: paid_amount={invoice.paid_amount}, old_paid_amount={old_paid_amount}, converted_to_job={invoice.converted_to_job}")
    print(f"🔍 Should convert: {invoice_conversion_service.should_convert_to_job(invoice)}")
    
    # Check if invoice should be converted (any payment > 0 and not already converted)
    if (not invoice.converted_to_job and 
        invoice_conversion_service.should_convert_to_job(invoice)):
        try:
            print(f"🚀 Starting conversion for invoice #{invoice.invoice_number}")
            # Convert to job
            converted_job = await invoice_conversion_service.convert_invoice_to_job(invoice, db)
            if converted_job:
                print(f"✅ Successfully converted invoice #{invoice.invoice_number} to job #{converted_job.id}")
            else:
                print(f"❌ Conversion returned None for invoice #{invoice.invoice_number}")
        except Exception as e:
            print(f"❌ Error converting invoice to job: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"❌ Conversion conditions not met for invoice #{invoice.invoice_number}")
    
    # Commit all changes (payment update and potential job conversion)
    db.commit()
    db.refresh(invoice)
    
    # Send payment update notifications in background (fire-and-forget)
    def start_background_notifications():
        try:
            # Create a new event loop for background task
            import threading
            def run_notifications():
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(
                        invoice_conversion_service.notify_payment_updated(invoice, db, current_user.id)
                    )
                    loop.close()
                    print(f"✅ Completed payment update notifications for invoice #{invoice.invoice_number}")
                except Exception as e:
                    print(f"Error in background payment notifications: {e}")
            
            # Start in background thread
            notification_thread = threading.Thread(target=run_notifications, daemon=True)
            notification_thread.start()
            print(f"✅ Started payment update notifications for invoice #{invoice.invoice_number}")
        except Exception as e:
            print(f"Error starting payment update notifications: {e}")
    
    start_background_notifications()
    
    # Invalidate related cache entries
    try:
        cache_invalidation.invalidate_invoice_data(invoice.id)
    except Exception as e:
        print(f"Warning: Could not invalidate cache: {e}")
    
    # Prepare response
    response_data = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_name": invoice.client_name,
        "job_type": invoice.job_type,
        "job_details": invoice.job_details,
        "amount": invoice.amount,
        "paid_amount": invoice.paid_amount,
        "pending_amount": invoice.pending_amount,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "description": invoice.description,
        "converted_to_job": invoice.converted_to_job,
        "converted_job_id": invoice.converted_job_id,
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at,
        "job": {
            "id": invoice.job.id,
            "title": invoice.job.title,
            "client": invoice.job.client,
            "start_date": invoice.job.start_date,
            "end_date": invoice.job.end_date,
            "progress": invoice.job.progress,
            "status": invoice.job.status,
            "days_on_job": invoice.job.days_on_job,
            "supervisor_id": invoice.job.supervisor_id,
            "team_id": invoice.job.team_id,
            "created_at": invoice.job.created_at,
            "updated_at": invoice.job.updated_at,
        } if invoice.job else None
    }
    
    return response_data