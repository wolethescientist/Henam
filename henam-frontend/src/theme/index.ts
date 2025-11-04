import { createTheme } from '@mui/material/styles';

// Enhanced Henam color palette with modern gradients and improved accessibility
const henamColors = {
  primary: {
    50: '#e8f8e8',
    100: '#c8edc9',
    200: '#a5e0a7',
    300: '#81d284',
    400: '#66c66a',
    500: '#4caf50', // Main green
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32', // Darker green for primary
    900: '#1b5e20',
  },
  secondary: {
    50: '#fafbff',
    100: '#f1f3f9',
    200: '#e4e7f0',
    300: '#d1d6e8',
    400: '#b8c0d9',
    500: '#9ca4c4',
    600: '#7c85a8',
    700: '#5d6b8a',
    800: '#424b66',
    900: '#2a3142',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
  },
  // New gradient colors
  gradients: {
    primary: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    secondary: 'linear-gradient(135deg, #9ca4c4 0%, #5d6b8a 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
  },
  // Glass morphism colors
  glass: {
    primary: 'rgba(76, 175, 80, 0.1)',
    secondary: 'rgba(156, 164, 196, 0.1)',
    background: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(255, 255, 255, 0.2)',
  },
};

export const theme = createTheme({
  palette: {
    primary: {
      main: henamColors.primary[600], // #43a047 - More vibrant
      light: henamColors.primary[400],
      dark: henamColors.primary[800],
      contrastText: '#ffffff',
    },
    secondary: {
      main: henamColors.secondary[600],
      light: henamColors.secondary[300],
      dark: henamColors.secondary[800],
      contrastText: '#ffffff',
    },
    success: henamColors.success,
    warning: henamColors.warning,
    error: henamColors.error,
    info: henamColors.info,
    background: {
      default: '#f8fafc', // Softer background
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Improved contrast
      secondary: '#64748b',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
  },
  typography: {
    fontFamily: '"Poppins", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3.5rem', // Increased from 2.75rem
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      color: henamColors.primary[800],
    },
    h2: {
      fontSize: '2.75rem', // Increased from 2.25rem
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: '-0.025em',
      color: henamColors.primary[800],
    },
    h3: {
      fontSize: '2.25rem', // Increased from 1.875rem
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
      color: henamColors.primary[800],
    },
    h4: {
      fontSize: '1.875rem', // Increased from 1.5rem
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '-0.025em',
      color: henamColors.primary[800],
    },
    h5: {
      fontSize: '1.5rem', // Increased from 1.25rem
      fontWeight: 600,
      lineHeight: 1.4,
      color: henamColors.primary[800],
    },
    h6: {
      fontSize: '1.3rem', // Increased from 1.125rem
      fontWeight: 600,
      lineHeight: 1.4,
      color: henamColors.primary[800],
    },
    body1: {
      fontSize: '1.125rem', // Increased from 1rem
      lineHeight: 1.6,
      color: '#334155',
      fontWeight: 400,
    },
    body2: {
      fontSize: '1rem', // Increased from 0.875rem
      lineHeight: 1.5,
      color: '#475569',
      fontWeight: 400,
    },
    subtitle1: {
      fontSize: '1.25rem', // Increased from 1rem
      fontWeight: 500,
      lineHeight: 1.5,
      color: '#475569',
    },
    subtitle2: {
      fontSize: '1.1rem', // Increased from 0.875rem
      fontWeight: 500,
      lineHeight: 1.4,
      color: '#64748b',
    },
    caption: {
      fontSize: '0.875rem', // Increased from 0.75rem
      lineHeight: 1.4,
      color: '#64748b',
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 12, // More modern rounded corners
  },
  shadows: [
    'none',
    '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
    '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)',
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 2px 4px rgba(0, 0, 0, 0.02), 0px 8px 16px rgba(0, 0, 0, 0.06)',
    '0px 4px 8px rgba(0, 0, 0, 0.04), 0px 12px 24px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.06), 0px 16px 32px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.08), 0px 24px 48px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.1), 0px 32px 64px rgba(0, 0, 0, 0.14)',
    '0px 20px 40px rgba(0, 0, 0, 0.12), 0px 40px 80px rgba(0, 0, 0, 0.16)',
    '0px 24px 48px rgba(0, 0, 0, 0.14), 0px 48px 96px rgba(0, 0, 0, 0.18)',
    '0px 28px 56px rgba(0, 0, 0, 0.16), 0px 56px 112px rgba(0, 0, 0, 0.2)',
    '0px 32px 64px rgba(0, 0, 0, 0.18), 0px 64px 128px rgba(0, 0, 0, 0.22)',
    '0px 36px 72px rgba(0, 0, 0, 0.2), 0px 72px 144px rgba(0, 0, 0, 0.24)',
    '0px 40px 80px rgba(0, 0, 0, 0.22), 0px 80px 160px rgba(0, 0, 0, 0.26)',
    '0px 44px 88px rgba(0, 0, 0, 0.24), 0px 88px 176px rgba(0, 0, 0, 0.28)',
    '0px 48px 96px rgba(0, 0, 0, 0.26), 0px 96px 192px rgba(0, 0, 0, 0.3)',
    '0px 52px 104px rgba(0, 0, 0, 0.28), 0px 104px 208px rgba(0, 0, 0, 0.32)',
    '0px 56px 112px rgba(0, 0, 0, 0.3), 0px 112px 224px rgba(0, 0, 0, 0.34)',
    '0px 60px 120px rgba(0, 0, 0, 0.32), 0px 120px 240px rgba(0, 0, 0, 0.36)',
    '0px 64px 128px rgba(0, 0, 0, 0.34), 0px 128px 256px rgba(0, 0, 0, 0.38)',
    '0px 68px 136px rgba(0, 0, 0, 0.36), 0px 136px 272px rgba(0, 0, 0, 0.4)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          padding: '14px 32px', // Increased padding
          fontWeight: 600,
          fontSize: '1rem', // Increased from 0.875rem
          fontFamily: '"Poppins", "Inter", sans-serif',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'left 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          },
        },
        contained: {
          background: henamColors.gradients.primary,
          boxShadow: '0px 4px 12px rgba(67, 160, 71, 0.3)',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(67, 160, 71, 0.4)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
        },
        outlined: {
          borderWidth: '2px',
          borderColor: henamColors.primary[300],
          '&:hover': {
            borderWidth: '2px',
            borderColor: henamColors.primary[500],
            backgroundColor: henamColors.primary[50],
            transform: 'translateY(-1px)',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: henamColors.primary[50],
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-4px)',
            borderColor: 'rgba(67, 160, 71, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
        },
        elevation3: {
          boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: henamColors.primary[400],
                borderWidth: '2px',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: henamColors.primary[600],
                borderWidth: '2px',
                boxShadow: `0 0 0 3px ${henamColors.primary[100]}`,
              },
            },
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
            fontSize: '1.1rem', // Increased label size
            fontFamily: '"Poppins", "Inter", sans-serif',
          },
          '& .MuiInputBase-input': {
            fontSize: '1rem', // Increased input text size
            fontFamily: '"Poppins", "Inter", sans-serif',
            padding: '14px 16px', // Increased padding
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 0',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: henamColors.primary[50],
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            background: henamColors.gradients.primary,
            color: 'white',
            '&:hover': {
              background: henamColors.gradients.primary,
              transform: 'translateX(4px)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        colorPrimary: {
          background: henamColors.gradients.primary,
          color: 'white',
        },
        colorSecondary: {
          background: henamColors.gradients.secondary,
          color: 'white',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: henamColors.primary[50],
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '1rem', // Increased from default
          fontFamily: '"Poppins", "Inter", sans-serif',
          padding: '16px', // Increased padding
          lineHeight: 1.5,
        },
        head: {
          fontSize: '1.1rem', // Larger header text
          fontWeight: 600,
          fontFamily: '"Poppins", "Inter", sans-serif',
          color: henamColors.primary[800],
          padding: '20px 16px', // More padding for headers
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(76, 175, 80, 0.02)',
            transform: 'scale(1.001)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          backgroundColor: henamColors.primary[100],
        },
        bar: {
          borderRadius: 8,
          background: henamColors.gradients.primary,
        },
      },
    },
  },
});

export default theme;
