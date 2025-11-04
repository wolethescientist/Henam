import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  Container,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useLoginMutation, useLazyGetCurrentUserQuery, useForgotPasswordMutation } from '../../store/api/authApi';
import { loginStart, loginSuccess, loginFailure, setUser } from '../../store/slices/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants';
import Logo from '../../components/common/Logo';
import { useNotifications } from '../../contexts/NotificationContext';

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  remember_me: yup.boolean().optional().default(false),
});

const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
});

type LoginFormData = {
  email: string;
  password: string;
  remember_me: boolean;
};

type ForgotPasswordFormData = {
  email: string;
};

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const [loginMutation] = useLoginMutation();
  const [getCurrentUser] = useLazyGetCurrentUserQuery();
  const [forgotPasswordMutation, { isLoading: isForgotPasswordLoading }] = useForgotPasswordMutation();
  const { error, isLoading } = useAppSelector((state) => state.auth);
  
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const {
    register: registerForgotPassword,
    handleSubmit: handleSubmitForgotPassword,
    formState: { errors: forgotPasswordErrors },
    reset: resetForgotPassword,
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
  });


  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log('🔐 Starting login process...');
      dispatch(loginStart());
      
      console.log('🔐 Calling login API...');
      const loginResult = await loginMutation(data).unwrap();
      console.log('🔐 Login API successful:', !!loginResult.access_token);
      
      // First dispatch the login success to update auth state
      dispatch(loginSuccess(loginResult));
      console.log('🔐 Login success dispatched');
      
      // Then fetch user profile with the new token
      try {
        console.log('🔐 Fetching user profile...');
        const userResult = await getCurrentUser().unwrap();
        console.log('🔐 User profile fetched:', !!userResult);
        dispatch(setUser(userResult));
      } catch (userError) {
        console.error('🔐 Failed to fetch user profile:', userError);
        // Continue with login even if user fetch fails - the token is still valid
      }
      
      // Redirect to where user came from, or to dashboard
      const from = (location.state as any)?.from?.pathname;
      const redirectPath = from && from !== '/login' ? from : ROUTES.DASHBOARD;
      console.log('🔐 Redirecting to:', redirectPath);
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('🔐 Login failed:', error);
      const errorMessage = error?.data?.detail || 'Login failed. Please try again.';
      dispatch(loginFailure(errorMessage));
    }
  };

  const onSubmitForgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation(data).unwrap();
      addNotification({
        type: 'success',
        title: 'Reset Email Sent',
        message: 'If the email exists, a password reset link has been sent to your inbox.',
      });
      setForgotPasswordOpen(false);
      resetForgotPassword();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error?.data?.detail || 'Failed to send reset email. Please try again.',
      });
    }
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 1, sm: 2 },
        width: '100%',
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
              background: 'white',
              padding: { xs: 3, sm: 4 },
              textAlign: 'center',
              color: 'black',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Logo variant="image" size="large" />
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
              Welcome Back
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              textAlign="center" 
              sx={{ mb: 3 }}
            >
              Sign in to your account to continue
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
              <TextField
                {...register('email')}
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={{ mb: 2 }}
              />
              <TextField
                {...register('password')}
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={<Checkbox {...register('remember_me')} color="primary" />}
                label="Remember me"
                sx={{ mb: 2 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
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
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Box>

            <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                Forgot your password?{' '}
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Reset it here
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Paper>
      </Container>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={forgotPasswordOpen} 
        onClose={() => setForgotPasswordOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          <Box component="form" onSubmit={handleSubmitForgotPassword(onSubmitForgotPassword)}>
            <TextField
              {...registerForgotPassword('email')}
              fullWidth
              margin="normal"
              label="Email Address"
              type="email"
              autoComplete="email"
              error={!!forgotPasswordErrors.email}
              helperText={forgotPasswordErrors.email?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotPasswordOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitForgotPassword(onSubmitForgotPassword)}
            variant="contained"
            disabled={isForgotPasswordLoading}
          >
            {isForgotPasswordLoading ? (
              <CircularProgress size={20} />
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
