import { useCallback } from 'react';
import { useAppDispatch } from './redux';
import { showSnackbar, hideSnackbar } from '../store/slices/uiSlice';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseToastReturn {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
}

/**
 * Custom hook for managing toast notifications
 * Provides consistent feedback messages for CRUD operations
 */
export const useToast = (): UseToastReturn => {
  const dispatch = useAppDispatch();

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info',
    options?: ToastOptions
  ) => {
    dispatch(showSnackbar({ message, severity: type }));
    
    // Auto-hide after duration (default 4 seconds)
    const duration = options?.duration || 4000;
    setTimeout(() => {
      dispatch(hideSnackbar());
    }, duration);
  }, [dispatch]);

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'success', options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'error', options);
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'warning', options);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'info', options);
  }, [showToast]);

  const hideToast = useCallback(() => {
    dispatch(hideSnackbar());
  }, [dispatch]);

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast
  };
};

export default useToast;
