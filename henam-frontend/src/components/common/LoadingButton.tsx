import React from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import type { ButtonProps } from '@mui/material/Button';
import { motion } from 'framer-motion';

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  loading?: boolean;
  loadingText?: string;
  loadingSize?: number;
  children: React.ReactNode;
}

/**
 * Enhanced button component with loading state
 * Provides visual feedback during CRUD operations
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  loadingSize = 20,
  children,
  sx,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={loading}
      sx={{
        position: 'relative',
        minWidth: 120,
        ...sx
      }}
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CircularProgress 
            size={loadingSize} 
            sx={{ 
              color: 'inherit',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }} 
          />
          {loadingText && (
            <Box
              component="span"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              {loadingText}
            </Box>
          )}
        </motion.div>
      )}
      
      <motion.div
        animate={{ 
          opacity: loading ? 0 : 1,
          scale: loading ? 0.9 : 1
        }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        {children}
      </motion.div>
    </Button>
  );
};

export default LoadingButton;
