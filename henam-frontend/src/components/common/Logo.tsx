import React from 'react';
import { Box, Typography } from '@mui/material';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text' | 'image';
  size?: 'small' | 'medium' | 'large' | { xs: string; sm?: string; md?: string };
  color?: 'primary' | 'white' | 'inherit';
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  size = 'medium', 
  color = 'primary' 
}) => {
  const getSize = () => {
    if (typeof size === 'object') {
      // Handle responsive size object
      const responsiveSize = {
        fontSize: {
          xs: size.xs === 'small' ? '1.2rem' : size.xs === 'large' ? '2rem' : '1.5rem',
          sm: size.sm ? (size.sm === 'small' ? '1.2rem' : size.sm === 'large' ? '2rem' : '1.5rem') : undefined,
          md: size.md ? (size.md === 'small' ? '1.2rem' : size.md === 'large' ? '2rem' : '1.5rem') : undefined,
        },
        iconSize: {
          xs: size.xs === 'small' ? 24 : size.xs === 'large' ? 40 : 32,
          sm: size.sm ? (size.sm === 'small' ? 24 : size.sm === 'large' ? 40 : 32) : undefined,
          md: size.md ? (size.md === 'small' ? 24 : size.md === 'large' ? 40 : 32) : undefined,
        }
      };
      return responsiveSize;
    }
    
    switch (size) {
      case 'small':
        return { fontSize: '1.2rem', iconSize: 24 };
      case 'large':
        return { fontSize: '2rem', iconSize: 40 };
      default:
        return { fontSize: '1.5rem', iconSize: 32 };
    }
  };

  const sizeConfig = getSize();

  const getColor = () => {
    switch (color) {
      case 'white':
        return 'white';
      case 'primary':
        return 'primary.main';
      default:
        return 'inherit';
    }
  };

  if (variant === 'icon') {
    return (
      <Box
        sx={{
          width: typeof sizeConfig.iconSize === 'object' ? sizeConfig.iconSize : sizeConfig.iconSize,
          height: typeof sizeConfig.iconSize === 'object' ? sizeConfig.iconSize : sizeConfig.iconSize,
          borderRadius: 1,
          backgroundColor: color === 'white' ? 'white' : 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color === 'white' ? 'primary.main' : 'white',
          fontWeight: 'bold',
          fontSize: typeof sizeConfig.fontSize === 'object' ? sizeConfig.fontSize : sizeConfig.fontSize,
        }}
      >
        H
      </Box>
    );
  }

  if (variant === 'text') {
    return (
      <Typography
        variant="h6"
        sx={{
          color: getColor(),
          fontWeight: 'bold',
          fontSize: typeof sizeConfig.fontSize === 'object' ? sizeConfig.fontSize : sizeConfig.fontSize,
        }}
      >
        Henam
      </Typography>
    );
  }

  if (variant === 'image') {
    const imageSize = typeof sizeConfig.iconSize === 'object' ? sizeConfig.iconSize : sizeConfig.iconSize;
    return (
      <Box
        component="img"
        src="/uploads/company_logo/henam_logo.jpg"
        alt="Henam Logo"
        sx={{
          height: imageSize,
          width: 'auto',
          maxWidth: '400px',
          minWidth: '300px',
          objectFit: 'contain',
        }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: typeof sizeConfig.iconSize === 'object' ? sizeConfig.iconSize : sizeConfig.iconSize,
          height: typeof sizeConfig.iconSize === 'object' ? sizeConfig.iconSize : sizeConfig.iconSize,
          borderRadius: 1,
          backgroundColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: typeof sizeConfig.fontSize === 'object' ? sizeConfig.fontSize : sizeConfig.fontSize,
          mr: 1,
        }}
      >
        H
      </Box>
      <Typography
        variant="h6"
        sx={{
          color: getColor(),
          fontWeight: 'bold',
          fontSize: typeof sizeConfig.fontSize === 'object' ? sizeConfig.fontSize : sizeConfig.fontSize,
        }}
      >
        Henam
      </Typography>
    </Box>
  );
};

export default Logo;
