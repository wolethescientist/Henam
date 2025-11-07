import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { useResetPasswordMutation } from '../../store/api/authApi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../constants';

const schema = yup.object({
  new_password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('new_password')], 'Passwords must match')
    .required('Please confirm your password'),
});

type ResetPasswordFormData = {
  new_password: string;
  confirm_password: string;
};

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resetPasswordMutation, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  
  const token = searchParams.get('token');
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    // Validate token on component mount
    if (!token) {
      setSnackbar({
        open: true,
        message: 'No reset token provided. Please request a new password reset.',
        severity: 'error',
      });
      setTimeout(() => {
        navigate(ROUTES.LOGIN, { replace: true });
      }, 2000);
      return;
    }
    
    // For now, we'll assume the token is valid if it exists
    // In a real app, you might want to validate the token with the backend
    setTokenValid(true);
    setIsValidatingToken(false);
  }, [token, navigate]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setSnackbar({
        open: true,
        message: 'No reset token available.',
        severity: 'error',
      });
      return;
    }

    try {
      await resetPasswordMutation({
        token,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      }).unwrap();
      
      setSnackbar({
        open: true,
        message: 'Your password has been reset successfully. Redirecting to login...',
        severity: 'success',
      });
      
      setTimeout(() => {
        navigate(ROUTES.LOGIN, { replace: true });
      }, 2000);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.data?.detail || 'Failed to reset password. The link may have expired.',
        severity: 'error',
      });
    }
  };

  if (isValidatingToken) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: { xs: 1, sm: 2 },
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={10}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              mx: { xs: 1, sm: 0 },
              textAlign: 'center',
              p: 4,
            }}
          >
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Validating reset link...</Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!tokenValid) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: { xs: 1, sm: 2 },
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={10}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              mx: { xs: 1, sm: 0 },
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                padding: { xs: 3, sm: 4 },
                textAlign: 'center',
                color: 'white',
              }}
            >
              <Typography 
                variant="h4"
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}
              >
                Henam
              </Typography>
              <Typography 
                variant="h6"
                sx={{ 
                  opacity: 0.9,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                Password Reset
              </Typography>
            </Box>

            <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                Invalid or expired reset link. Please request a new password reset.
              </Alert>
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate(ROUTES.LOGIN)}
                sx={{
                  mt: 2,
                  py: { xs: 1.2, sm: 1.5 },
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Back to Login
              </Button>
            </CardContent>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: { xs: 1, sm: 2 },
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={10}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              mx: { xs: 1, sm: 0 },
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                padding: { xs: 3, sm: 4 },
                textAlign: 'center',
                color: 'white',
              }}
            >
              <Typography 
                variant="h4"
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}
              >
                Henam
              </Typography>
              <Typography 
                variant="h6"
                sx={{ 
                  opacity: 0.9,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                Reset Your Password
              </Typography>
            </Box>

            <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
              <Typography 
                variant="h5"
                component="h2" 
                gutterBottom 
                textAlign="center" 
                color="primary"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
              >
                Create New Password
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                textAlign="center" 
                sx={{ mb: 3 }}
              >
                Enter your new password below
              </Typography>

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
                <TextField
                  {...register('new_password')}
                  margin="normal"
                  required
                  fullWidth
                  name="new_password"
                  label="New Password"
                  type="password"
                  id="new_password"
                  autoComplete="new-password"
                  autoFocus
                  error={!!errors.new_password}
                  helperText={errors.new_password?.message}
                  sx={{ mb: 2 }}
                />
                <TextField
                  {...register('confirm_password')}
                  margin="normal"
                  required
                  fullWidth
                  name="confirm_password"
                  label="Confirm New Password"
                  type="password"
                  id="confirm_password"
                  autoComplete="new-password"
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password?.message}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isResettingPassword}
                  sx={{
                    mt: 2,
                    mb: 2,
                    py: { xs: 1.2, sm: 1.5 },
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  {isResettingPassword ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </Box>

              <Box textAlign="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Remember your password?{' '}
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate(ROUTES.LOGIN)}
                  >
                    Sign in here
                  </Button>
                </Typography>
              </Box>
            </CardContent>
          </Paper>
        </Container>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ResetPasswordPage;
