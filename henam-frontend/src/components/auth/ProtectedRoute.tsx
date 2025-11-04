import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { ROUTES } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import { authError } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children
}) => {
  const { isAuthenticated, isLoading, initialized, accessToken } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const location = useLocation();

  console.log('ProtectedRoute:', { 
    isLoading, 
    isAuthenticated, 
    initialized,
    hasToken: !!accessToken,
    path: location.pathname 
  });

  // Check for token expiration and redirect immediately
  useEffect(() => {
    if (accessToken && isAuthenticated) {
      try {
        // Decode JWT token to check expiration
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (tokenPayload.exp && tokenPayload.exp < currentTime) {
          console.log('ProtectedRoute: Token expired, logging out and redirecting immediately');
          
          // Clear auth state
          dispatch(authError('Session expired. Please login again.'));
          
          // Redirect immediately to login page
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('ProtectedRoute: Error checking token expiration:', error);
        // If token is malformed, log out and redirect
        dispatch(authError('Invalid session. Please login again.'));
        window.location.href = '/login';
      }
    }
  }, [accessToken, isAuthenticated, dispatch]);

  // If we're still loading authentication state and not yet initialized, show loading
  if (isLoading && !initialized) {
    console.log('ProtectedRoute: Still loading and not initialized, showing loading spinner');
    return <LoadingSpinner />;
  }

  // If not authenticated (after initialization), redirect to login
  if (!isAuthenticated && initialized) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Additional check: if we have no token but claim to be authenticated, redirect
  if (isAuthenticated && !accessToken) {
    console.log('ProtectedRoute: Authenticated but no token, redirecting to login');
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // If authenticated, allow access (no role-based restrictions)
  console.log('ProtectedRoute: Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
