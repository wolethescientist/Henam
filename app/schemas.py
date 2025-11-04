from pydantic import BaseModel, EmailStr
from typing import Optional, List, Generic, TypeVar, Dict, Any
from datetime import datetime
from app.models import TaskStatus, JobStatus, InvoiceStatus, AttendanceStatus, ReminderType, ReminderStatus, ReminderChannel, NotificationType, NotificationStatus

# Generic type for paginated responses
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total_count: int
    page: int
    limit: int
    total_pages: int


# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    team_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    picture_url: Optional[str] = None
    phone_number: Optional[str] = None
    contact_info: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    team_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    picture_url: Optional[str] = None
    phone_number: Optional[str] = None
    contact_info: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfileResponse(UserResponse):
    supervisor: Optional[UserResponse] = None
    team: Optional["TeamResponse"] = None
    performance_metrics: Optional["PerformanceMetricsResponse"] = None
    efficiency_score: Optional[float] = None
    attendance_percentage: Optional[float] = None
    jobs_contributed: Optional[int] = None


class StaffPerformanceResponse(BaseModel):
    id: int
    name: str
    email: str
    team_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    picture_url: Optional[str] = None
    phone_number: Optional[str] = None
    contact_info: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    team_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    attendance_percentage: Optional[float] = None
    jobs_contributed: Optional[int] = None
    tasks_completed: Optional[int] = None
    tasks_completed_on_time: Optional[int] = None
    efficiency_score: Optional[float] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    contact_info: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


# Team Schemas
class TeamBase(BaseModel):
    name: str


class TeamCreate(TeamBase):
    supervisor_id: Optional[int] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    supervisor_id: Optional[int] = None


class TeamResponse(TeamBase):
    id: int
    supervisor_id: Optional[int] = None
    supervisor: Optional[UserResponse] = None
    members: Optional[List[UserResponse]] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Job Schemas
class JobBase(BaseModel):
    title: str
    client: str
    start_date: datetime
    end_date: Optional[datetime] = None
    team_id: int
    assigner_id: Optional[int] = None


class JobCreate(JobBase):
    supervisor_id: Optional[int] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    client: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    progress: Optional[float] = None
    status: Optional[JobStatus] = None
    days_on_job: Optional[int] = None
    supervisor_id: Optional[int] = None


class JobResponse(JobBase):
    id: int
    progress: float
    status: JobStatus
    days_on_job: int
    supervisor_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    team: Optional["TeamResponse"] = None
    supervisor: Optional["UserResponse"] = None
    assigner: Optional["UserResponse"] = None

    class Config:
        from_attributes = True


# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    deadline: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    assigner_id: Optional[int] = None
    job_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[TaskStatus] = None


class TaskResponse(TaskBase):
    id: int
    status: TaskStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    assigned_to: Optional["UserResponse"] = None
    assigner: Optional["UserResponse"] = None

    class Config:
        from_attributes = True


# Invoice Schemas
class InvoiceBase(BaseModel):
    client_name: str
    amount: float
    due_date: datetime
    description: Optional[str] = None


class StandaloneInvoiceCreate(InvoiceBase):
    job_type: str
    job_details: str
    paid_amount: Optional[float] = 0.0


class LegacyInvoiceCreate(InvoiceBase):
    job_id: int
    paid_amount: Optional[float] = 0.0


class InvoiceCreate(BaseModel):
    # Support both standalone and legacy invoice creation
    job_id: Optional[int] = None  # For legacy job-based invoices
    job_type: Optional[str] = None  # For standalone invoices
    client_name: str
    job_details: Optional[str] = None  # For standalone invoices
    amount: float
    paid_amount: Optional[float] = 0.0
    due_date: datetime
    description: Optional[str] = None


class InvoiceUpdate(BaseModel):
    job_id: Optional[int] = None
    job_type: Optional[str] = None
    client_name: Optional[str] = None
    job_details: Optional[str] = None
    amount: Optional[float] = None
    paid_amount: Optional[float] = None
    due_date: Optional[datetime] = None
    status: Optional[InvoiceStatus] = None
    description: Optional[str] = None


class InvoicePay(BaseModel):
    paid_amount: float


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    job_id: Optional[int] = None
    job_type: Optional[str] = None
    client_name: str
    job_details: Optional[str] = None
    amount: float
    paid_amount: float
    pending_amount: float
    due_date: datetime
    status: InvoiceStatus
    converted_to_job: bool
    converted_job_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceWithJobResponse(InvoiceResponse):
    job: Optional["JobResponse"] = None
    converted_job: Optional["JobResponse"] = None


class InvoicesResponse(PaginatedResponse[InvoiceWithJobResponse]):
    pass


class UnifiedInvoicesResponse(BaseModel):
    invoices: List[Dict[str, Any]]
    jobs: List[Dict[str, Any]]
    overdue_invoices: List[Dict[str, Any]]
    pagination: Dict[str, Any]


# Attendance Schemas
class AttendanceBase(BaseModel):
    staff_id: int
    date: datetime


class AttendanceCheckIn(BaseModel):
    date: Optional[datetime] = None


class AttendanceCheckOut(BaseModel):
    date: Optional[datetime] = None


class AttendanceResponse(AttendanceBase):
    id: int
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceWithStaffResponse(AttendanceResponse):
    staff: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# Efficiency Score Schemas
class EfficiencyScoreResponse(BaseModel):
    id: int
    user_id: int
    team_id: Optional[int] = None
    attendance_percentage: float
    task_completion_percentage: float
    tasks_completed_on_time: int
    total_tasks_assigned: int
    efficiency_score: float
    period_start: datetime
    period_end: datetime
    calculated_at: datetime

    class Config:
        from_attributes = True


# Performance Metrics Schemas
class PerformanceMetricsResponse(BaseModel):
    id: int
    user_id: int
    team_id: Optional[int] = None
    period_start: datetime
    period_end: datetime
    attendance_days: int
    total_working_days: int
    attendance_percentage: float
    jobs_contributed: int
    tasks_completed: int
    tasks_completed_on_time: int
    efficiency_score: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True




class TeamPerformanceResponse(BaseModel):
    team_id: int
    team_name: str
    supervisor_name: Optional[str] = None
    total_members: int
    average_attendance: float
    average_efficiency: float
    total_jobs_handled: int
    jobs_completed: int
    jobs_ongoing: int


# Financial Dashboard Schemas
class FinancialSummaryResponse(BaseModel):
    total_billed: float
    total_paid: float
    total_pending: float
    overdue_amount: float
    overdue_invoices_count: int
    monthly_totals: List[dict]  # Monthly breakdown


class JobFinancialResponse(BaseModel):
    job_id: int
    job_title: str
    client: str
    team_name: str
    supervisor_name: str
    total_billed: float
    total_paid: float
    pending_amount: float
    status: str
    due_date: Optional[datetime] = None
    is_overdue: bool = False


class FinancialFilterRequest(BaseModel):
    client: Optional[str] = None
    team_id: Optional[int] = None
    job_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[InvoiceStatus] = None


# Reminder Schemas
class ReminderBase(BaseModel):
    user_id: int
    type: ReminderType
    related_id: Optional[int] = None
    scheduled_at: datetime
    channel: ReminderChannel = ReminderChannel.PUSH
    message: Optional[str] = None


class ReminderCreate(ReminderBase):
    pass


class ReminderResponse(ReminderBase):
    id: int
    status: ReminderStatus
    created_at: datetime

    class Config:
        from_attributes = True


# Report Schemas
class DashboardStatsResponse(BaseModel):
    total_users: int
    total_teams: int
    total_jobs: int
    total_tasks: int
    total_invoices: int
    pending_tasks: int
    overdue_invoices: int


class JobsReportResponse(BaseModel):
    total_jobs: int
    completed: int
    ongoing: int
    cancelled: int


class FinanceReportResponse(BaseModel):
    total_invoiced: float
    paid: float
    pending: float
    overdue_invoices: int


class TeamEfficiencyReportResponse(BaseModel):
    team_id: int
    jobs_completed: int
    jobs_ongoing: int
    avg_efficiency: float
    attendance_summary: dict


class PersonalTaskReportResponse(BaseModel):
    tasks_completed: int
    tasks_pending: int
    efficiency_score: float
    attendance: dict


class PersonalAttendanceReportResponse(BaseModel):
    present_days: int
    absent_days: int
    late_days: int
    attendance_percentage: float


class PersonalEfficiencyReportResponse(BaseModel):
    efficiency_score: float
    attendance_percentage: float
    task_completion_percentage: float
    calculated_at: datetime


# Notification Schemas
class NotificationBase(BaseModel):
    user_id: int
    type: NotificationType
    title: str
    message: str
    related_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    id: int
    status: NotificationStatus
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Job Assignment Schemas
class JobAssignmentRequest(BaseModel):
    job_id: int
    supervisor_id: int
    team_id: int


class JobAssignmentResponse(BaseModel):
    message: str
    job_id: int
    supervisor_id: int
    team_id: int


# Dashboard Job Display Schemas
class JobDisplayResponse(BaseModel):
    id: int
    title: str
    client: str
    supervisor_name: str
    team_name: str
    progress: float
    status: JobStatus
    days_on_job: int
    total_amount: float
    paid_amount: float
    pending_amount: float
    efficiency_score: float

    class Config:
        from_attributes = True




# Monthly Report Schemas
class MonthlyReportResponse(BaseModel):
    month: str
    year: int
    jobs_scheduled: int
    jobs_completed: int
    jobs_ongoing: int
    jobs_cancelled: int
    total_invoiced: float
    total_paid: float
    total_pending: float
    team_performance: List[dict]


class TeamPerformanceResponse(BaseModel):
    team_id: int
    team_name: str
    jobs_handled: int
    average_completion_time: float
    efficiency_score: float


# Expense Category Schemas
class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: int
    is_active: bool
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional["UserResponse"] = None

    class Config:
        from_attributes = True


# Expense Schemas
class ExpenseBase(BaseModel):
    title: str
    category: str
    amount: float
    date: datetime
    description: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    category_id: Optional[int] = None  # Allow creating with category ID


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[int] = None  # Allow updating with category ID
    amount: Optional[float] = None
    date: Optional[datetime] = None
    description: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    category_id: Optional[int] = None
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional["UserResponse"] = None
    category_obj: Optional[ExpenseCategoryResponse] = None

    class Config:
        from_attributes = True


# Financial Analytics Schemas
class ExpenseCategorySummary(BaseModel):
    category: str
    total_amount: float
    count: int


class ExpenseDistribution(BaseModel):
    category: str
    amount: float
    percentage: float


class RevenueExpenseSummary(BaseModel):
    total_invoices_issued: float
    total_invoices_paid: float
    total_expenses: float
    profit_loss: float


class ProfitLossData(BaseModel):
    period: str
    revenue: float
    expenses: float
    profit_loss: float


class InvoiceAnalytics(BaseModel):
    paid_invoices: int
    unpaid_invoices: int
    total_paid_amount: float
    total_unpaid_amount: float
    paid_percentage: float


class FinancialAnalyticsResponse(BaseModel):
    # Core financial metrics
    total_invoiced: float  # Total amount of all invoices issued
    total_paid: float      # Total amount of invoices that have been paid
    total_pending: float   # Total amount remaining to be paid
    total_expenses: float  # Total expenses
    profit_loss: float     # Profit/Loss (total_paid - total_expenses)
    payment_rate: float    # Payment rate percentage
    
    # Invoice counts
    overdue_count: int     # Number of overdue invoices
    paid_count: int        # Number of paid invoices
    pending_count: int     # Number of pending invoices
    
    # Charts and trends
    top_expense_categories: List[ExpenseCategorySummary]
    expense_distribution: List[ExpenseDistribution]
    profit_loss_trend: List[ProfitLossData]
    invoice_status_distribution: List[dict]  # For pie chart: pending, paid, overdue
    
    # Metadata
    period: str
    start_date: datetime
    end_date: datetime


class FinancialFilterRequest(BaseModel):
    period: str = "month"  # week, month, quarter, year
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category: Optional[str] = None
