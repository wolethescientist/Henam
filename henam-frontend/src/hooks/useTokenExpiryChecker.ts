import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { authError } from '../store/slices/authSlice';

/**
 * Global hook to check token expiration periodically
 * This ensures users are redirected to login immediately when their token expires
 * even if they're not actively making API calls
 */
export const useTokenExpiryChecker = () => {
  const dispatch = useAppDispatch();
  const { accessToken, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Only run if user is authenticated and has a token
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Function to check if token is expired
    const checkTokenExpiry = () => {
      try {
        // Decode JWT token to check expiration
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        // Check if token is expired or will expire in the next 30 seconds
        if (tokenPayload.exp && tokenPayload.exp < currentTime) {
          console.log('Token expired, redirecting to login immediately');
          
          // Clear auth state
          dispatch(authError('Session expired. Please login again.'));
          
          // Redirect immediately to login page
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        // If token is malformed, log out and redirect
        dispatch(authError('Invalid session. Please login again.'));
        window.location.href = '/login';
      }
    };

    // Check immediately on mount
    checkTokenExpiry();

    // Set up interval to check every 30 seconds
    const intervalId = setInterval(checkTokenExpiry, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [accessToken, isAuthenticated, dispatch]);
};
