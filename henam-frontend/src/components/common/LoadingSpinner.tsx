import React from 'react';
import { Box, CircularProgress, Typography, keyframes } from '@mui/material';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  variant?: 'spinner' | 'dots' | 'pulse';
  fullScreen?: boolean;
}

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
`;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 40,
  variant = 'spinner',
  fullScreen = true
}) => {
  const containerSx = fullScreen ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 3,
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  } as const : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    p: 4,
  } as const;

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
          <Box
            sx={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              animation: `${pulse} 2s infinite`,
            }}
          />
        );
      
      default:
        return (
          <Box sx={{ position: 'relative' }}>
            <CircularProgress 
              size={size} 
              sx={{
                color: 'transparent',
                '& .MuiCircularProgress-circle': {
                  stroke: 'url(#gradient)',
                  strokeLinecap: 'round',
                },
              }}
            />
            <svg width={0} height={0}>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4caf50" />
                  <stop offset="100%" stopColor="#388e3c" />
                </linearGradient>
              </defs>
            </svg>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: size,
                height: size,
                borderRadius: '50%',
                border: `3px solid transparent`,
                borderTop: `3px solid #4caf50`,
                borderRight: `3px solid #66bb6a`,
              }}
            />
          </Box>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={containerSx}>
        {renderLoadingVariant()}
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Typography 
            variant="h6" 
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {message}
          </Typography>
        </motion.div>

        {/* Animated background elements */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          {[...Array(6)].map((_, index) => (
            <motion.div
              key={index}
              animate={{
                y: [-20, -100],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: index * 0.5,
              }}
              style={{
                position: 'absolute',
                left: `${10 + index * 15}%`,
                width: '4px',
                height: '20px',
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(56, 142, 60, 0.1) 100%)',
                borderRadius: '2px',
              }}
            />
          ))}
        </Box>
      </Box>
    </motion.div>
  );
};

export default LoadingSpinner;
