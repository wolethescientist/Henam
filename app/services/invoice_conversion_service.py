from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from app.models import Invoice, Job, User, Team, JobStatus, InvoiceStatus, Notification, NotificationType
from app.services.notification_service import notification_service
import asyncio


class InvoiceConversionService:
    """Service for handling invoice-to-job conversion logic."""
    
    @staticmethod
    def should_convert_to_job(invoice: Invoice) -> bool:
        """
        Determine if an invoice should be converted to a job.
        Conversion happens when any payment is made (partial or full).
        """
        return invoice.paid_amount > 0 and not invoice.converted_to_job
    
    @staticmethod
    async def convert_invoice_to_job(invoice: Invoice, db: Session) -> Optional[Job]:
        """
        Convert an invoice to a job when payment is received.
        """
        if not InvoiceConversionService.should_convert_to_job(invoice):
            return None
        
        try:
            # Get the first available team (or create a default one)
            team = db.query(Team).first()
            if not team:
                # Create a default team if none exists
                team = Team(name="Default Team")
                db.add(team)
                db.flush()
            
            # Get the first available user as supervisor (or use system user)
            supervisor = db.query(User).first()
            if not supervisor:
                raise Exception("No users available to assign as supervisor")
            
            # Create job from invoice data
            # Set end_date to 30 days from now as a default (can be updated later)
            start_date = datetime.now()
            default_end_date = start_date + timedelta(days=30)
            
            job = Job(
                title=f"{invoice.job_type} - {invoice.client_name}",
                client=invoice.client_name,
                start_date=start_date,
                end_date=default_end_date,  # Default to 30 days from start
                progress=0.0,
                status=JobStatus.NOT_STARTED,
                days_on_job=0,
                supervisor_id=supervisor.id,
                assigner_id=supervisor.id,  # Same as supervisor for auto-converted jobs
                team_id=team.id
            )
            
            db.add(job)
            db.flush()  # Get the job ID
            
            # Update invoice to mark as converted
            invoice.converted_to_job = True
            invoice.converted_job_id = job.id
            invoice.job_id = job.id  # Link the invoice to the new job
            
            # Don't commit here - let the calling endpoint handle the commit
            db.flush()  # Just flush to get the IDs
            
            # Start notifications in background (fire-and-forget)
            def start_job_notifications():
                try:
                    import threading
                    import asyncio
                    def run_job_notifications():
                        try:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            loop.run_until_complete(
                                InvoiceConversionService.notify_job_created_from_invoice(job, invoice, db)
                            )
                            loop.close()
                            print(f"✅ Completed job creation notifications for invoice #{invoice.invoice_number}")
                        except Exception as e:
                            print(f"Error in background job notifications: {e}")
                    
                    # Start in background thread
                    notification_thread = threading.Thread(target=run_job_notifications, daemon=True)
                    notification_thread.start()
                    print(f"✅ Started job creation notifications for invoice #{invoice.invoice_number}")
                except Exception as e:
                    print(f"Error starting job creation notifications: {e}")
            
            start_job_notifications()
            
            return job
            
        except Exception as e:
            db.rollback()
            print(f"Error converting invoice to job: {e}")
            raise e
    
    @staticmethod
    async def notify_job_created_from_invoice(job: Job, invoice: Invoice, db: Session):
        """Send email notifications to all users about the new job created from invoice payment."""
        try:
            # Create a fresh session for notifications to avoid rollback issues
            from app.database import SessionLocal
            notification_db = SessionLocal()
            
            recipients = []
            try:
                # Get all active users and extract their data while session is active
                users = notification_db.query(User).filter(User.is_active == True).all()
                
                # Extract user data while session is active
                recipients = [{'email': user.email, 'name': user.name} for user in users]
                
                for user in users:
                    # Create in-app notification
                    notification = Notification(
                        user_id=user.id,
                        type=NotificationType.JOB_CREATED,
                        title="New Job Created from Invoice Payment",
                        message=f"A new job '{job.title}' has been automatically created because payment was received for invoice #{invoice.invoice_number}. Payment amount: ₦{invoice.paid_amount:,.2f}",
                        related_id=job.id
                    )
                    notification_db.add(notification)
                
                notification_db.commit()
                print(f"✅ Created system notifications for job creation from invoice #{invoice.invoice_number}")
            finally:
                notification_db.close()
            
            # Send email notifications using the existing email service
            from app.services.email_service import email_service
            
            invoice_data = {
                'invoice_number': invoice.invoice_number,
                'client_name': invoice.client_name,
                'paid_amount': invoice.paid_amount,
                'amount': invoice.amount
            }
            
            job_data = {
                'id': job.id,
                'title': job.title,
                'client': job.client
            }
            
            email_service.send_invoice_converted_to_job_notification(invoice_data, job_data, recipients)
            
        except Exception as e:
            print(f"Error sending job creation notifications: {e}")
    
    @staticmethod
    async def notify_invoice_created(invoice: Invoice, db: Session, creator_user_id: int = None):
        """Send email notifications to all users about a new invoice."""
        try:
            # Create a fresh session for notifications to avoid rollback issues
            from app.database import SessionLocal
            notification_db = SessionLocal()
            
            recipients = []
            try:
                # Get all active users and extract their data while session is active
                users = notification_db.query(User).filter(User.is_active == True).all()
                
                # Extract user data while session is active
                recipients = [{'email': user.email, 'name': user.name} for user in users]
                
                for user in users:
                    # Create different messages for creator vs other users
                    if creator_user_id and user.id == creator_user_id:
                        title = "Invoice Created Successfully"
                        message = f"Your invoice #{invoice.invoice_number} for {invoice.client_name} has been created successfully. Amount: ₦{invoice.amount:,.2f}, Due: {invoice.due_date.strftime('%Y-%m-%d')}. You can download the PDF from the Actions menu."
                    else:
                        title = "New Invoice Created"
                        message = f"A new invoice #{invoice.invoice_number} has been created for {invoice.client_name}. Amount: ₦{invoice.amount:,.2f}, Due: {invoice.due_date.strftime('%Y-%m-%d')}"
                    
                    # Create in-app notification
                    notification = Notification(
                        user_id=user.id,
                        type=NotificationType.INVOICE_CREATED,
                        title=title,
                        message=message,
                        related_id=invoice.id
                    )
                    notification_db.add(notification)
                
                notification_db.commit()
                print(f"✅ Created system notifications for invoice #{invoice.invoice_number}")
            finally:
                notification_db.close()
            
            # Send email notifications using the existing email service
            from app.services.email_service import email_service
            
            invoice_data = {
                'invoice_number': invoice.invoice_number,
                'client_name': invoice.client_name,
                'job_type': invoice.job_type,
                'amount': invoice.amount,
                'due_date': invoice.due_date.strftime('%Y-%m-%d'),
                'description': invoice.description or invoice.job_details
            }
            
            email_service.send_invoice_created_notification(invoice_data, recipients)
            
            print(f"✅ Sent email notifications for invoice #{invoice.invoice_number}")
            
        except Exception as e:
            print(f"Error sending invoice creation notifications: {e}")

    @staticmethod
    async def notify_invoice_updated(invoice: Invoice, db: Session, updater_user_id: int = None):
        """Send notification to the user who updated the invoice."""
        try:
            # Create a fresh session for notifications to avoid rollback issues
            from app.database import SessionLocal
            notification_db = SessionLocal()
            
            try:
                if updater_user_id:
                    # Create notification for the user who updated the invoice
                    notification = Notification(
                        user_id=updater_user_id,
                        type=NotificationType.INVOICE_CREATED,  # Reuse invoice_created type for updates
                        title="Invoice Updated Successfully",
                        message=f"Invoice #{invoice.invoice_number} for {invoice.client_name} has been updated successfully. Amount: ₦{invoice.amount:,.2f}, Paid: ₦{invoice.paid_amount:,.2f}",
                        related_id=invoice.id
                    )
                    notification_db.add(notification)
                    notification_db.commit()
                    print(f"✅ Created update notification for invoice #{invoice.invoice_number}")
            finally:
                notification_db.close()
                
        except Exception as e:
            print(f"Error sending invoice update notification: {e}")

    @staticmethod
    async def notify_payment_updated(invoice: Invoice, db: Session, updater_user_id: int = None):
        """Send notification about payment update."""
        try:
            # Create a fresh session for notifications to avoid rollback issues
            from app.database import SessionLocal
            notification_db = SessionLocal()
            
            recipients = []
            try:
                # Get all active users and extract their data while session is active
                users = notification_db.query(User).filter(User.is_active == True).all()
                
                # Extract user data while session is active
                recipients = [{'email': user.email, 'name': user.name} for user in users]
                
                for user in users:
                    # Create different messages for updater vs other users
                    if updater_user_id and user.id == updater_user_id:
                        title = "Payment Updated Successfully"
                        message = f"You updated the payment for invoice #{invoice.invoice_number} ({invoice.client_name}). Paid: ₦{invoice.paid_amount:,.2f}, Remaining: ₦{invoice.pending_amount:,.2f}"
                    else:
                        title = "Invoice Payment Updated"
                        message = f"Payment updated for invoice #{invoice.invoice_number} ({invoice.client_name}). Paid: ₦{invoice.paid_amount:,.2f}, Remaining: ₦{invoice.pending_amount:,.2f}"
                    
                    # Create in-app notification
                    notification = Notification(
                        user_id=user.id,
                        type=NotificationType.INVOICE_CREATED,  # Reuse invoice type for payment updates
                        title=title,
                        message=message,
                        related_id=invoice.id
                    )
                    notification_db.add(notification)
                
                notification_db.commit()
                print(f"✅ Created system notifications for payment update on invoice #{invoice.invoice_number}")
            finally:
                notification_db.close()
            
            # Send email notifications using the existing email service
            from app.services.email_service import email_service
            
            invoice_data = {
                'invoice_number': invoice.invoice_number,
                'client_name': invoice.client_name,
                'paid_amount': invoice.paid_amount,
                'pending_amount': invoice.pending_amount,
                'amount': invoice.amount,
                'status': invoice.status.value
            }
            
            # Send payment update email notification
            email_service.send_payment_updated_notification(invoice_data, recipients)
            
            print(f"✅ Sent email notifications for payment update on invoice #{invoice.invoice_number}")
            
        except Exception as e:
            print(f"Error sending payment update notifications: {e}")


# Create a singleton instance
invoice_conversion_service = InvoiceConversionService()