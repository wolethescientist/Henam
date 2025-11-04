import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

interface LoadingState {
  isLoading: boolean;
  message?: string;
}

interface LoadingContextType {
  loading: LoadingState;
  setLoading: (isLoading: boolean, message?: string) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: undefined,
  });

  const setLoading = useCallback((isLoading: boolean, message?: string) => {
    setLoadingState({ isLoading, message });
  }, []);

  const showLoading = useCallback((message?: string) => {
    setLoadingState({ isLoading: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState({ isLoading: false, message: undefined });
  }, []);

  const value: LoadingContextType = {
    loading,
    setLoading,
    showLoading,
    hideLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
        open={loading.isLoading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress color="inherit" size={60} />
          {loading.message && (
            <Typography variant="h6" sx={{ textAlign: 'center', maxWidth: 300 }}>
              {loading.message}
            </Typography>
          )}
        </Box>
      </Backdrop>
    </LoadingContext.Provider>
  );
};
