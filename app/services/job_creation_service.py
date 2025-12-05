"""
Job Creation Service

This service provides centralized job creation logic with duplicate checking,
validation, and smart invoice-to-job linking.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta

from app.models import (
    Job, Invoice, User, Team, JobStatus, JobCreationSource,
    JobAuditEventType, JobAuditLog, Notification, NotificationType
)
from app.schemas import JobCreate
from app.services.job_duplicate_service import job_duplicate_service
from app.services.job_audit_service import job_audit_service
from app.exceptions import ValidationError, ResourceNotFoundError, BusinessLogicError

logger = logging.getLogger(__name__)


class JobCreationService:
    """Service for creating jobs with validation and duplicate detection."""
    
    def __init__(self):
        self.duplicate_service = job_duplicate_service
        self.audit_service = job_audit_service
    
    def create_job_manual(
        self,
        job_data: JobCreate,
        current_user: User,
        db: Session,
        skip_duplicate_check: bool = False,
        duplicate_justification: Optional[str] = None
    ) -> Job:
        """
        Create job manually from Jobs page.
        Performs duplicate check unless explicitly skipped.
        
        Args:
            job_data: Job creation data
            current_user: User creating the job
            db: Database session
            skip_duplicate_check: If True, bypass duplicate warning
            duplicate_justification: Required if skip_duplicate_check is True
            
        Returns:
            Created Job object
            
        Raises:
            ValidationError: If validation fails
            ResourceNotFoundError: If team or supervisor not found
            BusinessLogicError: If duplicate detected and not overridden
        """
        try:
            logger.info(
                f"Creating manual job: {job_data.title} for client {job_data.client} "
                f"by user {current_user.id}"
            )
            
            # Step 1: Validate job data (subtask 3.1)
            self._validate_job_data(job_data, db)
            
            # Step 2: Check for duplicates (unless skipped)
            if not skip_duplicate_check:
                duplicate_result = self.duplicate_service.check_for_duplicates(
                    client_name=job_data.client,
                    job_title=job_data.title,
                    db=db
                )
                
                if duplicate_result.has_duplicates:
                    # Log duplicate warning
                    job_data_dict = {
                        "title": job_data.title,
                        "client": job_data.client,
                        "start_date": job_data.start_date.isoformat() if job_data.start_date else None,
                        "end_date": job_data.end_date.isoformat() if job_data.end_date else None,
                        "team_id": job_data.team_id,
                        "supervisor_id": job_data.supervisor_id
                    }
                    self.audit_service.log_duplicate_decision(
                        job_data=job_data_dict,
                        duplicate_jobs=duplicate_result.matching_jobs,
                        user_decision="warning_shown",
                        justification=None,
                        user_id=current_user.id,
                        db=db
                    )
                    
                    # Raise business logic error to inform caller about duplicates
                    raise BusinessLogicError(
                        detail="Duplicate jobs found. Please review or provide justification to proceed.",
                        rule="duplicate_prevention",
                        context={
                            "matching_jobs": [
                                {"id": j.id, "title": j.title, "status": j.status.value}
                                for j in duplicate_result.matching_jobs
                            ],
                            "is_repeat_project": duplicate_result.is_repeat_project,
                            "suggestion": duplicate_result.suggestion
                        }
                    )
            
            # Step 3: Validate justification if duplicate check was skipped
            if skip_duplicate_check and not duplicate_justification:
                raise ValidationError(
                    detail="Justification is required when creating a job despite duplicate warning",
                    field="duplicate_justification",
                    context={"skip_duplicate_check": skip_duplicate_check}
                )
            
            # Step 4: Determine supervisor
            supervisor_id = job_data.supervisor_id if job_data.supervisor_id else current_user.id
            
            # Step 5: Create the job
            db_job = Job(
                title=job_data.title,
                client=job_data.client,
                start_date=job_data.start_date,
                end_date=job_data.end_date,
                team_id=job_data.team_id,
                supervisor_id=supervisor_id,
                assigner_id=current_user.id,
                creation_source=JobCreationSource.MANUAL,
                originating_invoice_id=None,
                duplicate_override=skip_duplicate_check,
                duplicate_justification=duplicate_justification,
                progress=0.0,
                status=JobStatus.NOT_STARTED,
                days_on_job=0
            )
            
            db.add(db_job)
            db.flush()  # Get the job ID
            
            # Step 6: Log job creation in audit trail
            self.audit_service.log_job_creation(
                job=db_job,
                source=JobCreationSource.MANUAL,
                user_id=current_user.id,
                originating_invoice_id=None,
                db=db
            )
            
            # Step 7: Log duplicate override if applicable
            if skip_duplicate_check:
                # Log duplicate decision with "create_anyway" decision
                job_data_dict = {
                    "title": job_data.title,
                    "client": job_data.client,
                    "start_date": job_data.start_date.isoformat() if job_data.start_date else None,
                    "end_date": job_data.end_date.isoformat() if job_data.end_date else None,
                    "team_id": job_data.team_id,
                    "supervisor_id": job_data.supervisor_id
                }
                self.audit_service.log_duplicate_decision(
                    job_data=job_data_dict,
                    duplicate_jobs=[],  # Already created, so we don't have the duplicate list
                    user_decision="create_anyway",
                    justification=duplicate_justification,
                    user_id=current_user.id,
                    db=db
                )
            
            # Commit the transaction
            db.commit()
            db.refresh(db_job)
            
            logger.info(f"Successfully created manual job {db_job.id}: {db_job.title}")
            
            # Send notifications asynchronously (non-blocking)
            try:
                import asyncio
                from app.services.notification_service import notification_service
                
                # Create a task to send notifications without blocking
                asyncio.create_task(
                    notification_service.notify_manual_job_created(db_job, current_user, db)
                )
                logger.info(f"Manual job creation notification queued for job {db_job.id}")
            except Exception as e:
                logger.warning(f"Could not queue manual job creation notification: {e}")
                # Don't fail job creation if notification fails
            
            return db_job
            
        except (ValidationError, ResourceNotFoundError, BusinessLogicError) as e:
            db.rollback()
            logger.warning(f"Job creation failed: {str(e)}")
            raise e
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error creating job: {str(e)}", exc_info=True)
            raise ValidationError(
                detail="Failed to create job due to database error",
                field="database",
                context={"error": str(e)}
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error creating job: {str(e)}", exc_info=True)
            raise ValidationError(
                detail="Failed to create job",
                field="general",
                context={"error": str(e)}
            )
    
    def create_job_from_invoice(
        self,
        invoice: Invoice,
        db: Session
    ) -> Job:
        """
        Create job automatically from paid invoice.
        Uses smart linking to avoid duplicates.
        
        Args:
            invoice: Invoice that was paid
            db: Database session
            
        Returns:
            Created Job object
            
        Raises:
            ValidationError: If validation fails
            ResourceNotFoundError: If required resources not found
        """
        try:
            logger.info(
                f"Creating job from invoice {invoice.id} ({invoice.invoice_number}) "
                f"for client {invoice.client_name}"
            )
            
            # Step 1: Check for existing active jobs for this client
            matching_jobs = self.duplicate_service.find_matching_jobs_for_invoice(
                client_name=invoice.client_name,
                db=db
            )
            
            # Step 2: If exactly one match, link invoice to that job instead
            if len(matching_jobs) == 1:
                existing_job = matching_jobs[0]
                logger.info(
                    f"Found single matching job {existing_job.id} for invoice {invoice.id}. "
                    f"Linking instead of creating new job."
                )
                self.link_invoice_to_job(invoice, existing_job, db)
                return existing_job
            
            # Step 3: If multiple matches, we need user selection (handled by caller)
            # For now, we'll create a new job as the default behavior
            if len(matching_jobs) > 1:
                logger.info(
                    f"Found {len(matching_jobs)} matching jobs for invoice {invoice.id}. "
                    f"Creating new job (user selection should be handled by caller)."
                )
            
            # Step 4: Get default team and supervisor
            team = db.query(Team).first()
            if not team:
                # Create a default team if none exists
                team = Team(name="Default Team")
                db.add(team)
                db.flush()
                logger.info("Created default team for invoice-to-job conversion")
            
            supervisor = db.query(User).first()
            if not supervisor:
                raise ResourceNotFoundError(
                    detail="No users available to assign as supervisor",
                    resource_type="User",
                    resource_id=None
                )
            
            # Step 5: Create job from invoice data
            start_date = datetime.now()
            default_end_date = start_date + timedelta(days=30)
            
            job_title = f"{invoice.job_type} - {invoice.client_name}" if invoice.job_type else f"Job for {invoice.client_name}"
            
            db_job = Job(
                title=job_title,
                client=invoice.client_name,
                start_date=start_date,
                end_date=default_end_date,
                team_id=team.id,
                supervisor_id=supervisor.id,
                assigner_id=supervisor.id,
                creation_source=JobCreationSource.AUTO_FROM_INVOICE,
                originating_invoice_id=invoice.id,
                duplicate_override=False,
                duplicate_justification=None,
                progress=0.0,
                status=JobStatus.NOT_STARTED,
                days_on_job=0
            )
            
            db.add(db_job)
            db.flush()  # Get the job ID
            
            # Step 6: Link invoice to the new job
            self.link_invoice_to_job(invoice, db_job, db)
            
            # Step 7: Log job creation in audit trail
            self.audit_service.log_job_creation(
                job=db_job,
                source=JobCreationSource.AUTO_FROM_INVOICE,
                user_id=supervisor.id,
                originating_invoice_id=invoice.id,
                db=db
            )
            
            # Commit the transaction
            db.commit()
            db.refresh(db_job)
            
            logger.info(
                f"Successfully created job {db_job.id} from invoice {invoice.id}: {db_job.title}"
            )
            
            return db_job
            
        except (ValidationError, ResourceNotFoundError) as e:
            db.rollback()
            logger.warning(f"Job creation from invoice failed: {str(e)}")
            raise e
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error creating job from invoice: {str(e)}", exc_info=True)
            raise ValidationError(
                detail="Failed to create job from invoice due to database error",
                field="database",
                context={"error": str(e), "invoice_id": invoice.id}
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error creating job from invoice: {str(e)}", exc_info=True)
            raise ValidationError(
                detail="Failed to create job from invoice",
                field="general",
                context={"error": str(e), "invoice_id": invoice.id}
            )
    
    def link_invoice_to_job(
        self,
        invoice: Invoice,
        job: Job,
        db: Session
    ) -> None:
        """
        Link an invoice to an existing job.
        Updates job financial summary.
        
        Args:
            invoice: Invoice to link
            job: Job to link to
            db: Database session
            
        Raises:
            ValidationError: If linking fails
        """
        try:
            logger.info(f"Linking invoice {invoice.id} to job {job.id}")
            
            # Update invoice to link to job
            invoice.job_id = job.id
            invoice.converted_to_job = True
            invoice.converted_job_id = job.id
            
            # Log the linking event
            self.audit_service.log_invoice_linking(
                invoice=invoice,
                job=job,
                user_id=job.assigner_id if job.assigner_id else job.supervisor_id,
                db=db
            )
            
            db.flush()
            
            logger.info(f"Successfully linked invoice {invoice.id} to job {job.id}")
            
            # Send notifications asynchronously (non-blocking)
            try:
                import asyncio
                from app.services.notification_service import notification_service
                
                # Create a task to send notifications without blocking
                asyncio.create_task(
                    notification_service.notify_invoice_linked_to_job(invoice, job, db)
                )
                logger.info(f"Invoice linking notification queued for invoice {invoice.id} and job {job.id}")
            except Exception as e:
                logger.warning(f"Could not queue invoice linking notification: {e}")
                # Don't fail linking if notification fails
            
        except SQLAlchemyError as e:
            logger.error(f"Database error linking invoice to job: {str(e)}", exc_info=True)
            raise ValidationError(
                detail="Failed to link invoice to job",
                field="database",
                context={"error": str(e), "invoice_id": invoice.id, "job_id": job.id}
            )
        except Exception as e:
            logger.error(f"Unexpected error linking invoice to job: {str(e)}", exc_info=True)
            raise ValidationError(
                detail="Failed to link invoice to job",
                field="general",
                context={"error": str(e), "invoice_id": invoice.id, "job_id": job.id}
            )
    
    def _validate_job_data(self, job_data: JobCreate, db: Session) -> None:
        """
        Validate job creation data (subtask 3.1).
        
        Validates:
        - Required fields (title, client, start_date, team_id)
        - Date ranges (start_date not in past, end_date after start_date)
        - Team and supervisor existence
        
        Args:
            job_data: Job creation data to validate
            db: Database session
            
        Raises:
            ValidationError: If validation fails
            ResourceNotFoundError: If team or supervisor not found
        """
        # Validate required fields
        if not job_data.title or not job_data.title.strip():
            raise ValidationError(
                detail="Job title is required",
                field="title",
                context={"value": job_data.title}
            )
        
        if not job_data.client or not job_data.client.strip():
            raise ValidationError(
                detail="Client name is required",
                field="client",
                context={"value": job_data.client}
            )
        
        if not job_data.start_date:
            raise ValidationError(
                detail="Start date is required",
                field="start_date",
                context={"value": job_data.start_date}
            )
        
        if not job_data.team_id:
            raise ValidationError(
                detail="Team assignment is required",
                field="team_id",
                context={"value": job_data.team_id}
            )
        
        # Validate start date is not in the past (with 1-day tolerance)
        today = datetime.now().date()
        start_date = job_data.start_date.date() if hasattr(job_data.start_date, 'date') else job_data.start_date
        
        # Allow start date to be today or in the future (1-day tolerance for timezone issues)
        if start_date < (today - timedelta(days=1)):
            raise ValidationError(
                detail="Start date cannot be in the past",
                field="start_date",
                context={
                    "start_date": str(start_date),
                    "today": str(today)
                }
            )
        
        # Validate end date is after start date (if provided)
        if job_data.end_date:
            end_date = job_data.end_date.date() if hasattr(job_data.end_date, 'date') else job_data.end_date
            if end_date <= start_date:
                raise ValidationError(
                    detail="End date must be after start date",
                    field="end_date",
                    context={
                        "start_date": str(start_date),
                        "end_date": str(end_date)
                    }
                )
        
        # Validate team exists
        team = db.query(Team).filter(Team.id == job_data.team_id).first()
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=job_data.team_id
            )
        
        # Validate supervisor exists (if provided)
        if job_data.supervisor_id:
            supervisor = db.query(User).filter(
                User.id == job_data.supervisor_id,
                User.is_active == True
            ).first()
            if not supervisor:
                raise ResourceNotFoundError(
                    detail="Supervisor not found or inactive",
                    resource_type="User",
                    resource_id=job_data.supervisor_id
                )
        
        logger.debug(f"Job data validation passed for: {job_data.title}")
    



# Global service instance
job_creation_service = JobCreationService()
