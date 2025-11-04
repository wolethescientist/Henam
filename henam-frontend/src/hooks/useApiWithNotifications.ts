import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useLoading } from '../contexts/LoadingContext';

interface ApiWithNotificationsOptions {
  showLoading?: boolean;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useApiWithNotifications = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const { showLoading, hideLoading } = useLoading();

  const executeWithNotifications = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: ApiWithNotificationsOptions = {}
  ): Promise<T | null> => {
    const {
      showLoading: shouldShowLoading = true,
      loadingMessage = 'Processing...',
      successMessage,
      errorMessage = 'An error occurred',
      onSuccess,
      onError,
    } = options;

    try {
      if (shouldShowLoading) {
        showLoading(loadingMessage);
      }

      const result = await apiCall();

      if (shouldShowLoading) {
        hideLoading();
      }

      if (successMessage) {
        showSuccess(successMessage);
      }

      if (onSuccess) {
        onSuccess();
      }

      return result;
    } catch (error: any) {
      if (shouldShowLoading) {
        hideLoading();
      }

      const errorMsg = error?.data?.message || error?.message || errorMessage;
      showError(errorMsg);

      if (onError) {
        onError(error);
      }

      return null;
    }
  }, [showSuccess, showError, showInfo, showLoading, hideLoading]);

  return {
    executeWithNotifications,
    showSuccess,
    showError,
    showInfo,
    showLoading,
    hideLoading,
  };
};
