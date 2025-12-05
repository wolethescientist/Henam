"""
Job Duplicate Detection Service

This service provides functionality to detect duplicate jobs before creation
and find matching jobs for smart invoice-to-job linking.
"""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from fuzzywuzzy import fuzz
from datetime import datetime

from app.models import Job, JobStatus, Team, User
from app.schemas import DuplicateCheckResult, JobSummary

logger = logging.getLogger(__name__)

# Similarity threshold for fuzzy matching (0-100)
TITLE_SIMILARITY_THRESHOLD = 70


class JobDuplicateService:
    """Service for detecting duplicate jobs and finding matching jobs for invoices."""
    
    def __init__(self):
        self.similarity_threshold = TITLE_SIMILARITY_THRESHOLD
    
    def check_for_duplicates(
        self,
        client_name: str,
        job_title: str,
        db: Session
    ) -> DuplicateCheckResult:
        """
        Check for existing jobs with same client and similar title.
        Only checks jobs with status NOT_STARTED or IN_PROGRESS.
        
        Args:
            client_name: The client name to check
            job_title: The job title to check
            db: Database session
            
        Returns:
            DuplicateCheckResult with matching jobs and suggestions
        """
        try:
            start_time = datetime.now()
            logger.info(f"Starting duplicate check for client: {client_name}, title: {job_title}")
            
            # Find active jobs with matching client (case-insensitive)
            active_matching_jobs = self._find_active_jobs_by_client_and_title(
                client_name, job_title, db
            )
            
            # Find completed jobs with same client and title (for repeat project detection)
            completed_matching_jobs = self._find_completed_jobs_by_client_and_title(
                client_name, job_title, db
            )
            
            # Convert to JobSummary objects
            matching_job_summaries = [
                self._job_to_summary(job, db) for job in active_matching_jobs
            ]
            
            # Get most recent completed job for copying settings
            previous_job = None
            if completed_matching_jobs:
                most_recent_completed = completed_matching_jobs[0]
                previous_job = self._job_to_summary(most_recent_completed, db)
            
            # Determine if this is a repeat project
            is_repeat_project = len(completed_matching_jobs) > 0
            
            # Generate suggestion
            suggestion = self._generate_suggestion(
                has_active_duplicates=len(active_matching_jobs) > 0,
                is_repeat_project=is_repeat_project,
                client_name=client_name
            )
            
            # Log performance
            elapsed_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                f"Duplicate check completed in {elapsed_time:.2f}ms. "
                f"Found {len(active_matching_jobs)} active matches, "
                f"{len(completed_matching_jobs)} completed matches"
            )
            
            return DuplicateCheckResult(
                has_duplicates=len(active_matching_jobs) > 0,
                matching_jobs=matching_job_summaries,
                is_repeat_project=is_repeat_project,
                previous_job=previous_job,
                suggestion=suggestion
            )
            
        except Exception as e:
            logger.error(f"Error checking for duplicates: {str(e)}", exc_info=True)
            # Return safe default on error
            return DuplicateCheckResult(
                has_duplicates=False,
                matching_jobs=[],
                is_repeat_project=False,
                previous_job=None,
                suggestion="Unable to check for duplicates. Please proceed with caution."
            )
    
    def find_matching_jobs_for_invoice(
        self,
        client_name: str,
        db: Session
    ) -> List[Job]:
        """
        Find active jobs matching invoice client for smart linking.
        Returns jobs with status NOT_STARTED or IN_PROGRESS only.
        
        Args:
            client_name: The client name from the invoice
            db: Database session
            
        Returns:
            List of matching Job objects
        """
        try:
            start_time = datetime.now()
            logger.info(f"Finding matching jobs for invoice client: {client_name}")
            
            # Query for active jobs with matching client (case-insensitive)
            matching_jobs = db.query(Job).filter(
                and_(
                    func.lower(Job.client) == func.lower(client_name.strip()),
                    or_(
                        Job.status == JobStatus.NOT_STARTED,
                        Job.status == JobStatus.IN_PROGRESS
                    )
                )
            ).order_by(Job.created_at.desc()).all()
            
            # Log performance
            elapsed_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(
                f"Found {len(matching_jobs)} matching jobs for invoice in {elapsed_time:.2f}ms"
            )
            
            return matching_jobs
            
        except Exception as e:
            logger.error(f"Error finding matching jobs for invoice: {str(e)}", exc_info=True)
            return []
    
    def calculate_title_similarity(
        self,
        title1: str,
        title2: str
    ) -> float:
        """
        Calculate similarity score between two job titles (0.0 to 1.0).
        Uses fuzzy matching for better detection.
        
        Args:
            title1: First job title
            title2: Second job title
            
        Returns:
            Similarity score from 0.0 (no match) to 1.0 (exact match)
        """
        try:
            # Normalize titles
            t1 = title1.strip().lower()
            t2 = title2.strip().lower()
            
            # Use token sort ratio for better matching (handles word order differences)
            similarity_score = fuzz.token_sort_ratio(t1, t2)
            
            # Convert from 0-100 to 0.0-1.0
            return similarity_score / 100.0
            
        except Exception as e:
            logger.error(f"Error calculating title similarity: {str(e)}")
            return 0.0
    
    def _find_active_jobs_by_client_and_title(
        self,
        client_name: str,
        job_title: str,
        db: Session
    ) -> List[Job]:
        """
        Find active jobs (NOT_STARTED or IN_PROGRESS) with matching client.
        Uses fuzzy matching on title.
        
        This is the optimized query for duplicate detection.
        """
        try:
            # First, get all active jobs for the client (case-insensitive)
            # This uses the ix_jobs_client_status index
            candidate_jobs = db.query(Job).filter(
                and_(
                    func.lower(Job.client) == func.lower(client_name.strip()),
                    or_(
                        Job.status == JobStatus.NOT_STARTED,
                        Job.status == JobStatus.IN_PROGRESS
                    )
                )
            ).all()
            
            # Filter by title similarity using fuzzy matching
            matching_jobs = []
            for job in candidate_jobs:
                similarity = self.calculate_title_similarity(job.title, job_title)
                if similarity >= (self.similarity_threshold / 100.0):
                    matching_jobs.append(job)
                    logger.debug(
                        f"Job {job.id} matched with similarity {similarity:.2f}: "
                        f"'{job.title}' vs '{job_title}'"
                    )
            
            # Sort by similarity (most similar first)
            matching_jobs.sort(
                key=lambda j: self.calculate_title_similarity(j.title, job_title),
                reverse=True
            )
            
            return matching_jobs
            
        except Exception as e:
            logger.error(f"Error finding active jobs: {str(e)}", exc_info=True)
            return []
    
    def _find_completed_jobs_by_client_and_title(
        self,
        client_name: str,
        job_title: str,
        db: Session
    ) -> List[Job]:
        """
        Find completed jobs with matching client and similar title.
        Used for repeat project detection.
        """
        try:
            # Get completed jobs for the client
            candidate_jobs = db.query(Job).filter(
                and_(
                    func.lower(Job.client) == func.lower(client_name.strip()),
                    Job.status == JobStatus.COMPLETED
                )
            ).order_by(Job.created_at.desc()).all()
            
            # Filter by title similarity
            matching_jobs = []
            for job in candidate_jobs:
                similarity = self.calculate_title_similarity(job.title, job_title)
                if similarity >= (self.similarity_threshold / 100.0):
                    matching_jobs.append(job)
            
            return matching_jobs
            
        except Exception as e:
            logger.error(f"Error finding completed jobs: {str(e)}", exc_info=True)
            return []
    
    def _job_to_summary(self, job: Job, db: Session) -> JobSummary:
        """Convert a Job model to a JobSummary schema."""
        try:
            # Get team name
            team_name = "Unknown Team"
            if job.team:
                team_name = job.team.name
            
            # Get supervisor name
            supervisor_name = "Unknown Supervisor"
            if job.supervisor:
                supervisor_name = job.supervisor.name
            
            return JobSummary(
                id=job.id,
                title=job.title,
                client=job.client,
                status=job.status,
                progress=job.progress,
                team_name=team_name,
                supervisor_name=supervisor_name,
                start_date=job.start_date,
                created_at=job.created_at
            )
        except Exception as e:
            logger.error(f"Error converting job to summary: {str(e)}")
            # Return a minimal summary on error
            return JobSummary(
                id=job.id,
                title=job.title,
                client=job.client,
                status=job.status,
                progress=job.progress,
                team_name="Unknown",
                supervisor_name="Unknown",
                start_date=job.start_date,
                created_at=job.created_at
            )
    
    def _generate_suggestion(
        self,
        has_active_duplicates: bool,
        is_repeat_project: bool,
        client_name: str
    ) -> str:
        """Generate a human-readable suggestion based on duplicate check results."""
        if has_active_duplicates and is_repeat_project:
            return (
                f"Active jobs found for {client_name} with similar titles. "
                f"This also appears to be a repeat project. Consider linking to an existing job "
                f"or creating a new job with a distinguishing title (e.g., add phase number or date)."
            )
        elif has_active_duplicates:
            return (
                f"Active jobs found for {client_name} with similar titles. "
                f"Consider linking to an existing job to avoid duplicates."
            )
        elif is_repeat_project:
            return (
                f"This appears to be a repeat project for {client_name}. "
                f"You can copy settings from the previous job or create a new one with a distinguishing title."
            )
        else:
            return f"No duplicate jobs found. Safe to create new job for {client_name}."


# Global service instance
job_duplicate_service = JobDuplicateService()
