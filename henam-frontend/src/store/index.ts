import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi.ts';
import authReducer, { authError } from './slices/authSlice.ts';
import uiReducer from './slices/uiSlice.ts';
import type { UiState } from './slices/uiSlice.ts';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          // Ignore RTK Query actions that contain non-serializable data
          ...['baseApi/executeMutation/fulfilled', 'baseApi/executeQuery/fulfilled', 'baseApi/executeQuery/rejected', 'auth/loginSuccess'].map(
            (type) => `${type}`
          ),
        ],
        ignoredActionsPaths: [
          'meta.arg',
          'payload.timestamp',
          'error.meta.arg',
          'meta.baseQueryMeta',
        ],
        ignoredPaths: [
          // Ignore RTK Query cache data that might contain non-serializable values
          'baseApi.queries',
          'baseApi.mutations',
          'baseApi.subscriptions',
        ],
      },
    })
      .concat(baseApi.middleware)
      .concat((store: any) => (next: any) => (action: any) => {
        // Handle authentication errors globally
        if (action.type?.endsWith('/rejected') && action.payload?.isAuthError) {
          console.log('Global auth error handler: dispatching authError');
          // Dispatch auth error immediately to reset auth state
          store.dispatch(authError('Session expired. Please login again.'));
        }
        return next(action);
      }),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Explicit type for better TypeScript inference
export interface RootStateType {
  auth: any; // You can type this properly later
  ui: UiState;
  [baseApi.reducerPath]: any;
}
