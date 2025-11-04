import React, { useState, useEffect } from 'react';
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
  TablePagination,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Delete,
  Search,
  PersonAdd,
  PersonRemove,
  Visibility,
} from '@mui/icons-material';
import { useGetUnifiedStaffDataQuery, useGetStaffDropdownDataQuery } from '../../store/api/unifiedApis';
import { useDeleteUserMutation, useActivateUserMutation, useDeactivateUserMutation, useCreateUserMutation, useUpdateUserMutation } from '../../store/api/usersApi';
import type { User, CreateUserForm } from '../../types';
import KebabMenu from '../../components/common/KebabMenu';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useHighlight } from '../../hooks/useHighlight';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';

const UsersPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    team_id: undefined,
  });
  const { getHighlightStyles } = useHighlight();

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]);

  
  // Use unified API for better performance
  const { data: unifiedData, isLoading, error } = useGetUnifiedStaffDataQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: debouncedSearchTerm || undefined,
  });

  // Get dropdown data separately (cached for 10 minutes)
  const { data: dropdownData } = useGetStaffDropdownDataQuery(undefined, {
    skip: false
  });

  const [deleteUser] = useDeleteUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();

  // Initialize feedback hooks
  const { createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();

  const users = unifiedData?.staff_data || [];
  const teams = dropdownData?.teams || [];
  const filteredUsers = users; // Already filtered by API

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        team_id: user.team_id,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        team_id: undefined,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleInputChange = (field: keyof CreateUserForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  // Create user with feedback
  const handleCreateUser = createWithFeedback(
    async (userData: CreateUserForm) => {
      const result = await createUser(userData).unwrap();
      handleCloseDialog();
      return result;
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
    async (userData: CreateUserForm) => {
      if (!editingUser) throw new Error('No user selected for update');
      const result = await updateUser({ id: editingUser.id, data: userData }).unwrap();
      handleCloseDialog();
      return result;
    },
    {
      loadingMessage: 'Updating user...',
      successMessage: 'User updated successfully!',
      errorMessage: 'Failed to update user. Please try again.',
      loadingType: 'button'
    }
  );

  const handleSubmit = async () => {
    if (editingUser) {
      await handleUpdateUser(formData);
    } else {
      await handleCreateUser(formData);
    }
  };

  // Delete user with feedback
  const handleDeleteUser = deleteWithFeedback(
    async (userId: number) => {
      await deleteUser(userId).unwrap();
    },
    {
      loadingMessage: 'Deleting user...',
      successMessage: 'User deleted successfully!',
      errorMessage: 'Failed to delete user. Please try again.',
      loadingType: 'button'
    }
  );

  const handleDelete = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await handleDeleteUser(userId);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.is_active) {
        await deactivateUser(user.id).unwrap();
      } else {
        await activateUser(user.id).unwrap();
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };


  // Show skeleton loading state while data is being fetched
  if (isLoading) {
    return <SkeletonLoader variant="table" count={10} showHeader={true} showFilters={true} />;
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Failed to load users. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <People sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 'auto' }}
          >
            Add User
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow 
                  key={user.id} 
                  hover
                  sx={{
                    ...getHighlightStyles(`user-${user.id}`),
                  }}
                >
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.team_id ? `Team ${user.team_id}` : 'No Team'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Active' : 'Inactive'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <KebabMenu
                      actions={[
                        {
                          label: 'View Details',
                          icon: <Visibility />,
                          onClick: () => {
                            // Handle view details
                            console.log('View user details:', user.id);
                          },
                        },
                        {
                          label: 'Edit User',
                          icon: <Edit />,
                          onClick: () => handleOpenDialog(user),
                        },
                        {
                          label: user.is_active ? 'Deactivate' : 'Activate',
                          icon: user.is_active ? <PersonRemove /> : <PersonAdd />,
                          onClick: () => handleToggleActive(user),
                          color: user.is_active ? 'error' : 'success',
                          divider: true,
                        },
                        {
                          label: 'Delete User',
                          icon: <Delete />,
                          onClick: () => handleDelete(user.id),
                          color: 'error',
                        },
                      ]}
                      tooltip="User actions"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={unifiedData?.total_count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Create/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              fullWidth
              required={!editingUser}
            />
            <FormControl fullWidth>
              <InputLabel>Team</InputLabel>
              <Select
                value={formData.team_id || ''}
                label="Team"
                onChange={handleInputChange('team_id')}
              >
                <MenuItem value="">No Team</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
