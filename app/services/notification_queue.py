import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from app.services.email_service import email_service
from app.database import get_db
from app.models import Notification, NotificationType, NotificationStatus, User
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class NotificationQueue:
    """Async queue for handling email notifications without blocking API responses."""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.queue = asyncio.Queue()
        self.is_running = False
        self.worker_task = None
    
    async def start(self):
        """Start the notification queue worker."""
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._worker())
            logger.info("Notification queue started")
        else:
            logger.info("Notification queue already running")
    
    async def stop(self):
        """Stop the notification queue worker."""
        if self.is_running:
            self.is_running = False
            if self.worker_task:
                self.worker_task.cancel()
                try:
                    await self.worker_task
                except asyncio.CancelledError:
                    pass
            logger.info("Notification queue stopped")
    
    async def _worker(self):
        """Background worker that processes notification queue."""
        while self.is_running:
            try:
                # Wait for notification with timeout
                notification_data = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                await self._process_notification(notification_data)
                self.queue.task_done()
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing notification: {str(e)}")
    
    async def _process_notification(self, notification_data: Dict[str, Any]):
        """Process a single notification."""
        try:
            notification_type = notification_data.get('type')
            
            if notification_type == 'job_created':
                await self._handle_job_created(notification_data)
            elif notification_type == 'job_updated':
                await self._handle_job_updated(notification_data)
            elif notification_type == 'task_created':
                await self._handle_task_created(notification_data)
            elif notification_type == 'task_updated':
                await self._handle_task_updated(notification_data)
            else:
                logger.warning(f"Unknown notification type: {notification_type}")
                
        except Exception as e:
            logger.error(f"Error handling notification {notification_data.get('type')}: {str(e)}")
    
    async def _handle_job_created(self, data: Dict[str, Any]):
        """Handle job created notification."""
        logger.info(f"Processing job created notification for job {data.get('job_data', {}).get('id')}")
        
        # Get all users for job creation notifications
        db = next(get_db())
        try:
            users = db.query(User).filter(User.is_active == True).all()
            recipients = [{'email': user.email, 'name': user.name} for user in users]
            
            # Send email notifications
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                email_service.send_job_created_notification,
                data.get('job_data', {}),
                recipients
            )
            
            # Create in-app notifications
            for user in users:
                notification = Notification(
                    user_id=user.id,
                    type=NotificationType.JOB_ASSIGNED,
                    title="New Job Created",
                    message=f"A new job '{data.get('job_data', {}).get('title', 'Untitled')}' has been created.",
                    related_id=data.get('job_data', {}).get('id')
                )
                db.add(notification)
            
            db.commit()
            logger.info(f"Job created notifications processed successfully for job {data.get('job_data', {}).get('id')}")
            
        except Exception as e:
            logger.error(f"Error handling job created notification: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    async def _handle_job_updated(self, data: Dict[str, Any]):
        """Handle job updated notification."""
        db = next(get_db())
        try:
            job_data = data.get('job_data', {})
            job_id = job_data.get('id')
            
            if not job_id:
                logger.error("Job ID not provided for job updated notification")
                return
            
            # Get job participants (supervisor, assigner, team members)
            from app.models import Job, Team
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job:
                logger.error(f"Job {job_id} not found for notification")
                return
            
            # Get all users involved with this job
            user_ids = set()
            if job.supervisor_id:
                user_ids.add(job.supervisor_id)
            if job.assigner_id:
                user_ids.add(job.assigner_id)
            
            # Add team members
            team_members = db.query(User).filter(User.team_id == job.team_id).all()
            for member in team_members:
                user_ids.add(member.id)
            
            # Get users and send notifications
            users = db.query(User).filter(User.id.in_(user_ids), User.is_active == True).all()
            recipients = [{'email': user.email, 'name': user.name} for user in users]
            
            # Send email notifications
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                email_service.send_job_updated_notification,
                job_data,
                recipients,
                data.get('updated_by', 'System'),
                data.get('changes', 'Job updated')
            )
            
            # Create in-app notifications
            for user in users:
                notification = Notification(
                    user_id=user.id,
                    type=NotificationType.JOB_ASSIGNED,
                    title="Job Updated",
                    message=f"Job '{job_data.get('title', 'Untitled')}' has been updated by {data.get('updated_by', 'System')}.",
                    related_id=job_id
                )
                db.add(notification)
            
            db.commit()
            logger.info(f"Job updated notifications processed for job {job_id}")
            
        except Exception as e:
            logger.error(f"Error handling job updated notification: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    async def _handle_task_created(self, data: Dict[str, Any]):
        """Handle task created notification."""
        db = next(get_db())
        try:
            task_data = data.get('task_data', {})
            assigner_id = task_data.get('assigner_id')
            assigned_to_id = task_data.get('assigned_to_id')
            
            if not assigner_id or not assigned_to_id:
                logger.error("Assigner or assignee ID not provided for task created notification")
                return
            
            # Get assigner and assignee
            user_ids = [assigner_id, assigned_to_id]
            users = db.query(User).filter(User.id.in_(user_ids), User.is_active == True).all()
            recipients = [{'email': user.email, 'name': user.name} for user in users]
            
            # Send email notifications
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                email_service.send_task_created_notification,
                task_data,
                recipients
            )
            
            # Create in-app notifications
            for user in users:
                notification = Notification(
                    user_id=user.id,
                    type=NotificationType.TASK_ASSIGNED,
                    title="New Task Assigned",
                    message=f"A new task '{task_data.get('title', 'Untitled')}' has been assigned.",
                    related_id=task_data.get('id')
                )
                db.add(notification)
            
            db.commit()
            logger.info(f"Task created notifications processed for task {task_data.get('id')}")
            
        except Exception as e:
            logger.error(f"Error handling task created notification: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    async def _handle_task_updated(self, data: Dict[str, Any]):
        """Handle task updated notification."""
        db = next(get_db())
        try:
            task_data = data.get('task_data', {})
            assigner_id = task_data.get('assigner_id')
            assigned_to_id = task_data.get('assigned_to_id')
            
            if not assigner_id or not assigned_to_id:
                logger.error("Assigner or assignee ID not provided for task updated notification")
                return
            
            # Get assigner and assignee
            user_ids = [assigner_id, assigned_to_id]
            users = db.query(User).filter(User.id.in_(user_ids), User.is_active == True).all()
            recipients = [{'email': user.email, 'name': user.name} for user in users]
            
            # Send email notifications
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                email_service.send_task_updated_notification,
                task_data,
                recipients,
                data.get('updated_by', 'System'),
                data.get('changes', 'Task updated')
            )
            
            # Create in-app notifications
            for user in users:
                notification = Notification(
                    user_id=user.id,
                    type=NotificationType.TASK_ASSIGNED,
                    title="Task Updated",
                    message=f"Task '{task_data.get('title', 'Untitled')}' has been updated by {data.get('updated_by', 'System')}.",
                    related_id=task_data.get('id')
                )
                db.add(notification)
            
            db.commit()
            logger.info(f"Task updated notifications processed for task {task_data.get('id')}")
            
        except Exception as e:
            logger.error(f"Error handling task updated notification: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    async def enqueue_job_created(self, job_data: Dict[str, Any]):
        """Enqueue job created notification."""
        notification_data = {
            'type': 'job_created',
            'job_data': job_data,
            'timestamp': datetime.now().isoformat()
        }
        
        await self.queue.put(notification_data)
        logger.info(f"Job created notification queued for job {job_data.get('id')}")
    
    async def enqueue_job_updated(self, job_data: Dict[str, Any], updated_by: str, changes: str):
        """Enqueue job updated notification."""
        notification_data = {
            'type': 'job_updated',
            'job_data': job_data,
            'updated_by': updated_by,
            'changes': changes,
            'timestamp': datetime.now().isoformat()
        }
        await self.queue.put(notification_data)
        logger.info(f"Job updated notification queued for job {job_data.get('id')}")
    
    async def enqueue_task_created(self, task_data: Dict[str, Any]):
        """Enqueue task created notification."""
        notification_data = {
            'type': 'task_created',
            'task_data': task_data,
            'timestamp': datetime.now().isoformat()
        }
        
        await self.queue.put(notification_data)
        logger.info(f"Task created notification queued for task {task_data.get('id')}")
    
    async def enqueue_task_updated(self, task_data: Dict[str, Any], updated_by: str, changes: str):
        """Enqueue task updated notification."""
        notification_data = {
            'type': 'task_updated',
            'task_data': task_data,
            'updated_by': updated_by,
            'changes': changes,
            'timestamp': datetime.now().isoformat()
        }
        await self.queue.put(notification_data)
        logger.info(f"Task updated notification queued for task {task_data.get('id')}")


# Global notification queue instance
notification_queue = NotificationQueue()
