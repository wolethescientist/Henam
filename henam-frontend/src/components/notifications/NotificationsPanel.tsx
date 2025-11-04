import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  IconButton,
  Badge,
  Button,
  Divider,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '../../store/api/notificationsApi';
import { useAppSelector } from '../../hooks/redux';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ open, onClose }) => {
  const { isAuthenticated, accessToken } = useAppSelector((state) => state.auth);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  
  // State for notification detail dialog
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    { limit: 50 }, 
    { skip: !isAuthenticated || !accessToken }
  );
  const { data: countData } = useGetNotificationCountQuery(
    undefined, 
    { skip: !isAuthenticated || !accessToken }
  );

  // Open notification detail view - marks as read when viewing
  const handleViewNotification = async (notification: any) => {
    setSelectedNotification(notification);
    setDetailDialogOpen(true);
    
    // Automatically mark as read when user clicks to view
    if (notification.status === 'unread') {
      try {
        await markRead(notification.id).unwrap();
        console.log('Notification marked as read on view');
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  // Close detail dialog
  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedNotification(null);
  };

  // Mark notification as read manually (from detail view)
  const handleMarkReadManually = async (notificationId: number) => {
    try {
      await markRead(notificationId).unwrap();
      console.log('Notification marked as read manually');
      handleCloseDetail();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Mark all notifications as read
      await markAllRead().unwrap();
      
      // The unread count will automatically update because the mutation
      // invalidates the 'Notification' tag, causing a refetch
      console.log('All notifications marked as read, count will update automatically');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId).unwrap();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_assigned':
        return '🔧';
      case 'task_assigned':
        return '📋';
      case 'job_completed':
        return '✅';
      case 'task_due':
        return '⏰';
      case 'invoice_overdue':
        return '💰';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'job_assigned':
        return 'primary';
      case 'task_assigned':
        return 'info';
      case 'job_completed':
        return 'success';
      case 'task_due':
        return 'warning';
      case 'invoice_overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 400,
          maxWidth: '90vw',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsIcon sx={{ mr: 1 }} />
            Notifications
            {countData && countData.unread_count > 0 && (
              <Badge badgeContent={countData.unread_count} color="error" sx={{ ml: 1 }} />
            )}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {notifications.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkReadIcon />}
              onClick={handleMarkAllRead}
              disabled={countData?.unread_count === 0}
            >
              Mark All Read
            </Button>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Typography>Loading notifications...</Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  // Visual differentiation for read vs unread notifications
                  border: notification.status === 'unread' ? '2px solid #2196f3' : '1px solid #e0e0e0',
                  borderRadius: 2,
                  mb: 1,
                  bgcolor: notification.status === 'unread' ? '#e3f2fd' : '#fafafa',
                  opacity: notification.status === 'read' ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: notification.status === 'unread' ? '#bbdefb' : '#f5f5f5',
                    transform: 'translateX(4px)',
                  },
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleViewNotification(notification)}
                      sx={{ 
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                      title="View details"
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(notification.id)}
                      sx={{ 
                        '&:hover': {
                          color: 'error.main',
                        },
                      }}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton
                  onClick={() => handleViewNotification(notification)}
                  sx={{ pr: 10 }}
                >
                  <Avatar 
                    sx={{ 
                      mr: 2, 
                      bgcolor: notification.status === 'unread' ? '#2196f3' : '#9e9e9e',
                      color: 'white',
                      fontSize: '1.2rem',
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography 
                        variant="subtitle2" 
                        component="div"
                        sx={{ 
                          fontWeight: notification.status === 'unread' ? 700 : 400,
                          color: notification.status === 'unread' ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.type.replace('_', ' ')}
                        size="small"
                        color={getNotificationColor(notification.type) as any}
                        variant={notification.status === 'unread' ? 'filled' : 'outlined'}
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                      {notification.status === 'unread' && (
                        <Chip 
                          label="New" 
                          size="small" 
                          color="error" 
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {notification.status === 'read' && (
                        <Chip 
                          label="Read" 
                          size="small" 
                          color="default" 
                          variant="outlined"
                          icon={<MarkReadIcon sx={{ fontSize: '0.9rem' }} />}
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20,
                          }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        component="div"
                        sx={{ 
                          fontWeight: notification.status === 'unread' ? 500 : 400,
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        component="div"
                        sx={{ mt: 0.5 }}
                      >
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Notification Detail Dialog */}
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
                  bgcolor: selectedNotification.status === 'unread' ? '#2196f3' : '#9e9e9e',
                  color: 'white',
                  fontSize: '1.5rem',
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
                    color={getNotificationColor(selectedNotification.type) as any}
                    variant="filled"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                  {selectedNotification.status === 'unread' && (
                    <Chip
                      label="New"
                      size="small"
                      color="error"
                      sx={{ fontSize: '0.7rem', height: 22, fontWeight: 600 }}
                    />
                  )}
                  {selectedNotification.status === 'read' && (
                    <Chip
                      label="Read"
                      size="small"
                      color="default"
                      variant="outlined"
                      icon={<MarkReadIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                  )}
                </Box>
              </Box>
              <IconButton onClick={handleCloseDetail} size="small">
                <CloseIcon />
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
                      {new Date(selectedNotification.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  
                  {selectedNotification.read_at && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Read at:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {new Date(selectedNotification.read_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Type:
                    </Typography>
                    <Typography variant="caption" fontWeight={500}>
                      {selectedNotification.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Box>
                  
                  {selectedNotification.related_id && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Related ID:
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        #{selectedNotification.related_id}
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
              
              {selectedNotification.status === 'unread' && (
                <Button
                  onClick={() => handleMarkReadManually(selectedNotification.id)}
                  variant="contained"
                  startIcon={<MarkReadIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                    },
                  }}
                >
                  Mark as Read
                </Button>
              )}
              
              <Button
                onClick={() => handleDelete(selectedNotification.id)}
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Drawer>
  );
};

export default NotificationsPanel;
