import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  Chip,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Close,
  Warning,
  Notifications,
  Schedule,
  Work,
  Assignment,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from '../../types';

interface NotificationPopupProps {
  open: boolean;
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  open,
  notifications,
  onClose,
  onMarkAllRead,
  onNotificationClick,
}) => {
  // State for detail view dialog
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Open detail view
  const handleViewDetails = (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the list item click
    setSelectedNotification(notification);
    setDetailDialogOpen(true);
  };

  // Close detail view
  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedNotification(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue_invoice':
        return <Warning sx={{ color: 'error.main' }} />;
      case 'reminder':
        return <Schedule sx={{ color: 'info.main' }} />;
      case 'task_due':
        return <Assignment sx={{ color: 'warning.main' }} />;
      case 'job_update':
        return <Work sx={{ color: 'primary.main' }} />;
      default:
        return <Notifications sx={{ color: 'text.secondary' }} />;
    }
  };

  const getNotificationColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const highPriorityNotifications = notifications.filter(n => n.priority === 'high');
  const otherNotifications = notifications.filter(n => n.priority !== 'high');

  return (
    <>
      <AnimatePresence>
        {open && (
        <Dialog
          open={open}
          onClose={onClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              maxHeight: '80vh',
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <DialogTitle sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              pb: 1,
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications sx={{ color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Notifications
                </Typography>
                {notifications.length > 0 && (
                  <Chip 
                    label={notifications.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
              <IconButton 
                onClick={onClose}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { 
                    backgroundColor: 'error.light',
                    color: 'white',
                  }
                }}
              >
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
              {notifications.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  py: 6,
                  px: 3,
                }}>
                  <Notifications sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No notifications yet
                  </Typography>
                  <Typography variant="body2" color="text.disabled" textAlign="center">
                    You're all caught up! New notifications will appear here.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {/* High Priority Notifications */}
                  {highPriorityNotifications.length > 0 && (
                    <Box sx={{ p: 2, backgroundColor: 'error.light', color: 'error.contrastText' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        🚨 Urgent Notifications
                      </Typography>
                      {highPriorityNotifications.map((notification) => (
                        <Alert 
                          key={notification.id}
                          severity="error" 
                          sx={{ 
                            mb: 1, 
                            '&:last-child': { mb: 0 },
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'error.dark',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onClick={(e) => handleViewDetails(notification, e)}
                          action={
                            <IconButton
                              size="small"
                              onClick={(e) => handleViewDetails(notification, e)}
                              sx={{ color: 'inherit' }}
                              title="View details"
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {notification.title}
                          </Typography>
                          <Typography variant="body2">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" sx={{ fontStyle: 'italic', mt: 0.5, display: 'block' }}>
                            Click to view details
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* Other Notifications */}
                  <List sx={{ py: 0 }}>
                    {otherNotifications.map((notification, index) => (
                      <React.Fragment key={notification.id}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <ListItem
                            sx={{
                              py: 2,
                              px: 3,
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                                transform: 'translateX(4px)',
                              },
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={(e) => handleViewDetails(notification, e)}
                            secondaryAction={
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={(e) => handleViewDetails(notification, e)}
                                sx={{
                                  '&:hover': {
                                    color: 'primary.main',
                                  },
                                }}
                                title="View details"
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            }
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {getNotificationIcon(notification.type)}
                            </ListItemIcon>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} component="div">
                                  {notification.title}
                                </Typography>
                                {notification.priority && (
                                  <Chip
                                    label={notification.priority}
                                    size="small"
                                    color={getNotificationColor(notification.priority) as any}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} component="div">
                                  {notification.message}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.disabled" component="div">
                                    {formatTimeAgo(notification.timestamp)}
                                  </Typography>
                                  {notification.data?.navigateTo && (
                                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }} component="div">
                                      Click to view →
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </ListItem>
                        </motion.div>
                        {index < otherNotifications.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </DialogContent>

            {notifications.length > 0 && (
              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} variant="outlined">
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    onMarkAllRead();
                    onClose();
                  }} 
                  variant="contained"
                >
                  Mark All as Read
                </Button>
              </DialogActions>
            )}
          </motion.div>
        </Dialog>
        )}
      </AnimatePresence>

      {/* Detail View Dialog - Outside AnimatePresence */}
      <Dialog
          open={detailDialogOpen}
          onClose={handleCloseDetail}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
              },
            },
          }}
        >
          {selectedNotification && (
            <>
              <DialogTitle
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  pb: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: selectedNotification.priority === 'high' ? 'error.main' : 'primary.main',
                    color: 'white',
                    width: 48,
                    height: 48,
                  }}
                >
                  {getNotificationIcon(selectedNotification.type)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" component="div">
                    {selectedNotification.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={selectedNotification.type.replace('_', ' ')}
                      size="small"
                      color={getNotificationColor(selectedNotification.priority) as any}
                      variant="filled"
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                    {selectedNotification.priority && (
                      <Chip
                        label={selectedNotification.priority.toUpperCase()}
                        size="small"
                        color={getNotificationColor(selectedNotification.priority) as any}
                        sx={{ fontSize: '0.7rem', height: 22, fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </Box>
                <IconButton onClick={handleCloseDetail} size="small">
                  <Close />
                </IconButton>
              </DialogTitle>

              <DialogContent sx={{ pt: 3, pb: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
                    {selectedNotification.message}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Received:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {new Date(selectedNotification.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Type:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {selectedNotification.type.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Priority:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {selectedNotification.priority?.toUpperCase() || 'NORMAL'}
                      </Typography>
                    </Box>
                    
                    {selectedNotification.data?.highlightId && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          Related ID:
                        </Typography>
                        <Typography variant="caption" fontWeight={500}>
                          {selectedNotification.data.highlightId}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button
                  onClick={handleCloseDetail}
                  variant="outlined"
                  color="inherit"
                >
                  Close
                </Button>
                
                {selectedNotification.data?.navigateTo && (
                  <Button
                    onClick={() => {
                      console.log('Go to Item clicked:', {
                        notification: selectedNotification,
                        navigateTo: selectedNotification.data?.navigateTo,
                        highlightId: selectedNotification.data?.highlightId
                      });
                      handleCloseDetail();
                      onClose();
                      if (onNotificationClick) {
                        onNotificationClick(selectedNotification);
                      } else {
                        console.error('onNotificationClick is not defined');
                      }
                    }}
                    variant="contained"
                    sx={{
                      background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                      },
                    }}
                  >
                    Go to Item
                  </Button>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>
      </>
  );
};

export default NotificationPopup;
