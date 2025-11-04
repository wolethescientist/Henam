from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text, Enum as SQLEnum, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class JobStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class InvoiceStatus(str, enum.Enum):
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    OVERDUE = "OVERDUE"
    PENDING = "PENDING"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"


class ReminderType(str, enum.Enum):
    TASK_DUE = "TASK_DUE"
    INVOICE_OVERDUE = "INVOICE_OVERDUE"
    ATTENDANCE_MISS = "ATTENDANCE_MISS"


class ReminderStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class ReminderChannel(str, enum.Enum):
    EMAIL = "EMAIL"
    PUSH = "PUSH"
    BOTH = "BOTH"


class NotificationType(str, enum.Enum):
    JOB_ASSIGNED = "JOB_ASSIGNED"
    JOB_CREATED = "job_created"
    JOB_UPDATED = "job_updated"
    JOB_COMPLETED = "JOB_COMPLETED"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DUE = "TASK_DUE"
    INVOICE_OVERDUE = "INVOICE_OVERDUE"
    INVOICE_CREATED = "invoice_created"


class NotificationStatus(str, enum.Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    ARCHIVED = "ARCHIVED"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Self-referential for supervisor
    picture_url = Column(String(500), nullable=True)  # Profile picture URL
    phone_number = Column(String(20), nullable=True)  # Phone number field
    contact_info = Column(Text, nullable=True)  # Contact information (address, etc.)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    team = relationship("Team", foreign_keys=[team_id], back_populates="members")
    supervisor = relationship("User", foreign_keys=[supervisor_id], remote_side=[id], backref="subordinates")
    assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to_id", back_populates="assigned_to")
    assigned_tasks_by_me = relationship("Task", foreign_keys="Task.assigner_id", back_populates="assigner")
    assigned_jobs = relationship("Job", foreign_keys="Job.assigner_id", back_populates="assigner")
    created_jobs = relationship("Job", foreign_keys="Job.supervisor_id", back_populates="supervisor")
    attendance_records = relationship("Attendance", back_populates="staff")
    efficiency_scores = relationship("EfficiencyScore", back_populates="user")
    reminders = relationship("Reminder", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

    # Composite indexes for performance optimization
    __table_args__ = (
        Index('ix_users_team_id', 'team_id'),
        Index('ix_users_supervisor_id', 'supervisor_id'),
    )
    
    def to_dict(self, include_relationships=False):
        """Convert User model to dictionary for serialization"""
        result = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "team_id": self.team_id,
            "supervisor_id": self.supervisor_id,
            "picture_url": self.picture_url,
            "phone_number": self.phone_number,
            "contact_info": self.contact_info,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relationships:
            result["team"] = self.team.to_dict() if self.team else None
            result["supervisor"] = self.supervisor.to_dict() if self.supervisor else None
        
        return result


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("users.id", use_alter=True, name="fk_team_supervisor"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    members = relationship("User", foreign_keys="User.team_id", back_populates="team")
    jobs = relationship("Job", back_populates="team")
    
    def to_dict(self, include_relationships=False):
        """Convert Team model to dictionary for serialization"""
        result = {
            "id": self.id,
            "name": self.name,
            "supervisor_id": self.supervisor_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relationships:
            result["supervisor"] = self.supervisor.to_dict() if self.supervisor else None
            result["members"] = [member.to_dict() for member in self.members] if self.members else []
        
        return result


class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    client = Column(String(200), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=True, index=True)
    progress = Column(Float, default=0.0, index=True)
    status = Column(SQLEnum(JobStatus, values_callable=lambda obj: [e.value for e in obj]), default=JobStatus.NOT_STARTED)
    days_on_job = Column(Integer, default=0)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Who assigned the job
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    supervisor = relationship("User", foreign_keys=[supervisor_id], back_populates="created_jobs")
    assigner = relationship("User", foreign_keys=[assigner_id], back_populates="assigned_jobs")
    team = relationship("Team", back_populates="jobs")
    tasks = relationship("Task", back_populates="job")
    invoices = relationship("Invoice", foreign_keys="Invoice.job_id", back_populates="job")
    
    # Composite indexes for better performance
    __table_args__ = (
        Index('ix_jobs_team_progress', 'team_id', 'progress'),
        Index('ix_jobs_assigner', 'assigner_id'),
        Index('ix_jobs_assigner_status', 'assigner_id', 'status'),
        Index('ix_jobs_assigner_team', 'assigner_id', 'team_id'),
        Index('ix_jobs_supervisor_assigner', 'supervisor_id', 'assigner_id'),
        Index('ix_jobs_created_at', 'created_at'),  # For ordering
        Index('ix_jobs_supervisor_status', 'supervisor_id', 'status'),  # For supervisor queries
    )
    
    def update_status_from_progress(self):
        """Auto-update status based on progress value."""
        if self.progress == 0.0:
            self.status = JobStatus.NOT_STARTED
        elif self.progress == 100.0:
            self.status = JobStatus.COMPLETED
        else:
            self.status = JobStatus.IN_PROGRESS
    
    def to_dict(self, include_relationships=False):
        """Convert Job model to dictionary for serialization"""
        result = {
            "id": self.id,
            "title": self.title,
            "client": self.client,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "progress": self.progress,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "days_on_job": self.days_on_job,
            "supervisor_id": self.supervisor_id,
            "assigner_id": self.assigner_id,
            "team_id": self.team_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relationships:
            result["supervisor"] = self.supervisor.to_dict() if self.supervisor else None
            result["assigner"] = self.assigner.to_dict() if self.assigner else None
            result["team"] = self.team.to_dict() if self.team else None
        
        return result


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high
    deadline = Column(DateTime(timezone=True), nullable=True, index=True)
    status = Column(SQLEnum(TaskStatus, values_callable=lambda obj: [e.value for e in obj]), default=TaskStatus.PENDING, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Who assigned the task
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tasks")
    assigner = relationship("User", foreign_keys=[assigner_id], back_populates="assigned_tasks_by_me")
    job = relationship("Job", back_populates="tasks")
    
    # Composite indexes for better performance
    __table_args__ = (
        Index('ix_tasks_assigned_status', 'assigned_to_id', 'status'),
        Index('ix_tasks_assigner', 'assigner_id'),
        Index('ix_tasks_assigner_status', 'assigner_id', 'status'),
        Index('ix_tasks_assigner_assigned', 'assigner_id', 'assigned_to_id'),
        Index('ix_tasks_created_at', 'created_at'),  # For ordering
        Index('ix_tasks_deadline_status', 'deadline', 'status'),  # For overdue tasks
    )


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)  # Now nullable for standalone invoices
    invoice_number = Column(String(50), unique=True, nullable=False)  # Auto-generated invoice number
    
    # Invoice details (for standalone invoices)
    job_type = Column(String(200), nullable=True)  # Type of job for standalone invoices
    client_name = Column(String(200), nullable=False)  # Client name (required for all invoices)
    job_details = Column(Text, nullable=True)  # Job details for standalone invoices
    
    amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    pending_amount = Column(Float, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(SQLEnum(InvoiceStatus, values_callable=lambda obj: [e.value for e in obj]), default=InvoiceStatus.PENDING, index=True)
    description = Column(Text, nullable=True)  # Invoice description/notes
    
    # Auto-conversion tracking
    converted_to_job = Column(Boolean, default=False, index=True)  # Track if invoice was converted to job
    converted_job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)  # Reference to created job
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", foreign_keys=[job_id], back_populates="invoices")
    converted_job = relationship("Job", foreign_keys=[converted_job_id], post_update=True)
    
    # Composite indexes for better performance
    __table_args__ = (
        Index('ix_invoices_job_status', 'job_id', 'status'),
        Index('ix_invoices_converted', 'converted_to_job'),
        Index('ix_invoices_client_status', 'client_name', 'status'),
    )
    
    def to_dict(self, include_relationships=False):
        """Convert Invoice model to dictionary for serialization"""
        result = {
            "id": self.id,
            "job_id": self.job_id,
            "invoice_number": self.invoice_number,
            "job_type": self.job_type,
            "client_name": self.client_name,
            "job_details": self.job_details,
            "amount": self.amount,
            "paid_amount": self.paid_amount,
            "pending_amount": self.pending_amount,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status.value if self.status else None,
            "description": self.description,
            "converted_to_job": self.converted_to_job,
            "converted_job_id": self.converted_job_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relationships:
            result["job"] = self.job.to_dict() if self.job else None
            result["converted_job"] = self.converted_job.to_dict() if self.converted_job else None
        
        return result


class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(DateTime(timezone=True), nullable=True)
    check_out = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(AttendanceStatus, values_callable=lambda obj: [e.value for e in obj]), default=AttendanceStatus.ABSENT, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    staff = relationship("User", back_populates="attendance_records")
    
    # Composite indexes for better performance
    __table_args__ = (
        Index('ix_attendance_staff_date', 'staff_id', 'date'),
    )
    
    def to_dict(self, include_relationships=False):
        """Convert Attendance model to dictionary for serialization"""
        result = {
            "id": self.id,
            "staff_id": self.staff_id,
            "date": self.date.isoformat() if self.date else None,
            "check_in": self.check_in.isoformat() if self.check_in else None,
            "check_out": self.check_out.isoformat() if self.check_out else None,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relationships:
            result["staff"] = self.staff.to_dict() if self.staff else None
        
        return result


class EfficiencyScore(Base):
    __tablename__ = "efficiency_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True, index=True)  # For team efficiency
    attendance_percentage = Column(Float, nullable=False)
    task_completion_percentage = Column(Float, nullable=False)
    tasks_completed_on_time = Column(Integer, default=0)
    total_tasks_assigned = Column(Integer, default=0)
    efficiency_score = Column(Float, nullable=False)
    period_start = Column(Date, nullable=False)  # Start of calculation period
    period_end = Column(Date, nullable=False)    # End of calculation period
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="efficiency_scores")
    team = relationship("Team", backref="efficiency_scores")


class PerformanceMetrics(Base):
    __tablename__ = "performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    attendance_days = Column(Integer, default=0)
    total_working_days = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0.0)
    jobs_contributed = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_completed_on_time = Column(Integer, default=0)
    efficiency_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="performance_metrics")
    team = relationship("Team", backref="performance_metrics")


class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(ReminderType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    related_id = Column(Integer, nullable=True)  # task_id, invoice_id, etc.
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(ReminderStatus, values_callable=lambda obj: [e.value for e in obj]), default=ReminderStatus.PENDING)
    channel = Column(SQLEnum(ReminderChannel, values_callable=lambda obj: [e.value for e in obj]), default=ReminderChannel.PUSH)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="reminders")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(NotificationType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    related_id = Column(Integer, nullable=True)  # job_id, task_id, etc.
    status = Column(SQLEnum(NotificationStatus, values_callable=lambda obj: [e.value for e in obj]), default=NotificationStatus.UNREAD)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="password_reset_tokens")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_password_reset_tokens_user_expires', 'user_id', 'expires_at'),
        Index('ix_password_reset_tokens_token_used', 'token', 'used'),
    )


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", backref="expense_categories")
    expenses = relationship("Expense", back_populates="category_obj")


class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Keep for backward compatibility
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True, index=True)  # New foreign key
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", backref="expenses")
    category_obj = relationship("ExpenseCategory", back_populates="expenses")
    
    # Composite indexes for better performance
    __table_args__ = (
        Index('ix_expenses_category_date', 'category', 'date'),
        Index('ix_expenses_created_by_date', 'created_by_id', 'date'),
        Index('ix_expenses_date_amount', 'date', 'amount'),
        Index('ix_expenses_category_id', 'category_id'),
    )
