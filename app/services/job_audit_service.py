"""
Job Audit Service

This service provides comprehensive audit logging for job-related events,
including creation, duplicate decisions, invoice linking, and job updates.
"""

import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models import (
    Job, Invoice, User, JobAuditLog, JobAuditEventType,
    JobCreationSource, JobStatus
)

logger = logging.getLogger(__name__)


class JobAuditService:
    """Service for logging and retrieving job audit events."""
    
    def log_job_creation(
        self,
        job: Job,
        source: JobCreationSource,
        user_id: int,
        originating_invoice_id: Optional[int],
        db: Session
    ) -> None:
        """
        Log job creation event.
        
        Args:
            job: The created job
            source: How the job was created (MANUAL or AUTO_FROM_INVOICE)
            user_id: ID of user who created the job
            originating_invoice_id: ID of invoice if created from invoice
            db: Database session
        """
        try:
            event_data = {
                "job_id": job.id,
                "title": job.title,
                "client": job.client,
                "creation_source": source.value,
                "originating_invoice_id": originating_invoice_id,
                "team_id": job.team_id,
                "supervisor_id": job.supervisor_id,
                "assigner_id": job.assigner_id,
                "start_date": job.start_date.isoformat() if job.start_date else None,
                "end_date": job.end_date.isoformat() if job.end_date else None,
                "status": job.status.value if job.status else None,
                "progress": job.progress,
                "duplicate_override": job.duplicate_override,
                "duplicate_justification": job.duplicate_justification
            }
            
            audit_log = JobAuditLog(
                job_id=job.id,
                event_type=JobAuditEventType.JOB_CREATED,
                user_id=user_id,
                event_data=json.dumps(event_data)
            )
            
            db.add(audit_log)
            db.flush()
            
            logger.info(
                f"Logged job creation event: job_id={job.id}, "
                f"source={source.value}, user_id={user_id}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Database error logging job creation: {str(e)}", exc_info=True)
            # Don't fail the main operation if audit logging fails
        except Exception as e:
            logger.error(f"Unexpected error logging job creation: {str(e)}", exc_info=True)
    
    def log_duplicate_decision(
        self,
        job_data: Dict[str, Any],
        duplicate_jobs: List[Job],
        user_decision: str,
        justification: Optional[str],
        user_id: int,
        db: Session
    ) -> None:
        """
        Log user's decision when duplicate detected.
        
        Args:
            job_data: Dictionary containing attempted job data
            duplicate_jobs: List of matching jobs found
            user_decision: User's choice ("create_anyway", "view_existing", "cancel")
            justification: User's reason for creating duplicate (if applicable)
            user_id: ID of user making the decision
            db: Database session
        """
        try:
            event_data = {
                "attempted_job": {
                    "title": job_data.get("title"),
                    "client": job_data.get("client"),
                    "start_date": job_data.get("start_date"),
                    "end_date": job_data.get("end_date"),
                    "team_id": job_data.get("team_id"),
                    "supervisor_id": job_data.get("supervisor_id")
                },
                "matching_jobs": [
                    {
                        "id": job.id,
                        "title": job.title,
                        "client": job.client,
                        "status": job.status.value if job.status else None,
                        "progress": job.progress,
                        "team_id": job.team_id,
                        "supervisor_id": job.supervisor_id,
                        "created_at": job.created_at.isoformat() if job.created_at else None
                    }
                    for job in duplicate_jobs
                ],
                "user_decision": user_decision,
                "justification": justification,
                "duplicate_count": len(duplicate_jobs)
            }
            
            # Determine event type based on decision
            if user_decision == "create_anyway":
                event_type = JobAuditEventType.DUPLICATE_OVERRIDE
            else:
                event_type = JobAuditEventType.DUPLICATE_WARNING_SHOWN
            
            audit_log = JobAuditLog(
                job_id=None,  # No job created yet (or decision was to cancel)
                event_type=event_type,
                user_id=user_id,
                event_data=json.dumps(event_data)
            )
            
            db.add(audit_log)
            db.flush()
            
            logger.info(
                f"Logged duplicate decision: decision={user_decision}, "
                f"user_id={user_id}, duplicate_count={len(duplicate_jobs)}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Database error logging duplicate decision: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error logging duplicate decision: {str(e)}", exc_info=True)
    
    def log_invoice_linking(
        self,
        invoice: Invoice,
        job: Job,
        user_id: int,
        db: Session
    ) -> None:
        """
        Log invoice-to-job linking event.
        
        Args:
            invoice: Invoice being linked
            job: Job being linked to
            user_id: ID of user performing the linking
            db: Database session
        """
        try:
            event_data = {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "job_id": job.id,
                "job_title": job.title,
                "client": job.client,
                "invoice_amount": invoice.amount,
                "paid_amount": invoice.paid_amount,
                "pending_amount": invoice.pending_amount,
                "invoice_status": invoice.status.value if invoice.status else None,
                "job_status": job.status.value if job.status else None,
                "linking_type": "automatic" if job.creation_source == JobCreationSource.AUTO_FROM_INVOICE else "manual"
            }
            
            audit_log = JobAuditLog(
                job_id=job.id,
                event_type=JobAuditEventType.INVOICE_LINKED,
                user_id=user_id,
                event_data=json.dumps(event_data)
            )
            
            db.add(audit_log)
            db.flush()
            
            logger.info(
                f"Logged invoice linking: invoice_id={invoice.id}, "
                f"job_id={job.id}, user_id={user_id}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Database error logging invoice linking: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error logging invoice linking: {str(e)}", exc_info=True)
    
    def log_job_update(
        self,
        job: Job,
        updated_fields: Dict[str, Any],
        user_id: int,
        db: Session
    ) -> None:
        """
        Log job update event.
        
        Args:
            job: Job being updated
            updated_fields: Dictionary of fields that were updated (old_value -> new_value)
            user_id: ID of user performing the update
            db: Database session
        """
        try:
            event_data = {
                "job_id": job.id,
                "title": job.title,
                "client": job.client,
                "updated_fields": updated_fields,
                "current_status": job.status.value if job.status else None,
                "current_progress": job.progress
            }
            
            audit_log = JobAuditLog(
                job_id=job.id,
                event_type=JobAuditEventType.JOB_UPDATED,
                user_id=user_id,
                event_data=json.dumps(event_data)
            )
            
            db.add(audit_log)
            db.flush()
            
            logger.info(
                f"Logged job update: job_id={job.id}, "
                f"fields={list(updated_fields.keys())}, user_id={user_id}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Database error logging job update: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error logging job update: {str(e)}", exc_info=True)
    
    def log_job_merge(
        self,
        source_job: Job,
        target_job: Job,
        user_id: int,
        db: Session
    ) -> None:
        """
        Log job merge event (when duplicate jobs are merged).
        
        Args:
            source_job: Job being merged (will be deleted/archived)
            target_job: Job being merged into (will be kept)
            user_id: ID of user performing the merge
            db: Database session
        """
        try:
            event_data = {
                "source_job_id": source_job.id,
                "source_job_title": source_job.title,
                "target_job_id": target_job.id,
                "target_job_title": target_job.title,
                "client": target_job.client,
                "merged_data": {
                    "source_progress": source_job.progress,
                    "target_progress": target_job.progress,
                    "source_status": source_job.status.value if source_job.status else None,
                    "target_status": target_job.status.value if target_job.status else None
                }
            }
            
            # Log for both jobs
            for job_id in [source_job.id, target_job.id]:
                audit_log = JobAuditLog(
                    job_id=job_id,
                    event_type=JobAuditEventType.JOB_MERGED,
                    user_id=user_id,
                    event_data=json.dumps(event_data)
                )
                db.add(audit_log)
            
            db.flush()
            
            logger.info(
                f"Logged job merge: source_job_id={source_job.id}, "
                f"target_job_id={target_job.id}, user_id={user_id}"
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Database error logging job merge: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error logging job merge: {str(e)}", exc_info=True)
    
    def get_job_audit_log(
        self,
        job_id: int,
        db: Session,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get formatted audit log entries for a job.
        
        Args:
            job_id: ID of job to get audit log for
            db: Database session
            limit: Maximum number of entries to return
            offset: Number of entries to skip (for pagination)
            
        Returns:
            List of formatted audit log entries
        """
        try:
            query = db.query(JobAuditLog).filter(
                JobAuditLog.job_id == job_id
            ).order_by(JobAuditLog.timestamp.desc())
            
            if limit:
                query = query.limit(limit)
            if offset:
                query = query.offset(offset)
            
            audit_logs = query.all()
            
            formatted_logs = []
            for log in audit_logs:
                formatted_log = self.format_audit_log_entry(log, db)
                formatted_logs.append(formatted_log)
            
            logger.debug(f"Retrieved {len(formatted_logs)} audit log entries for job {job_id}")
            
            return formatted_logs
            
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving audit log: {str(e)}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Unexpected error retrieving audit log: {str(e)}", exc_info=True)
            return []
    
    def get_user_audit_log(
        self,
        user_id: int,
        db: Session,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get formatted audit log entries for a user's actions.
        
        Args:
            user_id: ID of user to get audit log for
            db: Database session
            limit: Maximum number of entries to return
            offset: Number of entries to skip (for pagination)
            
        Returns:
            List of formatted audit log entries
        """
        try:
            query = db.query(JobAuditLog).filter(
                JobAuditLog.user_id == user_id
            ).order_by(JobAuditLog.timestamp.desc())
            
            if limit:
                query = query.limit(limit)
            if offset:
                query = query.offset(offset)
            
            audit_logs = query.all()
            
            formatted_logs = []
            for log in audit_logs:
                formatted_log = self.format_audit_log_entry(log, db)
                formatted_logs.append(formatted_log)
            
            logger.debug(f"Retrieved {len(formatted_logs)} audit log entries for user {user_id}")
            
            return formatted_logs
            
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving user audit log: {str(e)}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"Unexpected error retrieving user audit log: {str(e)}", exc_info=True)
            return []
    
    def format_audit_log_entry(
        self,
        audit_log: JobAuditLog,
        db: Session
    ) -> Dict[str, Any]:
        """
        Format audit log entry for display.
        
        Args:
            audit_log: JobAuditLog object to format
            db: Database session
            
        Returns:
            Dictionary with formatted audit log data
        """
        try:
            # Parse event data
            event_data = {}
            if audit_log.event_data:
                try:
                    event_data = json.loads(audit_log.event_data)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse event_data for audit log {audit_log.id}")
                    event_data = {"raw": audit_log.event_data}
            
            # Get user information
            user = db.query(User).filter(User.id == audit_log.user_id).first()
            user_name = user.name if user else f"User {audit_log.user_id}"
            
            # Generate human-readable description
            description = self._generate_description(
                audit_log.event_type,
                event_data,
                user_name
            )
            
            formatted_entry = {
                "id": audit_log.id,
                "job_id": audit_log.job_id,
                "event_type": audit_log.event_type.value if audit_log.event_type else None,
                "user_id": audit_log.user_id,
                "user_name": user_name,
                "timestamp": audit_log.timestamp.isoformat() if audit_log.timestamp else None,
                "description": description,
                "event_data": event_data
            }
            
            return formatted_entry
            
        except Exception as e:
            logger.error(f"Error formatting audit log entry: {str(e)}", exc_info=True)
            return {
                "id": audit_log.id,
                "error": "Failed to format audit log entry"
            }
    
    def _generate_description(
        self,
        event_type: JobAuditEventType,
        event_data: Dict[str, Any],
        user_name: str
    ) -> str:
        """
        Generate human-readable description for audit log entry.
        
        Args:
            event_type: Type of audit event
            event_data: Event data dictionary
            user_name: Name of user who performed the action
            
        Returns:
            Human-readable description string
        """
        try:
            if event_type == JobAuditEventType.JOB_CREATED:
                source = event_data.get("creation_source", "MANUAL")
                title = event_data.get("title", "Unknown")
                client = event_data.get("client", "Unknown")
                
                if source == "MANUAL":
                    return f"{user_name} manually created job '{title}' for client '{client}'"
                else:
                    invoice_id = event_data.get("originating_invoice_id")
                    return f"{user_name} created job '{title}' for client '{client}' from invoice #{invoice_id}"
            
            elif event_type == JobAuditEventType.DUPLICATE_WARNING_SHOWN:
                attempted_title = event_data.get("attempted_job", {}).get("title", "Unknown")
                duplicate_count = event_data.get("duplicate_count", 0)
                decision = event_data.get("user_decision", "unknown")
                
                if decision == "cancel":
                    return f"{user_name} cancelled job creation for '{attempted_title}' after seeing {duplicate_count} duplicate(s)"
                elif decision == "view_existing":
                    return f"{user_name} chose to view existing job instead of creating '{attempted_title}'"
                else:
                    return f"{user_name} was shown {duplicate_count} duplicate warning(s) for '{attempted_title}'"
            
            elif event_type == JobAuditEventType.DUPLICATE_OVERRIDE:
                title = event_data.get("attempted_job", {}).get("title") or event_data.get("title", "Unknown")
                justification = event_data.get("justification", "No justification provided")
                duplicate_count = event_data.get("duplicate_count", 0)
                
                return f"{user_name} created job '{title}' despite {duplicate_count} duplicate(s). Reason: {justification}"
            
            elif event_type == JobAuditEventType.INVOICE_LINKED:
                invoice_number = event_data.get("invoice_number", "Unknown")
                job_title = event_data.get("job_title", "Unknown")
                linking_type = event_data.get("linking_type", "manual")
                
                if linking_type == "automatic":
                    return f"Invoice {invoice_number} was automatically linked to job '{job_title}'"
                else:
                    return f"{user_name} manually linked invoice {invoice_number} to job '{job_title}'"
            
            elif event_type == JobAuditEventType.JOB_UPDATED:
                title = event_data.get("title", "Unknown")
                updated_fields = event_data.get("updated_fields", {})
                field_names = ", ".join(updated_fields.keys())
                
                return f"{user_name} updated job '{title}' (fields: {field_names})"
            
            elif event_type == JobAuditEventType.JOB_MERGED:
                source_title = event_data.get("source_job_title", "Unknown")
                target_title = event_data.get("target_job_title", "Unknown")
                
                return f"{user_name} merged job '{source_title}' into '{target_title}'"
            
            else:
                return f"{user_name} performed action: {event_type.value if event_type else 'Unknown'}"
        
        except Exception as e:
            logger.error(f"Error generating description: {str(e)}", exc_info=True)
            return f"{user_name} performed an action (description unavailable)"


# Global service instance
job_audit_service = JobAuditService()
