import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import type { RootStateType } from '../../store';
import { useNavigate } from 'react-router-dom';
import { ROUTES, API_BASE_URL } from '../../constants';
import { getUserInitials } from '../../utils';
import Logo from '../common/Logo';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationPopup from '../common/NotificationPopup';

const Header: React.FC = () => {
  // Fixed notification type compatibility
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state: RootStateType) => state.auth);
  const { notifications, unreadCount, markAllAsRead, handleNotificationClick } = useNotifications();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationPopupOpen, setNotificationPopupOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = () => {
    setNotificationPopupOpen(true);
  };

  const handleNotificationClose = () => {
    setNotificationPopupOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN);
    handleMenuClose();
  };

  const handleProfile = () => {
    navigate(ROUTES.PROFILE);
    handleMenuClose();
  };


  return (
    <motion.div
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          color: 'text.primary',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <IconButton
              color="inherit"
              aria-label="toggle sidebar"
              onClick={() => dispatch(toggleSidebar())}
              edge="start"
              sx={{ 
                mr: { xs: 1, sm: 2 },
                borderRadius: 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Logo 
              variant="text" 
              size="medium" 
              color="primary" 
            />
          </motion.div>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconButton
                color="inherit"
                onClick={handleNotificationOpen}
                size="medium"
                sx={{ 
                  color: 'text.secondary',
                  borderRadius: 2,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                      fontSize: { xs: '0.6rem', sm: '0.75rem' },
                    },
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Badge>
              </IconButton>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <IconButton
                onClick={handleMenuOpen}
                sx={{ 
                  p: 0, 
                  ml: { xs: 0.5, sm: 1 },
                  borderRadius: 2,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0px 4px 12px rgba(67, 160, 71, 0.3)',
                  },
                }}
              >
                <Avatar
                  src={user?.picture_url ? `${API_BASE_URL}${user.picture_url}` : undefined}
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    background: user?.picture_url ? 'transparent' : 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 600,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {user && !user.picture_url ? getUserInitials(user) : 'U'}
                </Avatar>
              </IconButton>
            </motion.div>
          </Box>

        {/* User Menu */}
        <AnimatePresence>
          {Boolean(anchorEl) && (
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  mt: 1.5,
                  minWidth: 240,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    transform: 'translateY(-50%) rotate(45deg)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderBottom: 'none',
                    borderRight: 'none',
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Box sx={{ px: 3, py: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {user?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {user?.email}
                  </Typography>
                </Box>
                
                <Divider sx={{ mx: 2, opacity: 0.3 }} />
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  <MenuItem 
                    onClick={handleProfile}
                    sx={{
                      mx: 1,
                      my: 0.5,
                      borderRadius: 2,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'white',
                        transform: 'translateX(4px)',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      <AccountCircle fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                </motion.div>
                
                <Divider sx={{ mx: 2, my: 1, opacity: 0.3 }} />
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                >
                  <MenuItem 
                    onClick={handleLogout}
                    sx={{
                      mx: 1,
                      mb: 1,
                      borderRadius: 2,
                      color: 'error.main',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: 'error.main',
                        color: 'white',
                        transform: 'translateX(4px)',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'error.main' }}>
                      <Logout fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </motion.div>
              </motion.div>
            </Menu>
          )}
        </AnimatePresence>

        {/* Notifications Popup */}
        <NotificationPopup 
          open={notificationPopupOpen} 
          notifications={notifications}
          onClose={handleNotificationClose}
          onMarkAllRead={markAllAsRead}
          onNotificationClick={(notification) => {
            console.log('Header: onNotificationClick called with:', notification);
            handleNotificationClose(); // Close the Header's popup
            handleNotificationClick(notification); // Handle the notification click from context
          }}
        />
        </Toolbar>
      </AppBar>
    </motion.div>
  );
};

export default Header;
