import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginResponse } from '../../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<LoginResponse>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.accessToken = action.payload.access_token;
      state.error = null;
      state.initialized = true; // Mark as initialized after successful login
      
      // Store token in localStorage
      localStorage.setItem('access_token', action.payload.access_token);
      localStorage.setItem('token_type', action.payload.token_type);
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.error = null;
      state.initialized = false; // Reset initialized flag on logout
      
      // Clear tokens from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
    },
    clearError: (state) => {
      state.error = null;
    },
    authError: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.error = action.payload;
      state.initialized = false; // Reset initialized flag on auth error
      
      // Clear tokens from localStorage on auth error
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    initializeAuth: (state) => {
      if (state.initialized) {
        console.log('Auth already initialized, skipping...');
        return;
      }
      
      const accessToken = localStorage.getItem('access_token');
      
      console.log('InitializeAuth called, token exists:', !!accessToken);
      
      if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') {
        state.accessToken = accessToken;
        state.isAuthenticated = true;
        state.isLoading = true; // Keep loading true until user data is fetched
        state.error = null;
      } else {
        state.accessToken = null;
        state.isAuthenticated = false;
        state.user = null;
        state.isLoading = false;
        state.error = null;
      }
      
      state.initialized = true;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    sessionTimeout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.error = 'Your session has expired. Please login again.';
      state.initialized = false;
      
      // Clear tokens from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  authError,
  updateUser,
  setUser,
  initializeAuth,
  setAuthLoading,
  sessionTimeout,
} = authSlice.actions;

export default authSlice.reducer;
