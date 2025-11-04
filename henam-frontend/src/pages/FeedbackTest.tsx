import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';
import { useCrudFeedback } from '../hooks/useCrudFeedback';
import { useFeedback } from '../contexts/FeedbackContext';
import LoadingButton from '../components/common/LoadingButton';
import LoadingOverlay from '../components/common/LoadingOverlay';

/**
 * Test page to demonstrate the global CRUD feedback system
 * This page shows all the different types of feedback in action
 */
const FeedbackTest: React.FC = () => {
  const [testData, setTestData] = useState<any[]>([]);
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { showSuccess, showError, showWarning, showInfo, withGlobalLoading } = useFeedback();

  // Mock API functions with delays
  const mockApi = {
    create: async (data: any) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { id: Date.now(), ...data, created_at: new Date().toISOString() };
    },
    update: async (id: number, data: any) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { id, ...data, updated_at: new Date().toISOString() };
    },
    delete: async (_id: number) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    globalOperation: async (data: any) => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { result: 'Global operation completed', ...data };
    }
  };

  // Create with feedback
  const handleCreate = createWithFeedback(
    async (data: any) => {
      const result = await mockApi.create(data);
      setTestData(prev => [...prev, result]);
      return result;
    },
    {
      loadingMessage: 'Creating item...',
      successMessage: 'Item created successfully!',
      errorMessage: 'Failed to create item. Please try again.',
      loadingType: 'button'
    }
  );

  // Update with feedback
  const handleUpdate = updateWithFeedback(
    async (id: number, data: any) => {
      const result = await mockApi.update(id, data);
      setTestData(prev => prev.map(item => item.id === id ? result : item));
      return result;
    },
    {
      loadingMessage: 'Updating item...',
      successMessage: 'Item updated successfully!',
      errorMessage: 'Failed to update item. Please try again.',
      loadingType: 'button'
    }
  );

  // Delete with feedback
  const handleDelete = deleteWithFeedback(
    async (id: number) => {
      await mockApi.delete(id);
      setTestData(prev => prev.filter(item => item.id !== id));
    },
    {
      loadingMessage: 'Deleting item...',
      successMessage: 'Item deleted successfully!',
      errorMessage: 'Failed to delete item. Please try again.',
      loadingType: 'button'
    }
  );

  // Global operation with overlay loading
  const handleGlobalOperation = withGlobalLoading(
    'global-test',
    async (data: any) => {
      const result = await mockApi.globalOperation(data);
      return result;
    },
    {
      loadingMessage: 'Processing global operation...',
      loadingType: 'overlay',
      successMessage: 'Global operation completed successfully!',
      errorMessage: 'Global operation failed. Please try again.'
    }
  );

  // Toast demonstrations
  const showToastSuccess = () => showSuccess('This is a success message!');
  const showToastError = () => showError('This is an error message!');
  const showToastWarning = () => showWarning('This is a warning message!');
  const showToastInfo = () => showInfo('This is an info message!');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 600 }}>
        CRUD Feedback System Test
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This page demonstrates the global CRUD feedback system. Try the buttons below to see loading states and success/error messages.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* CRUD Operations */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                CRUD Operations
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <LoadingButton
                  variant="contained"
                  startIcon={<Add />}
                  loading={loading.isLoading}
                  loadingText="Creating..."
                  onClick={() => handleCreate({ 
                    name: `Test Item ${testData.length + 1}`, 
                    description: 'This is a test item' 
                  })}
                  sx={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45a049 0%, #2e7d32 100%)',
                    }
                  }}
                >
                  Create Item
                </LoadingButton>

                {testData.length > 0 && (
                  <LoadingButton
                    variant="contained"
                    startIcon={<Edit />}
                    loading={loading.isLoading}
                    loadingText="Updating..."
                    onClick={() => handleUpdate(testData[0].id, { 
                      name: `Updated Item ${Date.now()}`, 
                      description: 'This item has been updated' 
                    })}
                    sx={{
                      background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      }
                    }}
                  >
                    Update First Item
                  </LoadingButton>
                )}

                {testData.length > 0 && (
                  <LoadingButton
                    variant="contained"
                    color="error"
                    startIcon={<Delete />}
                    loading={loading.isLoading}
                    loadingText="Deleting..."
                    onClick={() => handleDelete(testData[0].id)}
                  >
                    Delete First Item
                  </LoadingButton>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Toast Messages */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Toast Messages
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<CheckCircle />}
                  onClick={showToastSuccess}
                  sx={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45a049 0%, #2e7d32 100%)',
                    }
                  }}
                >
                  Show Success Toast
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Error />}
                  onClick={showToastError}
                >
                  Show Error Toast
                </Button>

                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<Warning />}
                  onClick={showToastWarning}
                >
                  Show Warning Toast
                </Button>

                <Button
                  variant="contained"
                  color="info"
                  startIcon={<Info />}
                  onClick={showToastInfo}
                >
                  Show Info Toast
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Global Operations */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Global Operations (Overlay Loading)
              </Typography>
              
              <LoadingButton
                variant="contained"
                size="large"
                loading={loading.isLoading}
                loadingText="Processing..."
                onClick={() => handleGlobalOperation({ 
                  operation: 'test', 
                  timestamp: new Date().toISOString() 
                })}
                sx={{
                  background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #8e24aa 0%, #6a1b9a 100%)',
                  }
                }}
              >
                Run Global Operation
              </LoadingButton>
            </CardContent>
          </Card>
        </Box>

        {/* Test Data Display */}
        {testData.length > 0 && (
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Test Data ({testData.length} items)
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {testData.map((item) => (
                    <Paper key={item.id} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">
                        <strong>{item.name}</strong> - {item.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {item.id} | Created: {new Date(item.created_at).toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* Loading Overlay */}
      <LoadingOverlay
        open={loading.isLoading && loading.loadingType === 'overlay'}
        message={loading.loadingMessage}
      />
    </Box>
  );
};

export default FeedbackTest;
