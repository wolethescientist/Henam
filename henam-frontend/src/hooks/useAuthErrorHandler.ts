import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './redux';
import { authError } from '../store/slices/authSlice';
import { ROUTES } from '../constants';

/**
 * Custom hook to handle authentication errors globally
 * This hook should be used in components that make API calls
 * to automatically redirect to login when authentication fails
 */
export const useAuthErrorHandler = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleAuthError = (error: any) => {
    // Check if this is an authentication error
    const isAuthError = 
      error?.isAuthError || 
      error?.status === 401 || 
      error?.status === 403 ||
      error?.data?.detail?.includes('Invalid token') ||
      error?.data?.detail?.includes('Token expired') ||
      error?.data?.detail?.includes('Not authenticated');

    if (isAuthError && isAuthenticated) {
      console.log('Authentication error detected, redirecting to login');
      
      // Clear auth state
      dispatch(authError('Session expired. Please login again.'));
      
      // Redirect to login
      navigate(ROUTES.LOGIN, { replace: true });
      
      return true; // Indicates that auth error was handled
    }
    
    return false; // Not an auth error
  };

  return { handleAuthError };
};

/**
 * Hook to automatically handle auth errors from RTK Query hooks
 */
export const useAuthErrorHandlerForQuery = (error: any) => {
  const { handleAuthError } = useAuthErrorHandler();

  useEffect(() => {
    if (error) {
      handleAuthError(error);
    }
  }, [error, handleAuthError]);
};
