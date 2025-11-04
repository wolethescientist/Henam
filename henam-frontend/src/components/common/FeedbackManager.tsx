import React from 'react';
import { Box } from '@mui/material';
import { useFeedback } from '../../contexts/FeedbackContext';
import LoadingOverlay from './LoadingOverlay';
import EnhancedSnackbar from './EnhancedSnackbar';
import SkeletonLoader from './SkeletonLoader';

interface FeedbackManagerProps {
  children: React.ReactNode;
  showSkeletonFor?: string[];
}

/**
 * Centralized feedback manager that handles all loading states and notifications
 * Renders appropriate loading indicators and toast notifications
 */
const FeedbackManager: React.FC<FeedbackManagerProps> = ({ 
  children, 
  showSkeletonFor = [] 
}) => {
  const { globalLoading } = useFeedback();

  // Check if any global loading states are active
  const hasActiveLoading = Object.values(globalLoading).some(loading => loading.isLoading);
  
  // Get the primary loading state (first active one)
  const primaryLoading = Object.values(globalLoading).find(loading => loading.isLoading);

  // Check if we should show skeleton for any specific keys
  const shouldShowSkeleton = showSkeletonFor.some(key => 
    globalLoading[key]?.isLoading && globalLoading[key]?.loadingType === 'skeleton'
  );

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Main content */}
      {shouldShowSkeleton ? (
        <SkeletonLoader 
          variant="dashboard" 
          count={5}
          showHeader={true}
          showFilters={true}
          showStats={true}
        />
      ) : (
        children
      )}

      {/* Loading overlay for button/overlay loading states */}
      {hasActiveLoading && primaryLoading?.loadingType !== 'skeleton' && (
        <LoadingOverlay
          open={primaryLoading?.loadingType === 'overlay'}
          message={primaryLoading?.loadingMessage}
          variant="spinner"
        />
      )}

      {/* Enhanced snackbar for notifications */}
      <EnhancedSnackbar />
    </Box>
  );
};

export default FeedbackManager;
