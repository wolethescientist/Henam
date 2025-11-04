from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Reminder, ReminderStatus, ReminderType
from app.services.web_push_service import WebPushService
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ReminderService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.web_push_service = WebPushService()
        self._setup_jobs()
    
    def _setup_jobs(self):
        """Set up scheduled jobs."""
        # Run reminder processing every 5 minutes
        self.scheduler.add_job(
            self.process_reminders,
            trigger=IntervalTrigger(minutes=5),
            id='process_reminders',
            name='Process Pending Reminders',
            replace_existing=True
        )
        
        # Run efficiency calculation daily at midnight
        self.scheduler.add_job(
            self.calculate_efficiency_scores,
            trigger=IntervalTrigger(days=1),
            id='calculate_efficiency',
            name='Calculate Efficiency Scores',
            replace_existing=True
        )
    
    def start(self):
        """Start the scheduler."""
        self.scheduler.start()
        logger.info("Reminder service started")
    
    def stop(self):
        """Stop the scheduler."""
        self.scheduler.shutdown()
        logger.info("Reminder service stopped")
    
    async def process_reminders(self):
        """Process pending reminders."""
        db = SessionLocal()
        try:
            # Get pending reminders that are due
            now = datetime.utcnow()
            pending_reminders = db.query(Reminder).filter(
                Reminder.status == ReminderStatus.PENDING,
                Reminder.scheduled_at <= now
            ).all()
            
            for reminder in pending_reminders:
                try:
                    await self._send_reminder(reminder, db)
                except Exception as e:
                    logger.error(f"Failed to send reminder {reminder.id}: {str(e)}")
                    reminder.status = ReminderStatus.FAILED
                    db.commit()
            
        except Exception as e:
            logger.error(f"Error processing reminders: {str(e)}")
        finally:
            db.close()
    
    async def _send_reminder(self, reminder: Reminder, db: Session):
        """Send a reminder notification."""
        try:
            # Generate message based on reminder type
            message = self._generate_message(reminder)
            
            # Send via web push
            if reminder.channel in ['push', 'both']:
                await self.web_push_service.send_notification(
                    user_id=reminder.user_id,
                    title="Reminder",
                    body=message
                )
            
            # TODO: Add email sending if needed
            if reminder.channel in ['email', 'both']:
                # Implement email sending here
                pass
            
            reminder.status = ReminderStatus.SENT
            db.commit()
            logger.info(f"Reminder {reminder.id} sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send reminder {reminder.id}: {str(e)}")
            reminder.status = ReminderStatus.FAILED
            db.commit()
            raise
    
    def _generate_message(self, reminder: Reminder) -> str:
        """Generate reminder message based on type."""
        if reminder.message:
            return reminder.message
        
        if reminder.type == ReminderType.TASK_DUE:
            return "You have a task due soon. Please check your task list."
        elif reminder.type == ReminderType.INVOICE_OVERDUE:
            return "You have an overdue invoice. Please check your invoices."
        elif reminder.type == ReminderType.ATTENDANCE_MISS:
            return "Please remember to check in for attendance."
        else:
            return "You have a reminder."
    
    async def calculate_efficiency_scores(self):
        """Calculate efficiency scores for all users."""
        db = SessionLocal()
        try:
            from app.models import User, Attendance, Task, EfficiencyScore, AttendanceStatus, TaskStatus
            from sqlalchemy import func, and_
            from datetime import datetime, timedelta
            
            # Get all active users (single user system)
            staff_users = db.query(User).filter(
                User.is_active == True
            ).all()
            
            for user in staff_users:
                # Calculate attendance percentage (last 30 days)
                thirty_days_ago = datetime.utcnow() - timedelta(days=30)
                
                total_attendance_days = db.query(Attendance).filter(
                    Attendance.staff_id == user.id,
                    Attendance.date >= thirty_days_ago
                ).count()
                
                present_days = db.query(Attendance).filter(
                    Attendance.staff_id == user.id,
                    Attendance.date >= thirty_days_ago,
                    Attendance.status == AttendanceStatus.PRESENT
                ).count()
                
                attendance_percentage = (present_days / total_attendance_days * 100) if total_attendance_days > 0 else 0.0
                
                # Calculate task completion percentage (last 30 days)
                total_tasks = db.query(Task).filter(
                    Task.assigned_to_id == user.id,
                    Task.created_at >= thirty_days_ago
                ).count()
                
                completed_tasks = db.query(Task).filter(
                    Task.assigned_to_id == user.id,
                    Task.created_at >= thirty_days_ago,
                    Task.status == TaskStatus.COMPLETED
                ).count()
                
                task_completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
                
                # Calculate efficiency score
                efficiency_score = (attendance_percentage * task_completion_percentage) / 2
                
                # Create or update efficiency score record
                efficiency_record = EfficiencyScore(
                    user_id=user.id,
                    attendance_percentage=attendance_percentage,
                    task_completion_percentage=task_completion_percentage,
                    efficiency_score=efficiency_score
                )
                
                db.add(efficiency_record)
            
            db.commit()
            logger.info("Efficiency scores calculated successfully")
            
        except Exception as e:
            logger.error(f"Error calculating efficiency scores: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    def create_task_reminder(self, task_id: int, user_id: int, scheduled_at: datetime, message: str = None):
        """Create a reminder for a task."""
        db = SessionLocal()
        try:
            reminder = Reminder(
                user_id=user_id,
                type=ReminderType.TASK_DUE,
                related_id=task_id,
                scheduled_at=scheduled_at,
                message=message
            )
            db.add(reminder)
            db.commit()
            logger.info(f"Task reminder created for task {task_id}")
        except Exception as e:
            logger.error(f"Failed to create task reminder: {str(e)}")
            db.rollback()
        finally:
            db.close()
    
    def create_invoice_reminder(self, invoice_id: int, user_id: int, scheduled_at: datetime, message: str = None):
        """Create a reminder for an invoice."""
        db = SessionLocal()
        try:
            reminder = Reminder(
                user_id=user_id,
                type=ReminderType.INVOICE_OVERDUE,
                related_id=invoice_id,
                scheduled_at=scheduled_at,
                message=message
            )
            db.add(reminder)
            db.commit()
            logger.info(f"Invoice reminder created for invoice {invoice_id}")
        except Exception as e:
            logger.error(f"Failed to create invoice reminder: {str(e)}")
            db.rollback()
        finally:
            db.close()


# Global reminder service instance
reminder_service = ReminderService()
