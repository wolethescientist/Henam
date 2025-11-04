import React from 'react';
import { Box, Backdrop, CircularProgress, Typography, Paper } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  size?: number;
  backdrop?: boolean;
  variant?: 'spinner' | 'dots' | 'pulse';
}

/**
 * Loading overlay component for full-screen or modal loading states
 * Provides visual feedback during CRUD operations
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  size = 40,
  backdrop = true,
  variant = 'spinner'
}) => {
  const renderLoadingVariant = () => {
    switch (variant) {
      case 'dots':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  }}
                />
              </motion.div>
            ))}
          </Box>
        );
      
      case 'pulse':
        return (
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <Box
              sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              }}
            />
          </motion.div>
        );
      
      default:
        return (
          <CircularProgress 
            size={size} 
            sx={{
              color: '#4caf50',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Backdrop
          open={open}
          sx={{
            zIndex: (theme) => theme.zIndex.modal + 1,
            backgroundColor: backdrop ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
            backdropFilter: backdrop ? 'blur(4px)' : 'none',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Paper
              elevation={8}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                minWidth: 200,
              }}
            >
              {renderLoadingVariant()}
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Typography 
                  variant="body1" 
                  sx={{
                    color: '#2e7d32',
                    fontWeight: 500,
                    textAlign: 'center',
                    maxWidth: 200,
                    wordWrap: 'break-word',
                  }}
                >
                  {message}
                </Typography>
              </motion.div>
            </Paper>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
