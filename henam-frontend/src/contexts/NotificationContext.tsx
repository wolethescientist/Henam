import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import type { Notification } from '../types';
import { 
  useGetNotificationsQuery, 
  useGetRemindersQuery, 
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type BackendNotification,
  type BackendReminder
} from '../store/api/notificationsApi';

// Helper functions for mapping backend data to frontend format
const mapNotificationType = (backendType: string): Notification['type'] => {
  switch (backendType) {
    case 'task_assigned':
    case 'task_due':
      return 'task_due';
    case 'job_assigned':
    case 'job_completed':
      return 'job_update';
    case 'invoice_overdue':
      return 'overdue_invoice';
    default:
      return 'general';
  }
};

const getPriorityFromType = (type: string): 'high' | 'medium' | 'low' => {
  switch (type) {
    case 'invoice_overdue':
    case 'task_due':
      return 'high';
    case 'task_assigned':
    case 'job_assigned':
      return 'medium';
    default:
      return 'low';
  }
};

const getNavigationData = (type: string, relatedId?: number) => {
  console.log('🔍 getNavigationData called with:', { type, relatedId });
  
  switch (type) {
    // Task notifications
    case 'task_assigned':
    case 'task_due':
      return {
        navigateTo: '/tasks',
        highlightId: relatedId ? `task-${relatedId}` : undefined
      };
    
    // Job notifications
    case 'job_assigned':
    case 'job_completed':
    case 'job_created':
    case 'job_update':
      return {
        navigateTo: '/jobs',
        highlightId: relatedId ? `job-${relatedId}` : undefined
      };
    
    // Invoice/Finance notifications
    case 'invoice_overdue':
    case 'invoice_created':
    case 'invoice_updated':
    case 'payment_received':
    case 'payment_updated':
    case 'invoice_paid':
      return {
        navigateTo: '/finance',
        highlightId: relatedId ? `INV-2025-${relatedId.toString().padStart(4, '0')}` : undefined
      };
    
    // Attendance notifications
    case 'attendance':
    case 'attendance_marked':
      return {
        navigateTo: '/attendance',
        highlightId: relatedId ? `attendance-${relatedId}` : undefined
      };
    
    // Default fallback
    default:
      console.warn('⚠️ Unknown notification type, defaulting to dashboard:', type);
      return {
        navigateTo: '/dashboard'
      };
  }
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showPopup: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissPopup: () => void;
  showNotificationPopup: () => void;
  clearNotifications: () => void;
  handleNotificationClick: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  
  // Get auth state to conditionally fetch data
  const { isAuthenticated, accessToken } = useAppSelector((state) => state.auth);

  // Fetch real notifications and reminders from backend - only if authenticated
  const { data: backendNotifications = [], refetch: refetchNotifications } = useGetNotificationsQuery(
    { limit: 50 }, 
    { skip: !isAuthenticated || !accessToken }
  );
  const { data: backendReminders = [], refetch: refetchReminders } = useGetRemindersQuery(
    { limit: 50 }, 
    { skip: !isAuthenticated || !accessToken }
  );
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsReadBackend] = useMarkAllNotificationsReadMutation();

  // Convert backend notifications and reminders to frontend format
  useEffect(() => {
    const notifications: Notification[] = [];

    // Convert backend notifications
    backendNotifications.forEach((notification: BackendNotification) => {
      const navigationData = getNavigationData(notification.type, notification.related_id);
      console.log('Creating notification with navigation data:', {
        type: notification.type,
        relatedId: notification.related_id,
        navigationData
      });
      notifications.push({
        id: `notification_${notification.id}`,
        type: mapNotificationType(notification.type),
        title: notification.title,
        message: notification.message,
        priority: getPriorityFromType(notification.type),
        timestamp: notification.created_at,
        read: notification.status === 'read',
        data: navigationData
      });
    });

    // Convert backend reminders
    backendReminders.forEach((reminder: BackendReminder) => {
      notifications.push({
        id: `reminder_${reminder.id}`,
        type: 'reminder',
        title: 'Reminder',
        message: reminder.message,
        priority: 'medium',
        timestamp: reminder.created_at,
        read: false, // Reminders are always shown as unread
        data: getNavigationData(reminder.type, reminder.related_id)
      });
    });

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Only update if the content has actually changed
    setNotifications(prevNotifications => {
      // Check if the arrays are different
      if (prevNotifications.length !== notifications.length) {
        return notifications;
      }
      
      // Check if any notification has changed
      for (let i = 0; i < notifications.length; i++) {
        const prev = prevNotifications[i];
        const current = notifications[i];
        if (!prev || prev.id !== current.id || prev.read !== current.read || prev.timestamp !== current.timestamp) {
          return notifications;
        }
      }
      
      // No changes detected, return previous state
      return prevNotifications;
    });
  }, [backendNotifications, backendReminders]);

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show popup for high priority notifications
    if (notificationData.priority === 'high') {
      setShowPopup(true);
    }
  };

  const markAsRead = async (id: string) => {
    // Update local state immediately for better UX - this ensures instant count update
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );

    // Update backend if it's a backend notification
    if (id.startsWith('notification_')) {
      const backendId = parseInt(id.replace('notification_', ''));
      try {
        // Mark as read in backend - this will trigger cache invalidation
        await markNotificationRead(backendId);
        
        // Force refetch to ensure count is updated
        refetchNotifications();
        
        console.log('Notification marked as read, unread count updated immediately');
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Revert local state on error
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id ? { ...notification, read: false } : notification
          )
        );
      }
    }
  };

  const markAllAsRead = async () => {
    // Update local state immediately - this ensures instant count update
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );

    // Update backend
    try {
      // Mark all as read in backend - this will trigger cache invalidation
      await markAllNotificationsReadBackend();
      
      // Force refetch to ensure count is updated
      refetchNotifications();
      
      console.log('All notifications marked as read, unread count updated immediately');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert local state on error
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: false }))
      );
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
  };

  const showNotificationPopup = () => {
    setShowPopup(true);
  };

  const clearNotifications = () => {
    setNotifications([]);
    // The useMemo will automatically handle updates when backend data changes
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark notification as read
    markAsRead(notification.id);
    
    // Navigate to the specified page
    if (notification.data?.navigateTo) {
      navigate(notification.data.navigateTo);
      
      // If there's a highlight ID, store it in sessionStorage for the target page to use
      if (notification.data.highlightId) {
        sessionStorage.setItem('highlightItem', notification.data.highlightId);
        // Clear it after a short delay to ensure it's only used once
        setTimeout(() => {
          sessionStorage.removeItem('highlightItem');
        }, 5000);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Debug function to refresh notifications (for testing)
  useEffect(() => {
    (window as any).refreshNotifications = () => {
      console.log('Refreshing notifications from backend...');
      refetchNotifications();
      refetchReminders();
    };
  }, [refetchNotifications, refetchReminders]);

  // Auto-show popup for high priority notifications
  useEffect(() => {
    const highPriorityNotifications = notifications.filter(n => n.priority === 'high' && !n.read);
    if (highPriorityNotifications.length > 0 && !showPopup) {
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [notifications, showPopup]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    showPopup,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissPopup,
    showNotificationPopup,
    clearNotifications,
    handleNotificationClick,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
