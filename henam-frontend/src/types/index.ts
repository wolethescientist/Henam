// User types (matching backend schemas)
export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  team_id?: number;
  supervisor_id?: number;
  picture_url?: string;
  phone_number?: string;
  contact_info?: string;
  created_at: string;
  updated_at?: string;
  team?: Team;
  supervisor?: User;
}

// Staff Performance types
export interface StaffPerformance {
  id: number;
  name: string;
  email: string;
  team_id?: number;
  supervisor_id?: number;
  picture_url?: string;
  phone_number?: string;
  contact_info?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  team_name?: string;
  supervisor_name?: string;
  attendance_percentage?: number;
  jobs_contributed?: number;
  tasks_completed?: number;
  tasks_completed_on_time?: number;
  efficiency_score?: number;
}

export interface AuthUser extends User {
  access_token: string;
  token_type: string;
}

// Backend API Response types
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Unified Dashboard types
export interface UnifiedDashboardData {
  financial_summary: {
    total_billed: number;
    total_paid: number;
    total_pending: number;
    overdue_amount: number;
    overdue_invoices_count: number;
  };
  job_summary: {
    total_jobs: number;
    completed_jobs: number;
    ongoing_jobs: number;
    not_started_jobs: number;
    average_progress: number;
  };
  team_performance: Array<{
    team_id: number;
    team_name: string;
    total_members: number;
    average_attendance: number;
    average_efficiency: number;
    total_jobs_handled: number;
  }>;
  user_performance: Array<{
    user_id: number;
    user_name: string;
    total_tasks: number;
    completed_tasks: number;
    tasks_completed_on_time: number;
    efficiency_score: number;
  }>;
  recent_jobs: Array<{
    id: number;
    title: string;
    client: string;
    progress: number;
    status: string;
    supervisor_name: string | null;
    team_name: string | null;
    start_date: string | null;
    end_date: string | null;
    updated_at: string | null;
  }>;
  overdue_jobs: Array<{
    job_id: number;
    job_title: string;
    client: string;
    supervisor_name: string | null;
    team_name: string | null;
    progress: number;
    status: string;
    start_date: string | null;
    end_date: string | null;
  }>;
  monthly_trends: Array<{
    month: string;
    month_name: string;
    total_billed: number;
    total_paid: number;
    total_pending: number;
    invoice_count: number;
  }>;
  client_summary: Array<{
    client: string;
    total_billed: number;
    total_paid: number;
    total_pending: number;
    overdue_count: number;
    job_count: number;
    invoice_count: number;
  }>;
  pagination?: {
    recent_jobs: {
      page: number;
      limit: number;
      total_count: number;
      total_pages: number;
      has_more: boolean;
    };
    overdue_jobs: {
      page: number;
      limit: number;
      has_more: boolean;
    };
    client_summary: {
      limit: number;
      has_more: boolean;
    };
  };
}

export interface LightweightFinancialData {
  total_billed: number;
  total_paid: number;
  total_pending: number;
  overdue_count: number;
}

// Team types
export interface Team {
  id: number;
  name: string;
  supervisor_id?: number | null;
  supervisor?: User | null;
  members?: User[];
  created_at: string;
  updated_at?: string;
}

// Job types
export interface Job {
  id: number;
  title: string;
  client: string;
  start_date: string;
  end_date: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  team_id: number;
  team?: Team;
  supervisor_id: number;
  supervisor?: User;
  assigner_id?: number;
  assigner?: User;
  tasks?: Task[];
  invoices?: Invoice[];
  created_at: string;
  updated_at: string;
}

// Job Display Response for Dashboard
export interface JobDisplayResponse {
  id: number;
  title: string;
  client: string;
  supervisor_name: string;
  team_name: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  days_on_job: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  efficiency_score: number;
}

// Task types
export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deadline: string;
  assigned_to_id: number;
  assigned_to?: User;
  assigner_id?: number;
  assigner?: User;
  job_id?: number;
  job?: Job;
  created_at: string;
  updated_at: string;
}

// Invoice types
export interface Invoice {
  id: number;
  job_id?: number;  // Now optional for standalone invoices
  job?: Job;
  job_type?: string;  // For standalone invoices
  client_name: string;  // Required for all invoices
  job_details?: string;  // For standalone invoices
  invoice_number: string;
  amount: number;
  paid_amount: number;
  pending_amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  converted_to_job: boolean;  // Track if converted to job
  converted_job_id?: number;  // Reference to created job
  converted_job?: Job;  // The created job
  description?: string;
  pdf_path?: string;
  created_at: string;
  updated_at: string;
}

// Attendance types
export interface Attendance {
  id: number;
  staff_id: number;
  staff?: User;
  check_in?: string;
  check_out?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  created_at: string;
  updated_at: string;
}

// Expense Category types
export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_by_id: number;
  created_by?: User;
  created_at: string;
  updated_at?: string;
}

export interface CreateExpenseCategoryForm {
  name: string;
  description?: string;
}

export interface UpdateExpenseCategoryForm {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Expense types
export interface Expense {
  id: number;
  title: string;
  category: string;
  category_id?: number;
  amount: number;
  date: string;
  description?: string;
  created_by_id: number;
  created_by?: User;
  category_obj?: ExpenseCategory;
  created_at: string;
  updated_at: string;
}

// Financial Analytics types
export interface ExpenseCategorySummary {
  category: string;
  total_amount: number;
  count: number;
}

export interface ExpenseDistribution {
  category: string;
  amount: number;
  percentage: number;
}

export interface RevenueExpenseSummary {
  total_invoices_issued: number;
  total_invoices_paid: number;
  total_expenses: number;
  profit_loss: number;
}

export interface ProfitLossData {
  period: string;
  revenue: number;
  expenses: number;
  profit_loss: number;
}

export interface InvoiceAnalytics {
  paid_invoices: number;
  unpaid_invoices: number;
  total_paid_amount: number;
  total_unpaid_amount: number;
  paid_percentage: number;
}

export interface FinancialAnalytics {
  // Core financial metrics
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  total_expenses: number;
  profit_loss: number;
  payment_rate: number;
  
  // Invoice counts
  overdue_count: number;
  paid_count: number;
  pending_count: number;
  
  // Charts and trends
  top_expense_categories: ExpenseCategorySummary[];
  expense_distribution: ExpenseDistribution[];
  profit_loss_trend: ProfitLossData[];
  invoice_status_distribution: Array<{
    status: string;
    count: number;
    amount: number;
    color: string;
  }>;
  
  // Metadata
  period: string;
  start_date: string;
  end_date: string;
}

// Reminder types
export interface Reminder {
  id: number;
  user_id: number;
  type: 'task_due' | 'invoice_overdue' | 'attendance_miss';
  related_id?: number;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'failed';
  channel: 'email' | 'push' | 'both';
  message?: string;
  created_at: string;
  user?: User;
}

// Dashboard data types
export interface DashboardStats {
  total_users?: number;
  total_teams?: number;
  total_jobs?: number;
  total_tasks?: number;
  total_invoices?: number;
  pending_tasks?: number;
  overdue_invoices?: number;
  team_efficiency?: number;
  attendance_rate?: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  team_id?: number;
  supervisor_id?: number;
  phone_number?: string;
  contact_info?: string;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  team_id?: number;
  supervisor_id?: number;
  phone_number?: string;
  contact_info?: string;
  picture_url?: string;
  is_active?: boolean;
}

export interface CreateTeamForm {
  name: string;
  supervisor_id?: number;
}

export interface CreateJobForm {
  title: string;
  client: string;
  start_date: string;
  end_date: string;
  team_id: number;
  assigner_id?: number;
}


export interface CreateTaskForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  assigned_to_id?: number;
  assigner_id?: number;
  job_id?: number;
  progress?: number;
}

export interface CreateInvoiceForm {
  // Support both standalone and legacy invoice creation
  job_id?: number;  // For legacy job-based invoices
  job_type?: string;  // For standalone invoices
  client_name: string;  // Required for all invoices
  job_details?: string;  // For standalone invoices
  amount: number;
  paid_amount?: number;
  due_date: string;
  description?: string;
}

export interface CreateExpenseForm {
  title: string;
  category: string;
  category_id?: number;
  amount: number;
  date: string;
  description?: string;
}

export interface UpdateExpenseForm {
  title?: string;
  category?: string;
  category_id?: number;
  amount?: number;
  date?: string;
  description?: string;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  children?: NavItem[];
}

// Notification types
export interface Notification {
  id: string;
  type: 'overdue_invoice' | 'reminder' | 'task_due' | 'job_update' | 'general' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  priority?: 'high' | 'medium' | 'low';
  timestamp: string;
  read: boolean;
  data?: any;
}

// Staff Profile types
export interface UserProfile extends User {
  supervisor?: User;
  team?: Team;
  performance_metrics?: PerformanceMetrics;
  efficiency_score?: number;
  attendance_percentage?: number;
  jobs_contributed?: number;
}


export interface TeamPerformance {
  team_id: number;
  team_name: string;
  supervisor_name?: string;
  total_members: number;
  average_attendance: number;
  average_efficiency: number;
  total_jobs_handled: number;
  jobs_completed: number;
  jobs_ongoing: number;
}

export interface PerformanceMetrics {
  id: number;
  user_id: number;
  team_id?: number;
  period_start: string;
  period_end: string;
  attendance_days: number;
  total_working_days: number;
  attendance_percentage: number;
  jobs_contributed: number;
  tasks_completed: number;
  tasks_completed_on_time: number;
  efficiency_score: number;
  created_at: string;
  updated_at?: string;
}

export interface EfficiencyScore {
  id: number;
  user_id: number;
  team_id?: number;
  attendance_percentage: number;
  task_completion_percentage: number;
  tasks_completed_on_time: number;
  total_tasks_assigned: number;
  efficiency_score: number;
  period_start: string;
  period_end: string;
  calculated_at: string;
}

// Financial Dashboard types
export interface FinancialSummary {
  total_billed: number;
  total_paid: number;
  total_pending: number;
  overdue_amount: number;
  overdue_invoices_count: number;
  monthly_totals: MonthlyTotal[];
}

export interface MonthlyTotal {
  month: string;
  billed: number;
  paid: number;
  pending: number;
}

export interface JobFinancial {
  job_id: number;
  job_title: string;
  client: string;
  team_name: string;
  supervisor_name: string;
  total_billed: number;
  total_paid: number;
  pending_amount: number;
  status: string;
  due_date?: string;
  is_overdue: boolean;
}

export interface FinancialFilter {
  client?: string;
  team_id?: number;
  job_type?: string;
  start_date?: string;
  end_date?: string;
  status?: 'pending' | 'partial' | 'paid' | 'overdue';
}

export interface TeamFinancialSummary {
  team_id: number;
  team_name: string;
  supervisor_name?: string;
  total_billed: number;
  total_paid: number;
  total_pending: number;
  overdue_count: number;
  invoice_count: number;
}

export interface ClientFinancialSummary {
  client: string;
  total_billed: number;
  total_paid: number;
  total_pending: number;
  overdue_count: number;
  job_count: number;
  invoice_count: number;
}

export interface MonthlyTrend {
  month: string;
  month_name: string;
  total_billed: number;
  total_paid: number;
  total_pending: number;
  invoice_count: number;
  job_count: number;
  overdue_count: number;
}
