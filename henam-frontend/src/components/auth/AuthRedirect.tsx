import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import LoadingSpinner from '../common/LoadingSpinner';

interface AuthRedirectProps {
  children?: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = () => {
  const { isAuthenticated, isLoading, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  console.log('AuthRedirect:', { 
    isLoading, 
    isAuthenticated, 
    initialized,
    path: location.pathname 
  });

  // Show loading while authentication is being initialized
  if (isLoading && !initialized) {
    console.log('AuthRedirect: Still loading and not initialized, showing loading spinner');
    return <LoadingSpinner />;
  }

  // If not authenticated (after initialization), redirect to login
  if (!isAuthenticated && initialized) {
    console.log('AuthRedirect: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authenticated, redirect to dashboard from login page or root
  if (location.pathname === '/' || location.pathname === '/login') {
    console.log('AuthRedirect: Authenticated user on login/root path, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If we're on any other path, don't redirect - let the user stay on current page
  console.log('AuthRedirect: Authenticated user on other path, staying put');
  return null;
};

export default AuthRedirect;
