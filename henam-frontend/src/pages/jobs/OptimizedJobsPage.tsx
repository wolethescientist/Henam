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

  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Work,
  Edit,
  Delete,
  Search,
  TrendingUp,
  Receipt,
  Assignment,
  Add,
  ViewList,
  ViewModule,
  History,
  FilterList,
  Clear,
  Person,
  Business,
  CalendarToday,
  CheckCircle,
  Schedule,
  PlayArrow,
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
import CreateJobModal from '../../components/jobs/CreateJobModal';
import ClientGroupedView from '../../components/jobs/ClientGroupedView';
import JobAuditLogViewer from '../../components/jobs/JobAuditLogViewer';
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
  const [creationSourceFilter, setCreationSourceFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [displayMode, setDisplayMode] = useState<'list' | 'grouped'>('list');
  const [openDialog, setOpenDialog] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [newProgress, setNewProgress] = useState(0);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState<Job | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<Job | null>(null);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedJobForAuditLog, setSelectedJobForAuditLog] = useState<Job | null>(null);
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
  }, [statusFilter, supervisorFilter, dateFilter, debouncedSearchTerm, viewMode, creationSourceFilter]);

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
  
  // Filter jobs by creation source (client-side filter)
  const filteredJobs = creationSourceFilter 
    ? jobs.filter(job => job.creation_source === creationSourceFilter)
    : jobs;
  
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

  const handleDisplayModeChange = (_event: React.MouseEvent<HTMLElement>, newDisplayMode: 'list' | 'grouped' | null) => {
    if (newDisplayMode !== null) {
      setDisplayMode(newDisplayMode);
    }
  };

  const handleOpenCreateJobModal = () => {
    setCreateJobModalOpen(true);
  };

  const handleCloseCreateJobModal = () => {
    setCreateJobModalOpen(false);
  };

  const handleJobCreated = async () => {
    // Refresh the jobs list
    if (viewMode === 'all') {
      await refetchUnifiedJobs();
    } else {
      await refetchMyJobs();
    }
    // Success toast is already shown in CreateJobModal
    handleCloseCreateJobModal();
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

  const handleOpenAuditLogDialog = (job: Job) => {
    setSelectedJobForAuditLog(job);
    setAuditLogDialogOpen(true);
  };

  const handleCloseAuditLogDialog = () => {
    setAuditLogDialogOpen(false);
    setSelectedJobForAuditLog(null);
  };

  const handleAssignmentSuccess = async () => {
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
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'grey.50',
      minHeight: '100vh'
    }}>
      {/* Enhanced Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={{ xs: 2, sm: 0 }}
        >
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                fontWeight: 700,
                mb: 1
              }}
            >
              Jobs Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Manage and track all your jobs in one place
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Add />}
              onClick={handleOpenCreateJobModal}
              sx={{ 
                textTransform: 'none',
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'grey.100'
                },
                px: 3,
                py: 1.5,
                fontWeight: 600
              }}
            >
              Create New Job
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={3}>
        <Box flex="1" minWidth="200px">
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {filteredJobs.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {viewMode === 'all' ? 'Total Jobs' : 'My Jobs'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <Work />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box flex="1" minWidth="200px">
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {filteredJobs.filter(job => job.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Completed
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box flex="1" minWidth="200px">
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {filteredJobs.filter(job => job.status === 'in_progress').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    In Progress
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <PlayArrow />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box flex="1" minWidth="200px">
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {filteredJobs.filter(job => job.status === 'not_started').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Not Started
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* View Mode and Display Mode Toggles */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'primary.50',
                },
              },
            }}
          >
            <ToggleButton value="all" aria-label="all jobs">
              <Work sx={{ mr: 1 }} />
              All Jobs
            </ToggleButton>
            <ToggleButton value="my" aria-label="my jobs">
              <Person sx={{ mr: 1 }} />
              My Jobs
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={displayMode}
            exclusive
            onChange={handleDisplayModeChange}
            aria-label="display mode"
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1.5,
                textTransform: 'none',
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'secondary.main',
                color: 'secondary.main',
                '&.Mui-selected': {
                  backgroundColor: 'secondary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'secondary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'secondary.50',
                },
              },
            }}
          >
            <ToggleButton value="list" aria-label="list view">
              <ViewList sx={{ mr: 1 }} />
              List View
            </ToggleButton>
            <ToggleButton value="grouped" aria-label="grouped view">
              <ViewModule sx={{ mr: 1 }} />
              Client Grouped
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Enhanced Search and Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <FilterList color="primary" />
            <Typography variant="h6" color="primary" fontWeight="600">
              Search & Filters
            </Typography>
          </Box>
          {(searchTerm || statusFilter || supervisorFilter || creationSourceFilter) && (
            <Tooltip title="Clear all filters">
              <IconButton 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setSupervisorFilter('');
                  setCreationSourceFilter('');
                }}
                size="small"
                color="primary"
              >
                <Clear />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Box flex="2" minWidth="300px">
            <TextField
              fullWidth
              placeholder="Search by job title, client, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="primary" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchTerm('')}
                      size="small"
                      edge="end"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <Box flex="1" minWidth="150px">
            <FormControl fullWidth size="medium">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="not_started">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Schedule fontSize="small" />
                    Not Started
                  </Box>
                </MenuItem>
                <MenuItem value="in_progress">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PlayArrow fontSize="small" />
                    In Progress
                  </Box>
                </MenuItem>
                <MenuItem value="completed">
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle fontSize="small" />
                    Completed
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box flex="1" minWidth="180px">
            <FormControl fullWidth size="medium">
              <InputLabel>Supervisor</InputLabel>
              <Select
                value={supervisorFilter}
                onChange={(e) => setSupervisorFilter(e.target.value as number | '')}
                label="Supervisor"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Supervisors</MenuItem>
                {users.map((user: any) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Person fontSize="small" />
                      {user.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box flex="1" minWidth="180px">
            <FormControl fullWidth size="medium">
              <InputLabel>Creation Source</InputLabel>
              <Select
                value={creationSourceFilter}
                onChange={(e) => setCreationSourceFilter(e.target.value)}
                label="Creation Source"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Sources</MenuItem>
                <MenuItem value="MANUAL">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Edit fontSize="small" />
                    Manual
                  </Box>
                </MenuItem>
                <MenuItem value="AUTO_FROM_INVOICE">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Receipt fontSize="small" />
                    From Invoice
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Enhanced Date Filter */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CalendarToday color="primary" />
          <Typography variant="h6" color="primary" fontWeight="600">
            Date Range Filter
          </Typography>
        </Box>
        <DateRangeFilter
          value={dateFilter}
          onChange={setDateFilter}
          label="Filter jobs by date range"
          showWeekFilter={true}
        />
      </Paper>

      {/* Jobs Display - List or Grouped View */}
      {displayMode === 'grouped' ? (
        <ClientGroupedView
          onEditJob={handleOpenDialog}
          onDeleteJob={handleDelete}
          onUpdateProgress={handleOpenProgressDialog}
          onViewInvoices={handleViewInvoices}
          onAssignJob={handleOpenAssignmentDialog}
          onViewAuditLog={handleOpenAuditLogDialog}
        />
      ) : (
        <Paper sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: 3
        }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.main', 
            color: 'white',
            borderRadius: '8px 8px 0 0'
          }}>
            <Typography variant="h6" fontWeight="600">
              Jobs List ({filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'})
            </Typography>
          </Box>
          
          <TableContainer sx={{ overflowX: 'auto', flex: 1 }}>
            <Table sx={{ minWidth: { xs: 600, sm: 650 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Job Details</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 600, color: 'primary.main' }}>Client</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 600, color: 'primary.main' }}>Team</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 600, color: 'primary.main' }}>Assigned To</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 600, color: 'primary.main' }}>Timeline</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <Avatar sx={{ width: 80, height: 80, bgcolor: 'grey.100' }}>
                        <Work sx={{ fontSize: 40, color: 'grey.400' }} />
                      </Avatar>
                      <Typography variant="h6" color="textSecondary">
                        No jobs found
                      </Typography>
                      <Typography variant="body2" color="textSecondary" textAlign="center">
                        {searchTerm || statusFilter || supervisorFilter || creationSourceFilter
                          ? 'Try adjusting your filters to see more results'
                          : 'Get started by creating your first job'
                        }
                      </Typography>
                      {!searchTerm && !statusFilter && !supervisorFilter && !creationSourceFilter && (
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={handleOpenCreateJobModal}
                          sx={{ mt: 2 }}
                        >
                          Create Your First Job
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job, index) => (
                <TableRow 
                  key={job.id || `job-${index}`}
                  sx={{
                    ...getHighlightStyles(`job-${job.id}`),
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'scale(1.001)',
                      transition: 'all 0.2s ease-in-out',
                    },
                    '&:nth-of-type(even)': {
                      bgcolor: 'grey.25',
                    },
                    borderLeft: `4px solid ${
                      job.status === 'completed' ? '#4caf50' :
                      job.status === 'in_progress' ? '#ff9800' :
                      '#2196f3'
                    }`,
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar 
                        sx={{ 
                          mr: 2, 
                          bgcolor: job.status === 'completed' ? 'success.main' :
                                  job.status === 'in_progress' ? 'warning.main' :
                                  'info.main',
                          width: 48,
                          height: 48
                        }}
                      >
                        <Work />
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          fontWeight="600"
                          sx={{ 
                            color: 'text.primary',
                            mb: 0.5
                          }}
                        >
                          {job.title}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                          <Business fontSize="small" color="action" />
                          <Typography variant="caption" color="textSecondary">
                            {job.client}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1} sx={{ display: { xs: 'flex', lg: 'none' } }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="caption" color="textSecondary">
                            {job.supervisor?.name || 'Unassigned'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Business fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight="500">
                        {job.client}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {job.team ? (
                      <Chip
                        label={job.team.name}
                        color="primary"
                        variant="filled"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: 2,
                        }}
                      />
                    ) : (
                      <Chip
                        label="No Team"
                        color="default"
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 2 }}
                      />
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
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="textSecondary">
                          Progress
                        </Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">
                          {job.progress || 0}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={job.progress || 0}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: job.progress === 100 ? 'success.main' :
                                    job.progress >= 50 ? 'warning.main' :
                                    'primary.main'
                          }
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(job.status || 'not_started')}
                      color={getStatusColor(job.status || 'not_started') as any}
                      size="medium"
                      icon={
                        job.status === 'completed' ? <CheckCircle /> :
                        job.status === 'in_progress' ? <PlayArrow /> :
                        <Schedule />
                      }
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        minWidth: 120,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <CalendarToday fontSize="small" color="primary" />
                        <Typography variant="caption" color="textSecondary">
                          Timeline
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="500">
                        {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'No start date'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        to {job.end_date ? new Date(job.end_date).toLocaleDateString() : 'No end date'}
                      </Typography>
                    </Box>
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
                          label: 'View Audit Log',
                          icon: <History />,
                          onClick: () => handleOpenAuditLogDialog(job),
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
                ))
              )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ 
            p: 2, 
            bgcolor: 'grey.50', 
            borderTop: '1px solid',
            borderColor: 'divider'
          }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={pagination?.total_count || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  minHeight: 52,
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontWeight: 500,
                },
              }}
            />
          </Box>
        </Paper>
      )}

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

      {/* Create Job Modal */}
      <CreateJobModal
        open={createJobModalOpen}
        onClose={handleCloseCreateJobModal}
        onSuccess={handleJobCreated}
      />

      {/* Audit Log Dialog */}
      <Dialog
        open={auditLogDialogOpen}
        onClose={handleCloseAuditLogDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <History />
            Job Audit Log
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedJobForAuditLog && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                <strong>Job:</strong> {selectedJobForAuditLog.title}
              </Typography>
              <JobAuditLogViewer jobId={selectedJobForAuditLog.id} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAuditLogDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OptimizedJobsPage;
