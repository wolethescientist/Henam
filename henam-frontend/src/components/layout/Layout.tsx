import React from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import Snackbar from '../common/Snackbar';
import { useAppSelector } from '../../hooks/redux';
import { NotificationProvider } from '../../contexts/NotificationContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen } = useAppSelector((state) => state.ui);

  return (
    <NotificationProvider>
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      height: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    }}>
      {/* Floating background elements */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        {[...Array(8)].map((_, index) => (
          <motion.div
            key={index}
            animate={{
              y: [-20, -40, -20],
              x: [-10, 10, -10],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20 + index * 2,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: 'absolute',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 40}px`,
              height: `${20 + Math.random() * 40}px`,
              background: `linear-gradient(135deg, rgba(76, 175, 80, ${0.05 + Math.random() * 0.1}) 0%, rgba(56, 142, 60, ${0.02 + Math.random() * 0.05}) 100%)`,
              borderRadius: '50%',
              filter: 'blur(1px)',
            }}
          />
        ))}
      </Box>

      <Header />
      <Sidebar />
      
      <Box
        component="main"
        sx={{
          position: 'absolute',
          top: '64px',
          left: { 
            xs: 0, 
            sm: 0, 
            md: sidebarOpen ? '280px' : '80px' 
          },
          right: 0,
          bottom: 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: 'transparent',
          overflow: 'auto',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: '100%' }}
        >
            <Box 
            sx={{ 
              padding: { xs: 1, sm: 1.5, md: 2 },
              paddingLeft: { xs: 1, sm: 1.5, md: sidebarOpen ? 1 : 1.5 },
              paddingRight: { xs: 1, sm: 1.5, md: 2 },
              minHeight: '100%',
              position: 'relative',
              maxWidth: '100%',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeInOut"
                }}
                className="animate-fade-in"
                style={{ height: '100%' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </Box>
        </motion.div>
      </Box>
      
      <Snackbar />
    </Box>
    </NotificationProvider>
  );
};

export default Layout;
