import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LoadingState } from '../hooks/useLoading';
import { useToast, type ToastType } from '../hooks/useToast';

export interface GlobalLoadingState {
  [key: string]: LoadingState;
}

export interface FeedbackContextType {
  // Global loading states
  globalLoading: GlobalLoadingState;
  setGlobalLoading: (key: string, loading: LoadingState) => void;
  clearGlobalLoading: (key: string) => void;
  clearAllGlobalLoading: () => void;
  
  // Toast functions
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  
  // CRUD operation helpers
  withGlobalLoading: <T extends any[], R>(
    key: string,
    operation: (...args: T) => Promise<R>,
    options?: {
      loadingMessage?: string;
      loadingType?: LoadingState['loadingType'];
      successMessage?: string;
      errorMessage?: string;
    }
  ) => (...args: T) => Promise<R | undefined>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: ReactNode;
}

/**
 * Global feedback provider that manages loading states and notifications
 * Provides centralized feedback management across the entire application
 */
export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [globalLoading, setGlobalLoadingState] = useState<GlobalLoadingState>({});
  const { showToast, showSuccess, showError, showWarning, showInfo } = useToast();

  const setGlobalLoading = useCallback((key: string, loading: LoadingState) => {
    setGlobalLoadingState(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const clearGlobalLoading = useCallback((key: string) => {
    setGlobalLoadingState(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  const clearAllGlobalLoading = useCallback(() => {
    setGlobalLoadingState({});
  }, []);

  const withGlobalLoading = useCallback(<T extends any[], R>(
    key: string,
    operation: (...args: T) => Promise<R>,
    options: {
      loadingMessage?: string;
      loadingType?: LoadingState['loadingType'];
      successMessage?: string;
      errorMessage?: string;
    } = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      const {
        loadingMessage = 'Processing...',
        loadingType = 'button',
        successMessage = 'Operation completed successfully!',
        errorMessage = 'Operation failed. Please try again.'
      } = options;

      try {
        // Start loading
        setGlobalLoading(key, {
          isLoading: true,
          loadingMessage,
          loadingType
        });

        const result = await operation(...args);
        
        // Stop loading and show success
        clearGlobalLoading(key);
        showSuccess(successMessage);
        
        return result;
      } catch (error) {
        // Stop loading and show error
        clearGlobalLoading(key);
        showError(errorMessage);
        console.error(`Operation ${key} failed:`, error);
        return undefined;
      }
    };
  }, [setGlobalLoading, clearGlobalLoading, showSuccess, showError]);

  const value: FeedbackContextType = {
    globalLoading,
    setGlobalLoading,
    clearGlobalLoading,
    clearAllGlobalLoading,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    withGlobalLoading
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;
