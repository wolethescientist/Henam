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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
} from '@mui/icons-material';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';
import { useFeedback } from '../../contexts/FeedbackContext';
import LoadingButton from '../common/LoadingButton';
import type { Job } from '../../types';

// Mock API functions
const mockApi = {
  createJob: async (jobData: any): Promise<Job> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return {
      id: Date.now(),
      ...jobData,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
  
  updateJob: async (id: number, updates: Partial<Job>): Promise<Job> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id,
      title: 'Updated Job',
      client: 'Updated Client',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      progress: 50,
      status: 'in_progress',
      team_id: 1,
      supervisor_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
  },
  
  deleteJob: async (_id: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 800));
  },
  
  assignJob: async (id: number, _userId: number): Promise<Job> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id,
      title: 'Job',
      client: 'Client',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      progress: 0,
      status: 'not_started',
      team_id: 1,
      supervisor_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};

/**
 * Example Jobs component demonstrating the global CRUD feedback system
 */
const JobsWithFeedback: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1,
      title: 'Sample Job 1',
      client: 'Sample Client',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      progress: 0,
      status: 'not_started',
      team_id: 1,
      supervisor_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    start_date: '',
    end_date: '',
  });

  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { withGlobalLoading } = useFeedback();

  // Create job with feedback
  const handleCreateJob = createWithFeedback(
    async (jobData: any) => {
      const newJob = await mockApi.createJob(jobData);
      setJobs(prev => [...prev, newJob]);
      setFormData({ title: '', client: '', start_date: '', end_date: '' });
      setOpenDialog(false);
      return newJob;
    },
    {
      loadingMessage: 'Creating job...',
      successMessage: 'Job created successfully!',
      errorMessage: 'Failed to create job. Please try again.',
      loadingType: 'button'
    }
  );

  // Update job with feedback
  const handleUpdateJob = updateWithFeedback(
    async (id: number, updates: Partial<Job>) => {
      const updatedJob = await mockApi.updateJob(id, updates);
      setJobs(prev => prev.map(job => job.id === id ? updatedJob : job));
      setEditingJob(null);
      return updatedJob;
    },
    {
      loadingMessage: 'Updating job...',
      successMessage: 'Job updated successfully!',
      errorMessage: 'Failed to update job. Please try again.',
      loadingType: 'button'
    }
  );

  // Delete job with feedback
  const handleDeleteJob = deleteWithFeedback(
    async (id: number) => {
      await mockApi.deleteJob(id);
      setJobs(prev => prev.filter(job => job.id !== id));
    },
    {
      loadingMessage: 'Deleting job...',
      successMessage: 'Job deleted successfully!',
      errorMessage: 'Failed to delete job. Please try again.',
      loadingType: 'button'
    }
  );

  // Assign job with global loading
  const handleAssignJob = withGlobalLoading(
    'job-assignment',
    async (id: number, userId: number) => {
      const updatedJob = await mockApi.assignJob(id, userId);
      setJobs(prev => prev.map(job => job.id === id ? updatedJob : job));
    },
    {
      loadingMessage: 'Assigning job...',
      loadingType: 'button',
      successMessage: 'Job assigned successfully!',
      errorMessage: 'Failed to assign job. Please try again.'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingJob) {
      handleUpdateJob(editingJob.id, formData);
    } else {
      handleCreateJob(formData);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      client: job.client,
      start_date: job.start_date.split('T')[0],
      end_date: job.end_date.split('T')[0],
    });
    setOpenDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'assigned': return 'info';
      case 'pending': return 'default';
      default: return 'default';
    }
  };


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Jobs Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingJob(null);
            setFormData({ title: '', client: '', start_date: '', end_date: '' });
            setOpenDialog(true);
          }}
          sx={{
            background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            }
          }}
        >
          Add Job
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search jobs..."
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

      {/* Jobs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {job.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job.client}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={job.status}
                    color={getStatusColor(job.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {job.progress}%
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(job.end_date).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEdit(job)}
                      disabled={loading.isLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={loading.isLoading}
                    >
                      Delete
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Person />}
                      onClick={() => handleAssignJob(job.id, 1)}
                      disabled={loading.isLoading}
                    >
                      Assign
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
            {editingJob ? 'Edit Job' : 'Create New Job'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Job Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Client"
                value={formData.client}
                onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
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
              loadingText={editingJob ? 'Updating...' : 'Creating...'}
              sx={{
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                }
              }}
            >
              {editingJob ? 'Update Job' : 'Create Job'}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default JobsWithFeedback;
