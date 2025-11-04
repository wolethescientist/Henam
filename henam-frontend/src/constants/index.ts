import type { NavItem } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ROUTES = {
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  TEAMS: '/teams',
  JOBS: '/jobs',
  TASKS: '/tasks',
  FINANCE: '/finance',
  ATTENDANCE: '/attendance',
  PROFILE: '/profile',
} as const;


export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const JOB_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const INVOICE_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
} as const;

export const REMINDER_TYPES = {
  TASK_DUE: 'task_due',
  INVOICE_OVERDUE: 'invoice_overdue',
  ATTENDANCE: 'attendance',
} as const;

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: 'Dashboard',
  },
  {
    id: 'teams',
    label: 'Teams',
    path: ROUTES.TEAMS,
    icon: 'Groups',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    path: ROUTES.JOBS,
    icon: 'Work',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: ROUTES.TASKS,
    icon: 'Assignment',
  },
  {
    id: 'finance',
    label: 'Finance',
    path: ROUTES.FINANCE,
    icon: 'AttachMoney',
  },
  // Temporarily hidden - uncomment to re-enable
  // {
  //   id: 'attendance',
  //   label: 'Attendance',
  //   path: ROUTES.ATTENDANCE,
  //   icon: 'AccessTime',
  // },
];

export const STATUS_COLORS = {
  // Task status colors
  task_pending: '#ff9800',
  task_in_progress: '#2196f3',
  task_completed: '#4caf50',
  task_cancelled: '#f44336',
  // Job status colors
  job_pending: '#ff9800',
  job_in_progress: '#2196f3',
  job_completed: '#4caf50',
  job_cancelled: '#f44336',
  // Invoice status colors
  invoice_pending: '#ff9800',
  invoice_partial: '#ff5722',
  invoice_paid: '#4caf50',
  invoice_overdue: '#f44336',
  // Attendance status colors
  attendance_present: '#4caf50',
  attendance_absent: '#f44336',
  attendance_late: '#ff9800',
} as const;

export const PRIORITY_COLORS = {
  [TASK_PRIORITY.LOW]: '#4caf50',
  [TASK_PRIORITY.MEDIUM]: '#ff9800',
  [TASK_PRIORITY.HIGH]: '#f44336',
} as const;

export const CHART_COLORS = {
  primary: '#2e7d32',
  secondary: '#4caf50',
  tertiary: '#81c784',
  quaternary: '#a5d6a7',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
} as const;
