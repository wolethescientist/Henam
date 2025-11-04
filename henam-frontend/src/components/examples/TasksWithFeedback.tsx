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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
} from '@mui/icons-material';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';
import { useFeedback } from '../../contexts/FeedbackContext';
import LoadingButton from '../common/LoadingButton';
import LoadingOverlay from '../common/LoadingOverlay';
import type { Task, CreateTaskForm } from '../../types';

// Mock API functions - replace with actual API calls
const mockApi = {
  createTask: async (task: CreateTaskForm): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    return {
      id: Date.now(),
      ...task,
      assigned_to_id: task.assigned_to_id || 1,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
  
  updateTask: async (id: number, updates: Partial<Task>): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id,
      title: 'Updated Task',
      description: 'Updated description',
      priority: 'high',
      status: 'in_progress',
      deadline: new Date().toISOString(),
      assigned_to_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
  },
  
  deleteTask: async (_id: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 800));
  },
  
  updateTaskStatus: async (id: number, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id,
      title: 'Task',
      description: 'Description',
      priority: 'medium',
      status,
      deadline: new Date().toISOString(),
      assigned_to_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};

/**
 * Example Tasks component demonstrating the global CRUD feedback system
 * Shows how to integrate loading states and toast notifications
 */
const TasksWithFeedback: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: 'Sample Task 1',
      description: 'This is a sample task',
      priority: 'high',
      status: 'pending',
      deadline: new Date().toISOString(),
      assigned_to_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<CreateTaskForm>({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
  });

  // Use the CRUD feedback hook
  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  
  // Use global feedback context for additional operations
  const { withGlobalLoading } = useFeedback();

  // Create task with feedback
  const handleCreateTask = createWithFeedback(
    async (taskData: CreateTaskForm) => {
      const newTask = await mockApi.createTask(taskData);
      setTasks(prev => [...prev, newTask]);
      setFormData({ title: '', description: '', priority: 'medium', deadline: '' });
      setOpenDialog(false);
      return newTask;
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
    async (id: number, updates: Partial<Task>) => {
      const updatedTask = await mockApi.updateTask(id, updates);
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
      setEditingTask(null);
      return updatedTask;
    },
    {
      loadingMessage: 'Updating task...',
      successMessage: 'Task updated successfully!',
      errorMessage: 'Failed to update task. Please try again.',
      loadingType: 'button'
    }
  );

  // Delete task with feedback
  const handleDeleteTask = deleteWithFeedback(
    async (id: number) => {
      await mockApi.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    },
    {
      loadingMessage: 'Deleting task...',
      successMessage: 'Task deleted successfully!',
      errorMessage: 'Failed to delete task. Please try again.',
      loadingType: 'button'
    }
  );

  // Update task status with global loading
  const handleStatusUpdate = withGlobalLoading(
    'task-status-update',
    async (id: number, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
      const updatedTask = await mockApi.updateTaskStatus(id, status);
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
    },
    {
      loadingMessage: 'Updating status...',
      loadingType: 'button',
      successMessage: 'Status updated successfully!',
      errorMessage: 'Failed to update status. Please try again.'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      handleUpdateTask(editingTask.id, formData);
    } else {
      handleCreateTask(formData);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      deadline: task.deadline,
    });
    setOpenDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Tasks Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingTask(null);
            setFormData({ title: '', description: '', priority: 'medium', deadline: '' });
            setOpenDialog(true);
          }}
          sx={{
            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #45a049 0%, #2e7d32 100%)',
            }
          }}
        >
          Add Task
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tasks..."
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

      {/* Tasks Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {task.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status) as any}
                    size="small"
                    onClick={() => {
                      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                      handleStatusUpdate(task.id, newStatus);
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.priority}
                    color={getPriorityColor(task.priority) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(task.deadline).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEdit(task)}
                      disabled={loading.isLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteTask(task.id)}
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
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Task Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Due Date"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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
              loadingText={editingTask ? 'Updating...' : 'Creating...'}
              sx={{
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #45a049 0%, #2e7d32 100%)',
                }
              }}
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      {/* Loading Overlay for global operations */}
      <LoadingOverlay
        open={loading.isLoading && loading.loadingType === 'overlay'}
        message={loading.loadingMessage}
      />
    </Box>
  );
};

export default TasksWithFeedback;
