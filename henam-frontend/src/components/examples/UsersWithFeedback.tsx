import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Email,
} from '@mui/icons-material';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';
import { useFeedback } from '../../contexts/FeedbackContext';
import LoadingButton from '../common/LoadingButton';
import type { User } from '../../types';

// Mock API functions
const mockApi = {
  createUser: async (userData: any): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      id: Date.now(),
      ...userData,
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
  
  updateUser: async (id: number, updates: Partial<User>): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id,
      name: 'Updated User',
      email: 'updated@example.com',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
  },
  
  deleteUser: async (_id: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 800));
  },
  
  toggleUserStatus: async (id: number, isActive: boolean): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id,
      name: 'User',
      email: 'user@example.com',
      is_active: isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};

/**
 * Example Users component demonstrating the global CRUD feedback system
 */
const UsersWithFeedback: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { withGlobalLoading } = useFeedback();

  // Create user with feedback
  const handleCreateUser = createWithFeedback(
    async (userData: any) => {
      const newUser = await mockApi.createUser(userData);
      setUsers(prev => [...prev, newUser]);
      setFormData({ name: '', email: '' });
      setOpenDialog(false);
      return newUser;
    },
    {
      loadingMessage: 'Creating user...',
      successMessage: 'User created successfully!',
      errorMessage: 'Failed to create user. Please try again.',
      loadingType: 'button'
    }
  );

  // Update user with feedback
  const handleUpdateUser = updateWithFeedback(
    async (id: number, updates: Partial<User>) => {
      const updatedUser = await mockApi.updateUser(id, updates);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
      setEditingUser(null);
      return updatedUser;
    },
    {
      loadingMessage: 'Updating user...',
      successMessage: 'User updated successfully!',
      errorMessage: 'Failed to update user. Please try again.',
      loadingType: 'button'
    }
  );

  // Delete user with feedback
  const handleDeleteUser = deleteWithFeedback(
    async (id: number) => {
      await mockApi.deleteUser(id);
      setUsers(prev => prev.filter(user => user.id !== id));
    },
    {
      loadingMessage: 'Deleting user...',
      successMessage: 'User deleted successfully!',
      errorMessage: 'Failed to delete user. Please try again.',
      loadingType: 'button'
    }
  );

  // Toggle user status with global loading
  const handleToggleStatus = withGlobalLoading(
    'user-status-toggle',
    async (id: number, isActive: boolean) => {
      const updatedUser = await mockApi.toggleUserStatus(id, isActive);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
    },
    {
      loadingMessage: 'Updating status...',
      loadingType: 'button',
      successMessage: 'User status updated successfully!',
      errorMessage: 'Failed to update user status. Please try again.'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      handleUpdateUser(editingUser.id, formData);
    } else {
      handleCreateUser(formData);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
    });
    setOpenDialog(true);
  };


  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Users Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingUser(null);
            setFormData({ name: '', email: '' });
            setOpenDialog(true);
          }}
          sx={{
            background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8e24aa 0%, #6a1b9a 100%)',
            }
          }}
        >
          Add User
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    User ID: {user.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={getStatusColor(user.is_active) as any}
                    size="small"
                    onClick={() => handleToggleStatus(user.id, !user.is_active)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEdit(user)}
                      disabled={loading.isLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={loading.isLoading}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={loading.isLoading}
              loadingText={editingUser ? 'Updating...' : 'Creating...'}
              sx={{
                background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #8e24aa 0%, #6a1b9a 100%)',
                }
              }}
            >
              {editingUser ? 'Update User' : 'Create User'}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UsersWithFeedback;
