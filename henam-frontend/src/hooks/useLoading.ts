import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  loadingType?: 'button' | 'overlay' | 'skeleton' | 'inline';
}

export interface UseLoadingReturn {
  loading: LoadingState;
  setLoading: (loading: boolean, message?: string, type?: LoadingState['loadingType']) => void;
  startLoading: (message?: string, type?: LoadingState['loadingType']) => void;
  stopLoading: () => void;
  withLoading: <T extends any[], R>(
    asyncFn: (...args: T) => Promise<R>,
    message?: string,
    type?: LoadingState['loadingType']
  ) => (...args: T) => Promise<R>;
}

/**
 * Custom hook for managing loading states across CRUD operations
 * Provides consistent loading feedback for all operations
 */
export const useLoading = (): UseLoadingReturn => {
  const [loading, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    loadingMessage: undefined,
    loadingType: 'button'
  });

  const setLoading = useCallback((
    isLoading: boolean, 
    message?: string, 
    type: LoadingState['loadingType'] = 'button'
  ) => {
    setLoadingState({
      isLoading,
      loadingMessage: message,
      loadingType: type
    });
  }, []);

  const startLoading = useCallback((
    message?: string, 
    type: LoadingState['loadingType'] = 'button'
  ) => {
    setLoadingState({
      isLoading: true,
      loadingMessage: message,
      loadingType: type
    });
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
      loadingType: 'button'
    });
  }, []);

  const withLoading = useCallback(<T extends any[], R>(
    asyncFn: (...args: T) => Promise<R>,
    message?: string,
    type: LoadingState['loadingType'] = 'button'
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        startLoading(message, type);
        const result = await asyncFn(...args);
        return result;
      } finally {
        stopLoading();
      }
    };
  }, [startLoading, stopLoading]);

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading
  };
};

export default useLoading;
