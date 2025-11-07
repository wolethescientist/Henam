import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store';
import { baseApi } from './store/api/baseApi';
import { theme } from './theme';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { initializeAuth, setUser, authError, setAuthLoading } from './store/slices/authSlice';
import { useLazyGetCurrentUserQuery } from './store/api/authApi';
import { ROUTES } from './constants';
import { useTokenExpiryChecker } from './hooks/useTokenExpiryChecker';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import FeedbackManager from './components/common/FeedbackManager';

// Components
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OptimizedAdminDashboardPage from './pages/dashboard/OptimizedAdminDashboardPage';
import OptimizedTeamsPage from './pages/teams/OptimizedTeamsPage';
import OptimizedJobsPage from './pages/jobs/OptimizedJobsPage';
import OptimizedTasksPage from './pages/tasks/OptimizedTasksPage';
import FinancePage from './pages/finance/FinancePage';
import OptimizedAttendancePage from './pages/attendance/OptimizedAttendancePage';
import ProfilePage from './pages/profile/ProfilePage';
import FeedbackTest from './pages/FeedbackTest';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthRedirect from './components/auth/AuthRedirect';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, accessToken, user, initialized } = useAppSelector((state) => state.auth);

  // Global token expiry checker - runs periodically to check if token is expired
  useTokenExpiryChecker();

  // Use lazy query to only fetch when explicitly called
  const [getCurrentUser, { data: currentUser, error: userError, isLoading: isUserLoading }] = useLazyGetCurrentUserQuery();

  // Gentle cache refresh on page reload - only invalidate specific tags instead of full reset
  useEffect(() => {
    // Check if this is a page refresh (not initial load or navigation)
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation && navigation.type === 'reload') {
      console.log('Page refresh detected - invalidating stale cache tags');

      // Instead of full reset, only invalidate potentially stale data
      // This prevents race conditions and preserves valid cached data
      dispatch(baseApi.util.invalidateTags(['Dashboard', 'FinancialSummary']));

      // Add a timestamp for cache busting only if needed
      const lastRefresh = sessionStorage.getItem('last_refresh');
      const now = Date.now();

      // Only force refresh if last refresh was more than 5 minutes ago
      if (!lastRefresh || (now - parseInt(lastRefresh)) > 300000) {
        sessionStorage.setItem('refresh_timestamp', now.toString());
        sessionStorage.setItem('last_refresh', now.toString());

        // Remove timestamp after 30 seconds to restore normal caching
        setTimeout(() => {
          sessionStorage.removeItem('refresh_timestamp');
        }, 30000);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    // Only initialize once when not already initialized
    if (initialized) {
      console.log('Auth already initialized, skipping...');
      return;
    }

    const storedToken = localStorage.getItem('access_token');

    console.log('App initial effect - ONCE, stored token:', !!storedToken);

    if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
      console.log('Valid token found, initializing auth...');
      // If token exists, initialize auth and immediately fetch user data
      dispatch(initializeAuth());
      // Fetch user data immediately
      getCurrentUser();
    } else {
      // If no token exists, set loading to false immediately and mark as initialized
      console.log('No valid token found');
      dispatch(setAuthLoading(false));
      // Mark as initialized even when no token exists
      dispatch(initializeAuth());
    }
  }, [initialized, dispatch, getCurrentUser]); // Include initialized to prevent re-runs

  useEffect(() => {
    // Only set user data once when we have it and are authenticated, without user already set
    if (currentUser && isAuthenticated && !user) {
      console.log('Setting user data:', currentUser);
      dispatch(setUser(currentUser));
      dispatch(setAuthLoading(false)); // Set loading to false when user data is loaded
    }
  }, [currentUser, isAuthenticated, user, dispatch]); // Include user to prevent re-runs

  // Timeout to prevent infinite loading state
  useEffect(() => {
    if (isLoading && isAuthenticated) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout reached, clearing loading state');
        dispatch(setAuthLoading(false));
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading, isAuthenticated, dispatch]);

  // Handle authentication errors and ensure loading state is cleared
  useEffect(() => {
    // Clear loading state when user fetch completes (success or error)
    if (!isUserLoading && isAuthenticated && isLoading) {
      console.log('User fetch completed, clearing loading state');
      dispatch(setAuthLoading(false));
    }

    if (userError && !isUserLoading) {
      console.error('User fetch error:', userError);
      // Check if it's a 401/403 (unauthorized) error - only then reset auth
      const isUnauthorized = userError &&
        ((userError as any)?.status === 401 ||
          (userError as any)?.status === 403 ||
          (userError as any)?.data?.detail?.includes('Invalid token') ||
          (userError as any)?.data?.detail?.includes('Token expired') ||
          (userError as any)?.data?.detail?.includes('Not authenticated'));

      if (isUnauthorized) {
        console.log('Token is invalid/expired, resetting auth');
        dispatch(authError('Authentication failed. Please login again.'));
      } else {
        console.log('User fetch failed but keeping auth state - user data is optional');
        dispatch(setAuthLoading(false)); // Just clear loading, keep auth state
      }
    }
  }, [userError, isUserLoading, isAuthenticated, isLoading, dispatch]);

  // Only show loading spinner during initial auth check
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Debug: Log current state (remove once working)
  console.log('App render state:', {
    isLoading,
    isAuthenticated,
    accessToken: !!accessToken,
    user: !!user,
    currentPath: window.location.pathname
  });

  try {
    return (
      <WebSocketProvider>
        <Router>
          <FeedbackProvider>
            <NotificationProvider>
              <ToastProvider>
                <LoadingProvider>
                  <FeedbackManager>
                    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                      <CssBaseline />
                      <Routes>
                        <Route
                          path={ROUTES.LOGIN}
                          element={
                            isAuthenticated ? <AuthRedirect /> : <LoginPage />
                          }
                        />
                        <Route
                          path={ROUTES.RESET_PASSWORD}
                          element={
                            <ErrorBoundary>
                              <ResetPasswordPage />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="/"
                          element={<AuthRedirect />}
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <OptimizedAdminDashboardPage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/teams/*"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <OptimizedTeamsPage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/jobs/*"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <OptimizedJobsPage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/tasks/*"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <OptimizedTasksPage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/finance/*"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <FinancePage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/attendance/*"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <OptimizedAttendancePage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <ProfilePage />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/feedback-test"
                          element={
                            <ProtectedRoute>
                              <Layout>
                                <FeedbackTest />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Box>
                  </FeedbackManager>
                </LoadingProvider>
              </ToastProvider>
            </NotificationProvider>
          </FeedbackProvider>
        </Router>
      </WebSocketProvider>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6" color="error">
          Something went wrong. Please check the console for details.
        </Typography>
      </Box>
    );
  }
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
