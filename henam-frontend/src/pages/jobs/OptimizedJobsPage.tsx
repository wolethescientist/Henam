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
  LinearProgress,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Work,
  Edit,
  Delete,
  Search,
  TrendingUp,
  Receipt,
  Assignment,
} from '@mui/icons-material';
import { useGetUnifiedJobsDataQuery } from '../../store/api/unifiedApis';
import { useGetMyJobsQuery } from '../../store/api/jobsApi';
import { useGetUsersQuery } from '../../store/api/usersApi';
import { useJobsWithNotifications } from '../../hooks/useJobsWithNotifications';
import type { Job, CreateJobForm } from '../../types';
import KebabMenu from '../../components/common/KebabMenu';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import DateRangeFilter, { type DateFilterValue } from '../../components/common/DateRangeFilter';
import OptimizedJobAssignmentModal from '../../components/jobs/OptimizedJobAssignmentModal';
import { useHighlight } from '../../hooks/useHighlight';
import { useAuthErrorHandlerForQuery } from '../../hooks/useAuthErrorHandler';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';

const OptimizedJobsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supervisorFilter, setSupervisorFilter] = useState<number | ''>('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [newProgress, setNewProgress] = useState(0);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState<Job | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<Job | null>(null);
  const [formData, setFormData] = useState<CreateJobForm>({
    title: '',
    client: '',
    start_date: '',
    end_date: '',
    team_id: 1, // Default to first team instead of 0
  });

  const { getHighlightStyles } = useHighlight();
  
  // Use notification hooks for all job operations
  const { updateJob, deleteJob, updateJobProgress } = useJobsWithNotifications();
  

  
  // Initialize feedback hooks
  const { updateWithFeedback, deleteWithFeedback } = useCrudFeedback();

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
  }, [statusFilter, supervisorFilter, dateFilter, debouncedSearchTerm, viewMode]);

  // Build query parameters with all filters
  const buildQueryParams = () => {
    const params: any = {
      page: page + 1,
      limit: rowsPerPage,
      ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
      ...(statusFilter && { status_filter: statusFilter }),
      ...(supervisorFilter && { supervisor_filter: supervisorFilter }),
      // Force refresh to bypass cache
      forceRefresh: true,
    };

    // Add date filtering
    if (dateFilter) {
      if (dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
        params.start_date = dateFilter.startDate.toISOString();
        params.end_date = dateFilter.endDate.toISOString();
      } else if (dateFilter.type === 'month' && dateFilter.month && dateFilter.year) {
        params.month = dateFilter.month;
        params.year = dateFilter.year;
      } else if (dateFilter.type === 'year' && dateFilter.year) {
        params.year = dateFilter.year;
      } else if (dateFilter.type === 'week' && dateFilter.week && dateFilter.year) {
        params.week = dateFilter.week;
        params.year = dateFilter.year;
      }
    }

    return params;
  };

  // API calls based on view mode with fresh data
  // Don't use timestamp in the query params - let RTK Query handle caching
  const { data: unifiedData, isLoading: allJobsLoading, error: allJobsError, refetch: refetchUnifiedJobs } = useGetUnifiedJobsDataQuery(
    buildQueryParams(),
    {
      skip: viewMode !== 'all',
      refetchOnMountOrArgChange: true, // Always fetch fresh data
      refetchOnFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: true, // Refetch when connection is restored
    }
  );

  const { data: myJobs, isLoading: myJobsLoading, error: myJobsError, refetch: refetchMyJobs } = useGetMyJobsQuery({
    page: 1,
    limit: 10,
  }, {
    skip: viewMode !== 'my',
    refetchOnMountOrArgChange: true, // Always fetch fresh data
    refetchOnFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: true, // Refetch when connection is restored
  });

  // Get users for assignment
  const { data: users = [] } = useGetUsersQuery({ page: 1, limit: 100 });

  // Handle authentication errors automatically
  useAuthErrorHandlerForQuery(viewMode === 'all' ? allJobsError : myJobsError);

  // Force refetch when date filter changes to ensure fresh data
  useEffect(() => {
    if (viewMode === 'all') {
      console.log('🔄 Date filter changed, forcing refetch...', dateFilter);
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        refetchUnifiedJobs();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dateFilter, viewMode, refetchUnifiedJobs]);


  // Determine current data based on view mode
  const isLoading = viewMode === 'all' ? allJobsLoading : myJobsLoading;
  const error = viewMode === 'all' ? allJobsError : myJobsError;
  
  const jobs = viewMode === 'all' ? (unifiedData?.jobs || []) : (myJobs || []);
  const teams = unifiedData?.teams || [];
  const invoicesByJob = unifiedData?.invoices_by_job || {};
  const pagination = viewMode === 'all' ? unifiedData?.pagination : { total_count: myJobs?.length || 0 };
  
  const filteredJobs = jobs; // Already filtered by API
  
  // Debug logging for team assignments
  React.useEffect(() => {
    if (jobs.length > 0) {
      console.log('📊 Jobs data updated, sample job:', {
        id: jobs[0].id,
        title: jobs[0].title,
        team: jobs[0].team?.name || 'None',
        supervisor: jobs[0].supervisor?.name || 'None',
        totalJobs: jobs.length
      });
    }
  }, [jobs]);

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

  const handleOpenDialog = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title || '',
      client: job.client || '',
      start_date: job.start_date ? new Date(job.start_date).toISOString().split('T')[0] : '',
      end_date: job.end_date ? new Date(job.end_date).toISOString().split('T')[0] : '',
      team_id: job.team_id || (teams.length > 0 ? teams[0].id : 1),
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingJob(null);
  };

  const handleInputChange = (field: keyof CreateJobForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };



  // Update job with feedback
  const handleUpdateJob = updateWithFeedback(
    async (jobData: CreateJobForm) => {
      if (!editingJob) throw new Error('No job selected for update');
      const result = await updateJob(editingJob.id, jobData);
      handleCloseDialog();
      return result;
    },
    {
      loadingMessage: 'Updating job...',
      successMessage: 'Job updated successfully!',
      errorMessage: 'Failed to update job. Please try again.',
      loadingType: 'button'
    }
  );

  const handleSubmit = async () => {
    if (editingJob) {
      await handleUpdateJob(formData);
    }
  };

  // Delete job with feedback
  const handleDeleteJob = deleteWithFeedback(
    async (jobId: number) => {
      await deleteJob(jobId);
    },
    {
      loadingMessage: 'Deleting job...',
      successMessage: 'Job deleted successfully!',
      errorMessage: 'Failed to delete job. Please try again.',
      loadingType: 'button'
    }
  );

  const handleDelete = async (jobId: number) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      await handleDeleteJob(jobId);
    }
  };

  const handleOpenProgressDialog = (job: Job) => {
    setSelectedJob(job);
    setNewProgress(job.progress || 0);
    setProgressDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (selectedJob) {
      try {
        await updateJobProgress(selectedJob.id, newProgress);
        setProgressDialogOpen(false);
        setSelectedJob(null);
      } catch (error) {
        console.error('Failed to update job progress:', error);
      }
    }
  };

  const handleViewInvoices = (job: Job) => {
    setSelectedJobForInvoice(job);
    setInvoiceDialogOpen(true);
  };

  const handleOpenAssignmentDialog = (job: Job) => {
    setSelectedJobForAssignment(job);
    setAssignmentDialogOpen(true);
  };

  const handleCloseAssignmentDialog = () => {
    setAssignmentDialogOpen(false);
    setSelectedJobForAssignment(null);
  };

  const handleAssignmentSuccess = async (timestamp?: number) => {
    console.log('🔄 Assignment success, forcing refetch...');
    
    // Small delay to ensure backend completes
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('🔄 Forcing refetch...');
    
    // Force refetch - this will bypass cache due to tag invalidation
    if (viewMode === 'all') {
      await refetchUnifiedJobs();
      console.log('✅ Refetch completed');
    } else {
      await refetchMyJobs();
      console.log('✅ Refetch completed');
    }
  };

  const getStatusColor = (status: string) => {
    // Handle both frontend format (lowercase_underscore) and backend format (UPPERCASE)
    const normalizedStatus = status?.toLowerCase() || 'not_started';
    
    switch (normalizedStatus) {
      case 'not_started':
        return 'default';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';

      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    // Handle both frontend format (lowercase_underscore) and backend format (UPPERCASE)
    const normalizedStatus = status?.toLowerCase() || 'not_started';
    
    switch (normalizedStatus) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';

      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (isLoading) {
    return <SkeletonLoader variant="jobs" count={10} />;
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Failed to load jobs. Please try again.</Alert>
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
        <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>Jobs Management</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
            Jobs are automatically created when invoices receive payment
          </Typography>
        </Box>
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
          <ToggleButton value="all" aria-label="all jobs">
            All Jobs
          </ToggleButton>
          <ToggleButton value="my" aria-label="my jobs">
            My Jobs
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
            placeholder="Search jobs..."
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
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box minWidth={{ xs: '100%', sm: '150px', md: '200px' }}>
          <FormControl fullWidth size="medium">
            <InputLabel>Supervisor</InputLabel>
            <Select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value as number | '')}
              label="Supervisor"
            >
              <MenuItem value="">All Supervisors</MenuItem>
              {users.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box minWidth={{ xs: '100%', sm: '120px', md: '150px' }}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Typography variant="h6" color="primary">
                {pagination?.total_count || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {viewMode === 'all' ? 'Total Jobs' : 'My Jobs'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Date Filter */}
      <Box mb={3}>
        <DateRangeFilter
          value={dateFilter}
          onChange={setDateFilter}
          label="Job Date Filter"
          showWeekFilter={true}
        />
      </Box>

      {/* Jobs Table */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto', flex: 1 }}>
          <Table sx={{ minWidth: { xs: 600, sm: 650 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Job Title</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Client</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Team</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Assigned To</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Start Date</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>End Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.map((job, index) => (
                <TableRow 
                  key={job.id || `job-${index}`}
                  sx={{
                    ...getHighlightStyles(`job-${job.id}`),
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <Work />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1">{job.title}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {job.client}
                        </Typography>
                        {/* Mobile-only assigner info */}
                        <Typography variant="caption" color="textSecondary" display="block">
                          Assigned to: {job.supervisor?.name || 'Unassigned'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{job.client}</Typography>
                  </TableCell>
                  <TableCell>
                    {job.team ? (
                      <Chip
                        label={job.team.name}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No Team
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                    {job.supervisor ? (
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {job.supervisor.name?.charAt(0) || 'S'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {job.supervisor.name || 'Supervisor'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {job.supervisor.email || 'No email'}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          U
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            Unassigned
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            No supervisor assigned
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={job.progress || 0}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {job.progress || 0}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(job.status || 'not_started')}
                      color={getStatusColor(job.status || 'not_started') as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {job.end_date ? new Date(job.end_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <KebabMenu
                      actions={[
                        {
                          label: 'Assign Job',
                          icon: <Assignment />,
                          onClick: () => handleOpenAssignmentDialog(job),
                        },
                        {
                          label: 'View Invoices',
                          icon: <Receipt />,
                          onClick: () => handleViewInvoices(job),
                        },
                        {
                          label: 'Update Progress',
                          icon: <TrendingUp />,
                          onClick: () => handleOpenProgressDialog(job),
                        },
                        {
                          label: 'Edit Job',
                          icon: <Edit />,
                          onClick: () => handleOpenDialog(job),
                          divider: true,
                        },
                        {
                          label: 'Delete Job',
                          icon: <Delete />,
                          onClick: () => handleDelete(job.id),
                          color: 'error',
                        },
                      ]}
                      tooltip="Job actions"
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

      {/* Edit Job Dialog - Only for editing existing jobs */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Job
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Job Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Client"
              value={formData.client}
              onChange={handleInputChange('client')}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Team</InputLabel>
              <Select
                value={teams.some(team => team.id === formData.team_id) ? formData.team_id : (teams.length > 0 ? teams[0].id : '')}
                onChange={handleInputChange('team_id')}
                label="Team"
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange('start_date')}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={handleInputChange('end_date')}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Update Job
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog open={progressDialogOpen} onClose={() => setProgressDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Job Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" gutterBottom>
              {selectedJob?.title}
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
          <Button onClick={handleUpdateProgress} variant="contained">
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoices Dialog */}
      <Dialog 
        open={invoiceDialogOpen} 
        onClose={() => setInvoiceDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Invoices for {selectedJobForInvoice?.title}
        </DialogTitle>
        <DialogContent>
          {selectedJobForInvoice && (() => {
            const jobInvoices = invoicesByJob[selectedJobForInvoice.id] || [];
            
            return (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {jobInvoices.length} Invoice{jobInvoices.length !== 1 ? 's' : ''}
                </Typography>
                
                {jobInvoices.length > 0 ? (
                  <List>
                    {jobInvoices.map((invoice, index) => (
                      <React.Fragment key={invoice.id}>
                        <ListItem>
                          <ListItemIcon>
                            <Receipt color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1">
                                  Invoice #{invoice.id}
                                </Typography>
                                <Chip
                                  label={invoice.status}
                                  color={invoice.status === 'paid' ? 'success' : 'warning'}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Amount: {formatCurrency(invoice.amount)} | 
                                  Paid: {formatCurrency(invoice.paid_amount)} | 
                                  Pending: {formatCurrency(invoice.pending_amount)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                                </Typography>
                                {invoice.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {invoice.description}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < jobInvoices.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    No invoices found for this job.
                  </Typography>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Assignment Modal */}
      <OptimizedJobAssignmentModal
        open={assignmentDialogOpen}
        onClose={handleCloseAssignmentDialog}
        jobId={selectedJobForAssignment?.id || 0}
        jobTitle={selectedJobForAssignment?.title || ''}
        currentTeamId={selectedJobForAssignment?.team_id}
        currentSupervisorId={selectedJobForAssignment?.supervisor_id}
        onSuccess={handleAssignmentSuccess}
      />
    </Box>
  );
};

export default OptimizedJobsPage;
