import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dashboard,
  People,
  Groups,
  Work,
  Assignment,
  AttachMoney,
  AccessTime,
  Notifications,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { NAVIGATION_ITEMS, API_BASE_URL } from '../../constants';
import type { RootStateType } from '../../store';
import Logo from '../common/Logo';
import { getUserInitials } from '../../utils';

const drawerWidth = 280;
const collapsedWidth = 80;

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen } = useAppSelector((state: RootStateType) => state.ui);
  const { user } = useAppSelector((state: RootStateType) => state.auth);

  const iconMap: Record<string, React.ReactElement> = {
    Dashboard: <Dashboard />,
    People: <People />,
    Groups: <Groups />,
    Work: <Work />,
    Assignment: <Assignment />,
    AttachMoney: <AttachMoney />,
    AccessTime: <AccessTime />,
    Notifications: <Notifications />,
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActiveRoute = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Single user system - show all navigation items for authenticated users
  const filteredNavItems = user ? NAVIGATION_ITEMS : [];

  const drawerContent = (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            minHeight: 64,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.3), transparent)',
            },
          }}
        >
          <Logo variant={sidebarOpen ? 'text' : 'icon'} size="medium" color="primary" />
        </Box>
      </motion.div>

      <Divider sx={{ opacity: 0.3 }} />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, px: 1, py: 2 }}>
        <AnimatePresence>
          {filteredNavItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={isActiveRoute(item.path)}
                  sx={{
                    borderRadius: 3,
                    minHeight: 48,
                    px: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                      color: 'white',
                      boxShadow: '0px 4px 12px rgba(67, 160, 71, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                        transform: 'translateX(4px)',
                        boxShadow: '0px 6px 16px rgba(67, 160, 71, 0.4)',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0 2px 2px 0',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      transform: 'translateX(4px)',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                        transform: 'scale(1.1)',
                      },
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                      transition: 'left 0.5s',
                    },
                    '&:hover::after': {
                      left: '100%',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: sidebarOpen ? 40 : 'auto',
                      justifyContent: 'center',
                      color: 'text.secondary',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {iconMap[item.icon]}
                  </ListItemIcon>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isActiveRoute(item.path) ? 600 : 500,
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ListItemButton>
              </ListItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </List>

      {/* User Info */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Divider sx={{ opacity: 0.3 }} />
            <Box 
              sx={{ 
                p: 2,
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.02) 100%)',
                margin: 1,
                borderRadius: 2,
                border: '1px solid rgba(76, 175, 80, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                src={user?.picture_url ? `${API_BASE_URL}${user.picture_url}` : undefined}
                sx={{
                  width: 40,
                  height: 40,
                  background: user?.picture_url ? 'transparent' : 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: '2px solid rgba(76, 175, 80, 0.2)',
                }}
              >
                {user && !user.picture_url ? getUserInitials(user) : 'U'}
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Logged in as
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  {user?.name}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? sidebarOpen : true}
      onClose={isMobile ? () => {} : undefined}
      sx={{
        width: isMobile ? drawerWidth : (sidebarOpen ? drawerWidth : collapsedWidth),
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? drawerWidth : (sidebarOpen ? drawerWidth : collapsedWidth),
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          boxShadow: isMobile ? '8px 0 32px rgba(0, 0, 0, 0.15)' : '4px 0 20px rgba(0, 0, 0, 0.08)',
          zIndex: isMobile ? 1300 : 'auto',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '1px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(76, 175, 80, 0.2) 50%, transparent 100%)',
          },
        },
      }}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
