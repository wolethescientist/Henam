import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

const baseUrl = import.meta.env.VITE_API_URL || 'https://henam.linkpc.net';

// Custom base query with timeout support
const baseQueryWithTimeout: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: baseUrl,
    prepareHeaders: (headers, { getState, endpoint }) => {
      const state = getState() as any;
      const token = state?.auth?.accessToken || localStorage.getItem('access_token');
      
      console.log('API call to:', endpoint, 'with baseUrl:', baseUrl, 'token exists:', !!token);
      
      if (token && token !== 'null' && token !== 'undefined') {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      // Add reasonable cache control
      headers.set('Cache-Control', 'max-age=30');
      
      // Don't set content-type for file uploads - let the browser handle it
      if (endpoint !== 'uploadMyPicture') {
        headers.set('content-type', 'application/json');
      }
      return headers;
    },
    // Custom response handler that properly handles errors and blob responses
    responseHandler: async (response) => {
      console.log('API response:', response.status, response.statusText);
      
      if (!response.ok) {
        // Parse error response
        let errorData;
        try {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          
          // Try to parse as JSON, fallback to text
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || 'An error occurred' };
          }
        } catch {
          errorData = { message: 'Failed to parse error response' };
        }

        // For 401/403 errors, clear auth state and redirect to login immediately
        if (response.status === 401 || response.status === 403) {
          console.log('Authentication error detected, clearing auth state and redirecting to login');
          
          // Clear tokens from localStorage
          localStorage.removeItem('access_token');
          localStorage.removeItem('token_type');
          
          // Dispatch logout action to clear Redux state
          // Import store dynamically to avoid circular dependencies
          import('../../store').then(({ store }) => {
            import('../../store/slices/authSlice').then(({ logout }) => {
              store.dispatch(logout());
            });
          });
          
          // Redirect to login page immediately
          // Use window.location for immediate redirect without waiting for React Router
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          
          const error = {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            isAuthError: true, // Flag to identify auth errors
          };
          throw error;
        }

        // Throw a serializable error object instead of the Response
        throw {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
      }

      // Check if this is a blob response (for file downloads)
      const contentType = response.headers.get('content-type');
      if (contentType && (
        contentType.includes('application/vnd.openxmlformats-officedocument') ||
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream') ||
        contentType.includes('application/zip')
      )) {
        return await response.blob();
      }

      // For successful responses, parse the JSON and return it
      try {
        return await response.json();
      } catch {
        // If response is not JSON, return the text
        return await response.text();
      }
    },
  });

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 30000); // 30 second timeout
  });

  try {
    // Race between the actual request and timeout
    return await Promise.race([
      baseQuery(args, api, extraOptions),
      timeoutPromise
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      return {
        error: {
          status: 'TIMEOUT_ERROR',
          error: 'Request timed out after 30 seconds',
        } as FetchBaseQueryError,
      };
    }
    throw error;
  }
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  // Keep data cached for better UX and reduce API calls
  keepUnusedDataFor: 600, // Keep unused data for 10 minutes (increased for stability)
  refetchOnMountOrArgChange: 60, // Only refetch if data is older than 1 minute (reduced for freshness)
  refetchOnFocus: false, // Don't refetch when window gains focus
  refetchOnReconnect: false, // Don't auto-refetch on reconnect to prevent spam
  baseQuery: baseQueryWithTimeout,
  tagTypes: [
    'User',
    'Team',
    'Job',
    'Task',
    'Invoice',
    'Attendance',
    'Reminder',
    'Report',
    'Notification',
    'FinancialSummary',
    'JobFinancial',
    'StaffProfile',
    'TeamPerformance',
    'Dashboard',
    'Expense',
    'ExpenseCategory',
    'FinancialAnalytics',
  ],
  endpoints: () => ({}),
});
