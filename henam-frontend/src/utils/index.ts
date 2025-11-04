import dayjs from 'dayjs';
import type { User } from '../types';

// Date utilities
export const formatDate = (date: string | Date, format: string = 'DD/MM/YYYY') => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date) => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

export const isDateOverdue = (date: string | Date) => {
  return dayjs(date).isBefore(dayjs(), 'day');
};

export const getDaysUntilDue = (date: string | Date) => {
  return dayjs(date).diff(dayjs(), 'day');
};

// User utilities
export const getUserFullName = (user: User) => {
  return user.name;
};

export const getUserInitials = (user: User) => {
  return user.name
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const canAccessRoute = (_userRole: string, _allowedRoles: string[]) => {
  return true; // Single-user system - allow access to all routes
};

export const isAdmin = (_user: User) => {
  return true; // Single-user system - always admin
};

// Role-based routing utilities
export const getRoleBasedDashboardRoute = (_userRole: string) => {
  return '/dashboard'; // Single dashboard for admin-only system
};

// Status utilities
export const getStatusLabel = (status: string) => {
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    partial: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
  };
  return statusLabels[status] || status;
};

export const getPriorityLabel = (priority: string) => {
  const priorityLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return priorityLabels[priority] || priority;
};

// Number utilities
export const formatCurrency = (amount: number, currency: string = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (number: number) => {
  return new Intl.NumberFormat('en-US').format(number);
};

export const calculatePercentage = (value: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// String utilities
export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T) => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Validation utilities
export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Local storage utilities
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// File utilities
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Access utilities - simplified for single-user system
export const canAccessOverdueInvoices = (_user: User) => {
  return true; // Single-user system - allow all access
};

export const canAccessFinancialSummary = (_user: User) => {
  return true; // Single-user system - allow all access
};

export const canAccessJobFinancials = (_user: User) => {
  return true; // Single-user system - allow all access
};

export const canAccessStaffAttendance = (_user: User) => {
  return true; // Single-user system - allow all access
};

export const canAccessMyAttendance = (_user: User) => {
  return true; // Single-user system - allow all access
};

export const canAccessAttendanceStats = (_user: User) => {
  return true; // Single-user system - allow all access
};

// Route access utilities - simplified for single-user system
export const getRoutePermissions = (_pathname: string) => {
  // Single-user system - no role restrictions
  return [];
};

export const canUserAccessRoute = (_userRole: string, _pathname: string) => {
  return true; // Single-user system - allow access to all routes
};

// Password validation utilities
export * from './passwordValidation';