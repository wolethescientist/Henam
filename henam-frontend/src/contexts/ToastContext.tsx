import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

type AlertColor = 'success' | 'info' | 'warning' | 'error';

interface SlideProps {
  direction?: 'left' | 'right' | 'up' | 'down';
  children: React.ReactElement;
}

interface Toast {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
  action?: React.ReactNode;
}

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor, duration?: number, action?: React.ReactNode) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

function SlideTransition(props: SlideProps) {
  return <Slide direction="up" {...props} />;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string, 
    severity: AlertColor = 'info', 
    duration: number = 4000,
    action?: React.ReactNode
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      message,
      severity,
      duration,
      action,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const handleClose = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Render toasts */}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => handleClose(toast.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            mb: index * 8, // Stack toasts with spacing
            zIndex: 9999,
          }}
        >
          <Alert
            onClose={() => handleClose(toast.id)}
            severity={toast.severity}
            variant="filled"
            sx={{
              minWidth: 300,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
            action={toast.action}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};
