import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { AdminPanelSettings } from '@mui/icons-material';

interface PageLoaderProps {
  message?: string;
  icon?: React.ReactElement;
}

const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = 'Loading...', 
  icon = <AdminPanelSettings sx={{ fontSize: 60, color: 'primary.main' }} />
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ display: 'inline-block', marginBottom: 24 }}
        >
          {icon}
        </motion.div>
        
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
            mb: 3,
          }}
        >
          {message}
        </Typography>
        
        <Box sx={{ width: '100%', maxWidth: 300, mx: 'auto' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <CircularProgress 
              size={40}
              thickness={4}
              sx={{
                color: 'primary.main',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
};

export default PageLoader;
