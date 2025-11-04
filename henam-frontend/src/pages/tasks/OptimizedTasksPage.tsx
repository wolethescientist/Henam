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
  Avatar,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material';
import {
  Assignment,
  Add,
  Edit,
  Delete,
  Search,
  Schedule,
  Flag,
  CheckCircle,
  RadioButtonUnchecked,
  Info,
} from '@mui/icons-material';
import { useDeleteTaskMutation, useUpdateTaskStatusMutation, useCreateTaskMutation, useUpdateTaskMutation, useGetMyTasksQuery, useGetTasksAssignedByMeQuery } from '../../store/api/tasksApi';
import { useGetUsersQuery } from '../../store/api/usersApi';
import type { Task, CreateTaskForm } from '../../types';
import KebabMenu from '../../components/common/KebabMenu';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import LoadingButton from '../../components/common/LoadingButton';
import { useHighlight } from '../../hooks/useHighlight';
import { useAuthErrorHandlerForQuery } from '../../hooks/useAuthErrorHandler';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useAppSelector } from '../../hooks/redux';

const OptimizedTasksPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [staffFilter, setStaffFilter] = useState<number | ''>('');
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newProgress, setNewProgress] = useState<number>(0);
  const [formData, setFormData] = useState<CreateTaskForm>({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    assigned_to_id: undefined,
    job_id: undefined,
  });
  const { getHighlightStyles } = useHighlight();
  
  // Get current user
  const { user: currentUser } = useAppSelector((state) => state.auth);
  
  // Initialize feedback hooks
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { withGlobalLoading } = useFeedback();

  // Debounce search term to avoid excessive API calls - reduced delay for instant feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150); // Reduced to 150ms for more responsive filtering

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, priorityFilter, staffFilter, debouncedSearchTerm, viewMode]);

  // Build query parameters
  const buildQueryParams = () => ({
    page: page + 1,
    limit: rowsPerPage,
    ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
    ...(statusFilter && { status_filter: statusFilter }),
    ...(priorityFilter && { priority_filter: priorityFilter }),
    ...(staffFilter && { staff_filter: staffFilter }),
  });

  // API calls based on view mode with fresh data - ensure instant filtering
  const { data: assignedByMeData, isLoading: allTasksLoading, error: allTasksError } = useGetTasksAssignedByMeQuery(buildQueryParams(), {
    skip: viewMode !== 'all',
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  const { data: myTasksData, isLoading: myTasksLoading, error: myTasksError } = useGetMyTasksQuery(buildQueryParams(), {
    skip: viewMode !== 'my',
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  // Handle authentication errors automatically
  useAuthErrorHandlerForQuery(viewMode === 'all' ? allTasksError : myTasksError);

  const [deleteTask] = useDeleteTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  // Get users for dropdowns
  const { data: usersResponse } = useGetUsersQuery({});
  const users = usersResponse || [];

  // Determine current data based on view mode
  const isLoading = viewMode === 'all' ? allTasksLoading : myTasksLoading;
  const error = viewMode === 'all' ? allTasksError : myTasksError;
  
  const tasks = viewMode === 'all' ? (assignedByMeData?.items || []) : (myTasksData?.items || []);
  const pagination = viewMode === 'all' ? assignedByMeData : myTasksData;

  // Single user system - all users can be assigned tasks
  const assignableUsers = users;

  const filteredTasks = tasks; // Already filtered by API

  // Helper function to check if current user can update a task
  const canUpdateTask = (task: Task) => {
    return currentUser && task.assigned_to_id === currentUser.id;
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newViewMode: 'all' | 'my' | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        assigned_to_id: task.assigned_to_id || undefined,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        assigned_to_id: undefined,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleInputChange = (field: keyof CreateTaskForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'assigned_to_id' && value === '' ? undefined : value,
    }));
  };

  // Create task with feedback
  const handleCreateTask = createWithFeedback(
    async (taskData: CreateTaskForm) => {
      const submitData = {
        ...taskData,
        deadline: new Date(taskData.deadline).toISOString(),
      };
      const result = await createTask(submitData).unwrap();
      handleCloseDialog();
      return result;
    },
    {
      loadingMessage: 'Creating task...',
      successMessage: 'Task created successfully!',
      errorMessage: 'Failed to create task. Please try again.',
      loadingType: 'button'
    }
  );

  // Update task with feedback
  const handleUpdateTask = updateWithFeedback(
    async (id: number, taskData: CreateTaskForm) => {
      const submitData = {
        ...taskData,
        deadline: new Date(taskData.deadline).toISOString(),
      };
      const result = await updateTask({
        id,
        data: submitData
      }).unwrap();
      handleCloseDialog();
      return result;
    },
    {
      loadingMessage: 'Updating task...',
      successMessage: 'Task updated successfully!',
      errorMessage: 'Failed to update task. Please try again.',
      loadingType: 'button'
    }
  );

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      console.error('Task title is required');
      return;
    }
    
    if (!formData.deadline) {
      console.error('Task deadline is required');
      return;
    }
    
    if (editingTask) {
      await handleUpdateTask(editingTask.id, formData);
    } else {
      await handleCreateTask(formData);
    }
  };

  // Delete task with feedback
  const handleDeleteTask = deleteWithFeedback(
    async (taskId: number) => {
      await deleteTask(taskId).unwrap();
    },
    {
      loadingMessage: 'Deleting task...',
      successMessage: 'Task deleted successfully!',
      errorMessage: 'Failed to delete task. Please try again.',
      loadingType: 'button'
    }
  );

  const handleDelete = async (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await handleDeleteTask(taskId);
    }
  };

  const handleOpenStatusDialog = (task: Task) => {
    if (!canUpdateTask(task)) {
      console.warn('User does not have permission to update this task');
      return;
    }
    setSelectedTask(task);
    setNewStatus(task.status || 'pending');
    setStatusDialogOpen(true);
  };

  const handleOpenProgressDialog = (task: Task) => {
    if (!canUpdateTask(task)) {
      console.warn('User does not have permission to update this task');
      return;
    }
    setSelectedTask(task);
    // Extract progress from description if it exists, otherwise default to 0
    const progressMatch = task.description?.match(/Progress: (\d+)%/);
    const currentProgress = progressMatch ? parseInt(progressMatch[1]) : 0;
    setNewProgress(currentProgress);
    setProgressDialogOpen(true);
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setViewDialogOpen(true);
  };

  // Update task status with global loading
  const handleUpdateTaskStatus = withGlobalLoading(
    'task-status-update',
    async (taskId: number, status: string) => {
      await updateTaskStatus({
        id: taskId,
        status: status
      }).unwrap();
    },
    {
      loadingMessage: 'Updating status...',
      loadingType: 'button',
      successMessage: 'Status updated successfully!',
      errorMessage: 'Failed to update status. Please try again.'
    }
  );

  const handleUpdateStatus = async () => {
    if (selectedTask) {
      await handleUpdateTaskStatus(selectedTask.id, newStatus);
      setStatusDialogOpen(false);
      setSelectedTask(null);
    }
  };

  // Update task progress with global loading
  const handleUpdateTaskProgress = withGlobalLoading(
    'task-progress-update',
    async (taskId: number, progress: number) => {
      await updateTask({
        id: taskId,
        data: { progress }
      }).unwrap();
    },
    {
      loadingMessage: 'Updating progress...',
      loadingType: 'button',
      successMessage: 'Progress updated successfully!',
      errorMessage: 'Failed to update progress. Please try again.'
    }
  );

  const handleUpdateProgress = async () => {
    if (selectedTask) {
      await handleUpdateTaskProgress(selectedTask.id, newProgress);
      setProgressDialogOpen(false);
      setSelectedTask(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return priority;
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (isLoading) {
    return <SkeletonLoader variant="tasks" count={10} />;
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Failed to load tasks. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        mb={3}
        gap={{ xs: 2, sm: 0 }}
      >
        <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>Tasks Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          size="medium"
          sx={{ 
            maxWidth: { xs: '100%', sm: 'auto' },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          Add Task
        </Button>
      </Box>

      {/* View Mode Toggle */}
      <Box display="flex" justifyContent="center" mb={3}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
          sx={{
            '& .MuiToggleButton-root': {
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            },
          }}
        >
          <ToggleButton value="all" aria-label="tasks assigned by me">
            Tasks I Assigned
          </ToggleButton>
          <ToggleButton value="my" aria-label="tasks assigned to me">
            My Tasks
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Search and Filters */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        flexWrap="wrap" 
        gap={{ xs: 2, sm: 3 }} 
        mb={3}
      >
        <Box flex="1" minWidth={{ xs: '100%', sm: '250px', md: '300px' }}>
          <TextField
            fullWidth
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box minWidth={{ xs: '100%', sm: '150px', md: '200px' }}>
          <FormControl fullWidth size="medium">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0); // Reset to first page when filter changes
              }}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box minWidth={{ xs: '100%', sm: '150px', md: '200px' }}>
          <FormControl fullWidth size="medium">
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(0); // Reset to first page when filter changes
              }}
              label="Priority"
            >
              <MenuItem value="">All Priorities</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box minWidth={{ xs: '100%', sm: '150px', md: '200px' }}>
          <FormControl fullWidth size="medium">
            <InputLabel>Staff Member</InputLabel>
            <Select
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value as number | '');
                setPage(0); // Reset to first page when filter changes
              }}
              label="Staff Member"
            >
              <MenuItem value="">All Staff</MenuItem>
              {assignableUsers.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box minWidth={{ xs: '100%', sm: '120px', md: '150px' }}>
          <Button
            variant="outlined"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPriorityFilter('');
              setStaffFilter('');
              setPage(0);
            }}
            disabled={!searchTerm && !statusFilter && !priorityFilter && !staffFilter}
            sx={{ height: '56px', minWidth: '120px' }}
          >
            Clear Filters
          </Button>
        </Box>
        <Box minWidth={{ xs: '100%', sm: '120px', md: '150px' }}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Typography variant="h6" color="primary">
                {pagination?.total_count || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {viewMode === 'all' ? 'Tasks I Assigned' : 'My Tasks'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tasks Table */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto', flex: 1 }}>
          <Table sx={{ minWidth: { xs: 600, sm: 650 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Task</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assigned To</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Deadline</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow 
                  key={task.id}
                  sx={{
                    ...getHighlightStyles(`task-${task.id}`),
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ 
                        mr: { xs: 1, sm: 2 }, 
                        bgcolor: 'primary.main',
                        width: { xs: 32, sm: 40 },
                        height: { xs: 32, sm: 40 }
                      }}>
                        <Assignment sx={{ fontSize: { xs: 16, sm: 20 } }} />
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography 
                          variant="subtitle1"
                          sx={{ 
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: { xs: 'nowrap', sm: 'normal' },
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}
                        >
                          {task.title}
                        </Typography>
                        {task.description && (
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{ 
                              display: { xs: 'none', sm: 'block' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {task.description}
                          </Typography>
                        )}
                        {/* Mobile-only info */}
                        <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                          {task.assigned_to && (
                            <Typography variant="caption" color="textSecondary">
                              Assigned: {task.assigned_to.name}
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary" display="block">
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {task.assigned_to ? (
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {task.assigned_to.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {task.assigned_to.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {task.assigned_to.email}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPriorityLabel(task.priority || 'medium')}
                      color={getPriorityColor(task.priority || 'medium') as any}
                      size="small"
                      icon={<Flag />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(task.status || 'pending')}
                      color={getStatusColor(task.status || 'pending') as any}
                      size="small"
                      icon={task.status === 'completed' ? <CheckCircle /> : <RadioButtonUnchecked />}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box display="flex" alignItems="center">
                      <Schedule sx={{ mr: 1, fontSize: 16 }} />
                      <Typography 
                        variant="body2"
                        color={isOverdue(task.deadline) ? 'error' : 'textPrimary'}
                      >
                        {new Date(task.deadline).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <KebabMenu
                      actions={[
                        ...(canUpdateTask(task) ? [
                          {
                            label: 'Update Status',
                            icon: <CheckCircle />,
                            onClick: () => handleOpenStatusDialog(task),
                          },
                          {
                            label: 'Update Progress',
                            icon: <Schedule />,
                            onClick: () => handleOpenProgressDialog(task),
                          }
                        ] : [
                          {
                            label: 'View Task',
                            icon: <Info />,
                            onClick: () => handleViewTask(task),
                          }
                        ]),
                        {
                          label: 'Edit Task',
                          icon: <Edit />,
                          onClick: () => handleOpenDialog(task),
                        },
                        {
                          label: 'Delete Task',
                          icon: <Delete />,
                          onClick: () => handleDelete(task.id),
                          color: 'error',
                          divider: true,
                        },
                      ]}
                      tooltip={canUpdateTask(task) ? "Task actions" : "View-only actions"}
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
          count={pagination?.total_count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Create/Edit Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Task Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleInputChange('priority')}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={formData.assigned_to_id || ''}
                onChange={handleInputChange('assigned_to_id')}
                label="Assigned To"
              >
                <MenuItem value="">Unassigned</MenuItem>
                {assignableUsers.map((user: any) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Deadline"
              type="date"
              value={formData.deadline}
              onChange={handleInputChange('deadline')}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <LoadingButton
            onClick={handleSubmit}
            variant="contained"
            loading={loading.isLoading}
            loadingText={editingTask ? 'Updating...' : 'Creating...'}
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #45a049 0%, #2e7d32 100%)',
              }
            }}
          >
            {editingTask ? 'Update' : 'Create'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Task Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" gutterBottom>
              {selectedTask?.title}
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            onClick={handleUpdateStatus}
            variant="contained"
            loading={loading.isLoading}
            loadingText="Updating..."
            sx={{
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              }
            }}
          >
            Update Status
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog open={progressDialogOpen} onClose={() => setProgressDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" gutterBottom>
              {selectedTask?.title}
            </Typography>
            <TextField
              fullWidth
              label="Progress (%)"
              type="number"
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              margin="normal"
              inputProps={{ min: 0, max: 100 }}
            />
            <LinearProgress
              variant="determinate"
              value={newProgress}
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            onClick={handleUpdateProgress}
            variant="contained"
            loading={loading.isLoading}
            loadingText="Updating..."
            sx={{
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
              }
            }}
          >
            Update Progress
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* View Task Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Task Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="h6" gutterBottom>
              {selectedTask?.title}
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedTask?.description || 'No description provided'}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Priority
                </Typography>
                <Chip
                  label={getPriorityLabel(selectedTask?.priority || 'medium')}
                  color={getPriorityColor(selectedTask?.priority || 'medium') as any}
                  size="small"
                  icon={<Flag />}
                />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={getStatusLabel(selectedTask?.status || 'pending')}
                  color={getStatusColor(selectedTask?.status || 'pending') as any}
                  size="small"
                  icon={selectedTask?.status === 'completed' ? <CheckCircle /> : <RadioButtonUnchecked />}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Assigned To
              </Typography>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                  {selectedTask?.assigned_to?.name?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2">
                    {selectedTask?.assigned_to?.name || 'Unassigned'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {selectedTask?.assigned_to?.email}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Deadline
                </Typography>
                <Box display="flex" alignItems="center">
                  <Schedule sx={{ mr: 1, fontSize: 16 }} />
                  <Typography 
                    variant="body2"
                    color={selectedTask?.deadline && isOverdue(selectedTask.deadline) ? 'error' : 'textPrimary'}
                  >
                    {selectedTask?.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'No deadline'}
                  </Typography>
                </Box>
              </Box>
              
            </Box>

            {selectedTask?.description && selectedTask.description.includes('Progress:') && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Progress
                </Typography>
                {(() => {
                  const progressMatch = selectedTask.description.match(/Progress: (\d+)%/);
                  const progress = progressMatch ? parseInt(progressMatch[1]) : 0;
                  return (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        {progress}% Complete
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body2">
                  {selectedTask?.created_at ? new Date(selectedTask.created_at).toLocaleString() : 'Unknown'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {selectedTask?.updated_at ? new Date(selectedTask.updated_at).toLocaleString() : 'Unknown'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OptimizedTasksPage;
