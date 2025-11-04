import { useCallback } from 'react';
import { useLoading, type LoadingState } from './useLoading';
import { useToast, type ToastType } from './useToast';

export interface CrudOperationOptions {
  loadingMessage?: string;
  loadingType?: LoadingState['loadingType'];
  successMessage?: string;
  errorMessage?: string;
  toastType?: ToastType;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export interface UseCrudFeedbackReturn {
  loading: LoadingState;
  executeWithFeedback: <T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options?: CrudOperationOptions
  ) => (...args: T) => Promise<R | undefined>;
  createWithFeedback: <T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options?: CrudOperationOptions
  ) => (...args: T) => Promise<R | undefined>;
  updateWithFeedback: <T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options?: CrudOperationOptions
  ) => (...args: T) => Promise<R | undefined>;
  deleteWithFeedback: <T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options?: CrudOperationOptions
  ) => (...args: T) => Promise<R | undefined>;
  fetchWithFeedback: <T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options?: CrudOperationOptions
  ) => (...args: T) => Promise<R | undefined>;
}

/**
 * Comprehensive hook for CRUD operations with consistent feedback
 * Combines loading states and toast notifications for all CRUD operations
 */
export const useCrudFeedback = (): UseCrudFeedbackReturn => {
  const { loading, startLoading, stopLoading } = useLoading();
  const { showSuccess, showError } = useToast();

  const getDefaultMessages = (operation: 'create' | 'update' | 'delete' | 'fetch' | 'generic') => {
    const messages = {
      create: {
        loading: 'Creating...',
        success: 'Created successfully!',
        error: 'Failed to create. Please try again.'
      },
      update: {
        loading: 'Updating...',
        success: 'Updated successfully!',
        error: 'Failed to update. Please try again.'
      },
      delete: {
        loading: 'Deleting...',
        success: 'Deleted successfully!',
        error: 'Failed to delete. Please try again.'
      },
      fetch: {
        loading: 'Loading...',
        success: 'Data loaded successfully!',
        error: 'Failed to load data. Please try again.'
      },
      generic: {
        loading: 'Processing...',
        success: 'Operation completed successfully!',
        error: 'Operation failed. Please try again.'
      }
    };
    return messages[operation];
  };

  const executeWithFeedback = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: CrudOperationOptions = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      const {
        loadingMessage = 'Processing...',
        loadingType = 'button',
        successMessage = 'Operation completed successfully!',
        errorMessage = 'Operation failed. Please try again.',
        onSuccess,
        onError
      } = options;

      try {
        startLoading(loadingMessage, loadingType);
        const result = await operation(...args);
        
        stopLoading();
        showSuccess(successMessage);
        onSuccess?.();
        
        return result;
      } catch (error) {
        stopLoading();
        showError(errorMessage);
        onError?.(error);
        console.error('CRUD operation failed:', error);
        return undefined;
      }
    };
  }, [startLoading, stopLoading, showSuccess, showError]);

  const createWithFeedback = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: CrudOperationOptions = {}
  ) => {
    const defaultMessages = getDefaultMessages('create');
    return executeWithFeedback(operation, {
      loadingMessage: defaultMessages.loading,
      successMessage: defaultMessages.success,
      errorMessage: defaultMessages.error,
      loadingType: 'button',
      ...options
    });
  }, [executeWithFeedback]);

  const updateWithFeedback = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: CrudOperationOptions = {}
  ) => {
    const defaultMessages = getDefaultMessages('update');
    return executeWithFeedback(operation, {
      loadingMessage: defaultMessages.loading,
      successMessage: defaultMessages.success,
      errorMessage: defaultMessages.error,
      loadingType: 'button',
      ...options
    });
  }, [executeWithFeedback]);

  const deleteWithFeedback = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: CrudOperationOptions = {}
  ) => {
    const defaultMessages = getDefaultMessages('delete');
    return executeWithFeedback(operation, {
      loadingMessage: defaultMessages.loading,
      successMessage: defaultMessages.success,
      errorMessage: defaultMessages.error,
      loadingType: 'button',
      ...options
    });
  }, [executeWithFeedback]);

  const fetchWithFeedback = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    options: CrudOperationOptions = {}
  ) => {
    const defaultMessages = getDefaultMessages('fetch');
    return executeWithFeedback(operation, {
      loadingMessage: defaultMessages.loading,
      successMessage: defaultMessages.success,
      errorMessage: defaultMessages.error,
      loadingType: 'skeleton',
      ...options
    });
  }, [executeWithFeedback]);

  return {
    loading,
    executeWithFeedback,
    createWithFeedback,
    updateWithFeedback,
    deleteWithFeedback,
    fetchWithFeedback
  };
};

export default useCrudFeedback;
