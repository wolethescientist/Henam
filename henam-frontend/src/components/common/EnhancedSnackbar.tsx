import React from 'react';
import { Snackbar as MuiSnackbar, Alert, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { hideSnackbar } from '../../store/slices/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import type { RootStateType } from '../../store';


/**
 * Enhanced snackbar component with better animations and styling
 * Provides consistent feedback for CRUD operations
 */
const EnhancedSnackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { open, message, severity } = useAppSelector((state: RootStateType) => state.ui.snackbar);

  const handleClose = () => dispatch(hideSnackbar());

  return (
    <AnimatePresence>
      {open && (
        <MuiSnackbar
          open={open}
          autoHideDuration={4000}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            '& .MuiSnackbarContent-root': {
              padding: 0,
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
          >
            <Alert
              onClose={handleClose}
              severity={severity as any}
              variant="filled"
              sx={{
                width: '100%',
                minWidth: 300,
                maxWidth: 500,
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem',
                  color: 'white',
                },
                '& .MuiAlert-message': {
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  lineHeight: 1.4,
                },
                '& .MuiAlert-action': {
                  paddingLeft: 1,
                },
                // Custom colors for better contrast
                ...(severity === 'success' && {
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#45a049',
                  }
                }),
                ...(severity === 'error' && {
                  backgroundColor: '#f44336',
                  '&:hover': {
                    backgroundColor: '#da190b',
                  }
                }),
                ...(severity === 'warning' && {
                  backgroundColor: '#ff9800',
                  '&:hover': {
                    backgroundColor: '#f57c00',
                  }
                }),
                ...(severity === 'info' && {
                  backgroundColor: '#2196f3',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                  }
                }),
              }}
              action={
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={handleClose}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {message}
              </motion.div>
            </Alert>
          </motion.div>
        </MuiSnackbar>
      )}
    </AnimatePresence>
  );
};

export default EnhancedSnackbar;
