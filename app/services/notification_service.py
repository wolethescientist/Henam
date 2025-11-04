import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Job, Task, User, Team, Notification, NotificationType
from app.services.notification_queue import notification_queue
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for handling notification business logic."""
    
    def __init__(self):
        self.queue = notification_queue
    
    async def notify_job_created(self, job: Job, db: Session):
        """Send notifications when a job is created."""
        try:
            logger.info(f"Starting job created notification for job {job.id}")
            
            # Prepare job data for notification
            job_data = {
                'id': job.id,
                'title': job.title,
                'client': job.client,
                'start_date': job.start_date.strftime('%Y-%m-%d') if job.start_date else 'N/A',
                'end_date': job.end_date.strftime('%Y-%m-%d') if job.end_date else 'N/A',
                'progress': job.progress,
                'status': job.status.value,
                'assigner_name': job.assigner.name if job.assigner else 'System',
                'assignee_name': job.supervisor.name if job.supervisor else 'Team',
                'description': f"Job assigned to {job.team.name if job.team else 'Unknown Team'}"
            }
            
            # Enqueue notification
            await self.queue.enqueue_job_created(job_data)
            
            # Send real-time WebSocket update
            await websocket_manager.broadcast_to_all({
                'type': 'job_created',
                'data': job_data,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Job created notification process completed for job {job.id}")
            
        except Exception as e:
            logger.error(f"Error notifying job created: {str(e)}")
    
    async def notify_job_updated(self, job: Job, updated_by: str, changes: str, db: Session):
        """Send notifications when a job is updated."""
        try:
            # Prepare job data for notification
            job_data = {
                'id': job.id,
                'title': job.title,
                'client': job.client,
                'start_date': job.start_date.strftime('%Y-%m-%d') if job.start_date else 'N/A',
                'end_date': job.end_date.strftime('%Y-%m-%d') if job.end_date else 'N/A',
                'progress': job.progress,
                'status': job.status.value,
                'assigner_name': job.assigner.name if job.assigner else 'System',
                'assignee_name': job.supervisor.name if job.supervisor else 'Team'
            }
            
            # Enqueue notification
            await self.queue.enqueue_job_updated(job_data, updated_by, changes)
            
            # Send real-time WebSocket update to job participants
            participants = self.get_job_participants(job, db)
            participant_ids = [user.id for user in participants]
            
            await websocket_manager.broadcast_to_users({
                'type': 'job_updated',
                'data': {
                    **job_data,
                    'updated_by': updated_by,
                    'changes': changes
                },
                'timestamp': datetime.now().isoformat()
            }, participant_ids)
            
            logger.info(f"Job updated notification queued for job {job.id}")
            
        except Exception as e:
            logger.error(f"Error notifying job updated: {str(e)}")
    
    async def notify_task_created(self, task: Task, db: Session):
        """Send notifications when a task is created."""
        try:
            # Prepare task data for notification
            task_data = {
                'id': task.id,
                'title': task.title,
                'description': task.description or 'No description provided',
                'priority': task.priority,
                'deadline': task.deadline.strftime('%Y-%m-%d %H:%M') if task.deadline else 'No deadline set',
                'status': task.status.value,
                'assigner_id': task.assigner_id,
                'assigned_to_id': task.assigned_to_id,
                'assigner_name': task.assigner.name if task.assigner else 'System',
                'assignee_name': task.assigned_to.name if task.assigned_to else 'Unknown User'
            }
            
            # Enqueue notification
            await self.queue.enqueue_task_created(task_data)
            
            # Send real-time WebSocket update to task participants
            participant_ids = []
            if task.assigner_id:
                participant_ids.append(task.assigner_id)
            if task.assigned_to_id:
                participant_ids.append(task.assigned_to_id)
            
            await websocket_manager.broadcast_to_users({
                'type': 'task_created',
                'data': task_data,
                'timestamp': datetime.now().isoformat()
            }, participant_ids)
            
            logger.info(f"Task created notification queued for task {task.id}")
            
        except Exception as e:
            logger.error(f"Error notifying task created: {str(e)}")
    
    async def notify_task_updated(self, task: Task, updated_by: str, changes: str, db: Session):
        """Send notifications when a task is updated."""
        try:
            # Prepare task data for notification
            task_data = {
                'id': task.id,
                'title': task.title,
                'description': task.description or 'No description provided',
                'priority': task.priority,
                'deadline': task.deadline.strftime('%Y-%m-%d %H:%M') if task.deadline else 'No deadline set',
                'status': task.status.value,
                'assigner_id': task.assigner_id,
                'assigned_to_id': task.assigned_to_id,
                'assigner_name': task.assigner.name if task.assigner else 'System',
                'assignee_name': task.assigned_to.name if task.assigned_to else 'Unknown User'
            }
            
            # Enqueue notification
            await self.queue.enqueue_task_updated(task_data, updated_by, changes)
            
            # Send real-time WebSocket update to task participants
            participant_ids = []
            if task.assigner_id:
                participant_ids.append(task.assigner_id)
            if task.assigned_to_id:
                participant_ids.append(task.assigned_to_id)
            
            await websocket_manager.broadcast_to_users({
                'type': 'task_updated',
                'data': {
                    **task_data,
                    'updated_by': updated_by,
                    'changes': changes
                },
                'timestamp': datetime.now().isoformat()
            }, participant_ids)
            
            logger.info(f"Task updated notification queued for task {task.id}")
            
        except Exception as e:
            logger.error(f"Error notifying task updated: {str(e)}")
    
    def get_job_participants(self, job: Job, db: Session) -> List[User]:
        """Get all users who should be notified about job updates."""
        user_ids = set()
        
        # Add supervisor
        if job.supervisor_id:
            user_ids.add(job.supervisor_id)
        
        # Add assigner
        if job.assigner_id:
            user_ids.add(job.assigner_id)
        
        # Add team members
        if job.team_id:
            team_members = db.query(User).filter(User.team_id == job.team_id).all()
            for member in team_members:
                user_ids.add(member.id)
        
        # Get all users
        users = db.query(User).filter(User.id.in_(user_ids), User.is_active == True).all()
        return users
    
    def get_task_participants(self, task: Task) -> List[User]:
        """Get users who should be notified about task updates (assigner and assignee)."""
        user_ids = []
        
        if task.assigner_id:
            user_ids.append(task.assigner_id)
        if task.assigned_to_id:
            user_ids.append(task.assigned_to_id)
        
        # Remove duplicates
        user_ids = list(set(user_ids))
        
        # Get users (this would need a db session in real implementation)
        return user_ids
    
    def create_changes_summary(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> str:
        """Create a summary of changes made to a job or task."""
        changes = []
        
        for key, new_value in new_data.items():
            old_value = old_data.get(key)
            if old_value != new_value:
                if key == 'progress':
                    changes.append(f"Progress changed from {old_value}% to {new_value}%")
                elif key == 'status':
                    changes.append(f"Status changed from {old_value} to {new_value}")
                elif key == 'title':
                    changes.append(f"Title changed from '{old_value}' to '{new_value}'")
                elif key == 'description':
                    changes.append("Description updated")
                else:
                    changes.append(f"{key.replace('_', ' ').title()} updated")
        
        return "; ".join(changes) if changes else "No specific changes detected"


# Global notification service instance
notification_service = NotificationService()
