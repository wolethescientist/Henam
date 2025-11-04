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
  LinearProgress,
  Chip,
  TablePagination,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  IconButton,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AdminPanelSettings,
  Visibility,
  Search,
  Work,
  People,
  AttachMoney,
  TrendingUp,
  ViewList,
  CalendarMonth,
  FilterList,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useAppSelector } from '../../hooks/redux';
import { useGetUnifiedDashboardQuery } from '../../store/api/dashboardApi';
import KebabMenu from '../../components/common/KebabMenu';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import CalendarView from '../../components/dashboard/CalendarView';
import DateRangeFilter, { type DateFilterValue } from '../../components/common/DateRangeFilter';
import { useNavigate } from 'react-router-dom';
import { useAuthErrorHandlerForQuery } from '../../hooks/useAuthErrorHandler';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';

const OptimizedAdminDashboardPage: React.FC = () => {
  const { user, isAuthenticated, accessToken } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const { subscribeToUpdates } = useNavigationWebSocket();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Build query parameters with date filtering
  const queryParams = {
    recent_jobs_page: page + 1, // Backend uses 1-based pagination
    recent_jobs_limit: rowsPerPage,
    ...(dateFilter?.type === 'custom' && {
      start_date: dateFilter.startDate?.toISOString(),
      end_date: dateFilter.endDate?.toISOString(),
    }),
    ...(dateFilter?.type === 'month' && {
      month: dateFilter.month,
      year: dateFilter.year,
    }),
    ...(dateFilter?.type === 'year' && {
      year: dateFilter.year,
    }),
  };

  // Single API call instead of multiple separate calls - only if authenticated
  const { data: dashboardData, isLoading, error } = useGetUnifiedDashboardQuery(queryParams, {
    skip: !isAuthenticated || !accessToken, // Skip the query if not authenticated
  });

  // Handle authentication errors automatically
  useAuthErrorHandlerForQuery(error);
  
  // Reset page when search term changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  // Set up WebSocket subscriptions for dashboard updates (navigation-aware)
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('🔌 Setting up dashboard WebSocket subscriptions');
    
    const unsubscribeJob = subscribeToUpdates('job_update', (data) => {
      console.log('📊 Dashboard received job update:', data);
      // RTK Query will automatically refetch due to tag invalidation
    });

    const unsubscribeTask = subscribeToUpdates('task_update', (data) => {
      console.log('📊 Dashboard received task update:', data);
      // RTK Query will automatically refetch due to tag invalidation
    });

    const unsubscribeNotification = subscribeToUpdates('notification', (data) => {
      console.log('📊 Dashboard received notification:', data);
      // Handle notification updates if needed
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up dashboard WebSocket subscriptions');
      unsubscribeJob();
      unsubscribeTask();
      unsubscribeNotification();
    };
  }, [isAuthenticated, subscribeToUpdates]);
  
  // Job details dialog state
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Handle job details dialog
  const handleViewJobDetails = (job: any) => {
    console.log('Job data structure:', job); // Debug log to see available fields
    setSelectedJob(job);
    setJobDetailsOpen(true);
  };

  const handleCloseJobDetails = () => {
    setJobDetailsOpen(false);
    setSelectedJob(null);
  };

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newViewMode: 'list' | 'calendar' | null,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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
    switch (status) {
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


  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(1)}k`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return <SkeletonLoader variant="dashboard" count={5} />;
  }

  // Only show error message for non-auth errors (auth errors are handled by the hook)
  if (error && !(error as any)?.isAuthError && (error as any)?.status !== 401 && (error as any)?.status !== 403) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom color="error">
          Error loading dashboard data
        </Typography>
        <Typography variant="body1" color="error">
          Please try refreshing the page or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  const { financial_summary, job_summary, team_performance, recent_jobs, pagination } = dashboardData || {};

  // Filter jobs based on search term (client-side filtering for search)
  const filteredJobs = recent_jobs?.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.supervisor_name && job.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.team_name && job.team_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Use filtered jobs directly since pagination is now handled by the backend
  const paginatedJobs = filteredJobs;

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactElement;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        y: -4,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card 
        sx={{ 
          height: '100%',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.15)',
            borderColor: 'rgba(76, 175, 80, 0.3)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Avatar 
                sx={{ 
                  background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
                  mr: 2,
                  width: 56,
                  height: 56,
                  boxShadow: `0px 4px 12px ${color}40`,
                }}
              >
                {icon}
              </Avatar>
            </motion.div>
            <Box sx={{ flex: 1 }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Typography 
                  variant="h3" 
                  component="div" 
                  fontWeight="bold"
                  sx={{
                    background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                  }}
                >
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </Typography>
                <Typography variant="body1" color="text.secondary" fontWeight="500">
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {subtitle}
                  </Typography>
                )}
              </motion.div>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ height: '100%' }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            mb: { xs: 3, sm: 4 },
            gap: { xs: 2, sm: 0 }
          }}>
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              <AdminPanelSettings 
                sx={{ 
                  mr: { xs: 0, sm: 3 }, 
                  fontSize: { xs: 36, sm: 42, md: 48 },
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }} 
              />
            </motion.div>
            <Box>
              <Typography 
                variant="h3"
                component="h1"
                sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 700,
                  mb: 1,
                  fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
                }}
              >
                {getGreeting()}, {user?.name}!
              </Typography>
              <Typography 
                variant="h6"
                color="text.secondary" 
                fontWeight="400"
                sx={{ fontSize: { xs: '1.125rem', sm: '1.375rem' } }}
              >
                Welcome to your admin dashboard
              </Typography>
            </Box>
          </Box>
        </motion.div>


        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: { xs: 2, sm: 3 },
              mb: { xs: 3, sm: 4 },
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <StatCard
                title="Total Jobs"
                value={job_summary?.total_jobs || 0}
                icon={<Work />}
                color="#2196f3"
                subtitle={`${job_summary?.completed_jobs || 0} completed`}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <StatCard
                title="Active Teams"
                value={team_performance?.length || 0}
                icon={<People />}
                color="#4caf50"
                subtitle={`${team_performance?.reduce((sum, team) => sum + team.total_members, 0) || 0} members`}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <StatCard
                title="Total Billed"
                value={formatCurrencyShort(financial_summary?.total_billed || 0)}
                icon={<AttachMoney />}
                color="#ff9800"
                subtitle={`${formatCurrencyShort(financial_summary?.total_paid || 0)} paid`}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <StatCard
                title="Pending Amount"
                value={formatCurrencyShort(financial_summary?.total_pending || 0)}
                icon={<TrendingUp />}
                color="#f44336"
                subtitle={`${financial_summary?.overdue_invoices_count || 0} overdue`}
              />
            </motion.div>
          </Box>
        </motion.div>

        {/* Jobs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Paper 
            sx={{ 
              width: '100%', 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 4,
              boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                mb: 2,
                gap: { xs: 2, sm: 0 }
              }}>
                <Typography 
                  variant="h5"
                  sx={{ 
                    flex: 1,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: { xs: '1.1rem', sm: '1.5rem' }
                  }}
                >
                  📊 Recent Jobs
                </Typography>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' }
                }}>
                  <IconButton
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      },
                    }}
                  >
                    <FilterList />
                    {showFilters ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileFocus={{ scale: 1.02 }}
                  >
                    <TextField
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: 'primary.main' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        minWidth: { xs: '100%', sm: 250, md: 300 },
                        width: { xs: '100%', sm: 'auto' },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.9)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                          },
                          '&.Mui-focused': {
                            background: 'rgba(255, 255, 255, 1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0px 8px 24px rgba(67, 160, 71, 0.2)',
                          },
                        },
                      }}
                    />
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ToggleButtonGroup
                      value={viewMode}
                      exclusive
                      onChange={handleViewModeChange}
                      aria-label="view mode"
                      size="small"
                      sx={{
                        '& .MuiToggleButton-root': {
                          borderRadius: 2,
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          color: 'rgba(76, 175, 80, 0.7)',
                          fontWeight: 600,
                          px: 2,
                          py: 1,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderColor: 'rgba(76, 175, 80, 0.5)',
                            color: 'rgba(76, 175, 80, 0.9)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            color: 'white',
                            borderColor: '#4caf50',
                            '&:hover': {
                              backgroundColor: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                            },
                          },
                        },
                      }}
                    >
                      <ToggleButton value="list" aria-label="list view">
                        <ViewList sx={{ mr: 1, fontSize: 18 }} />
                        List
                      </ToggleButton>
                      <ToggleButton value="calendar" aria-label="calendar view">
                        <CalendarMonth sx={{ mr: 1, fontSize: 18 }} />
                        Calendar
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </motion.div>
                </Box>
              </Box>

              {/* Collapsible Filters Section */}
              <Collapse in={showFilters}>
                <Box sx={{ mt: 2 }}>
                  <DateRangeFilter
                    value={dateFilter}
                    onChange={setDateFilter}
                    label="Dashboard Date Filter"
                  />
                </Box>
              </Collapse>
            </Box>

            <AnimatePresence mode="wait">
              {viewMode === 'list' ? (
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <TableContainer sx={{ overflowX: 'auto', flex: 1 }}>
                    <Table sx={{ minWidth: { xs: 600, sm: 650 } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Job Title</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Client</TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Team</TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Supervisor</TableCell>
                          <TableCell>Progress</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <AnimatePresence>
                          {paginatedJobs.map((job, index) => (
                            <motion.tr
                              key={job.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05, duration: 0.3 }}
                              whileHover={{ 
                                backgroundColor: 'rgba(76, 175, 80, 0.04)',
                                scale: 1.001,
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="600" color="text.primary">
                                    {job.title}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ display: { xs: 'block', sm: 'none' } }}
                                  >
                                    {job.client}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                <Typography variant="body2" color="text.secondary">
                                  {job.client}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                <Typography variant="body2" color="text.secondary">
                                  {job.team_name}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                <Typography variant="body2" color="text.secondary">
                                  {job.supervisor_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={job.progress}
                                      sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                        '& .MuiLinearProgress-bar': {
                                          background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                                          borderRadius: 4,
                                        },
                                      }}
                                    />
                                  </Box>
                                  <Box sx={{ minWidth: 35 }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                      {`${Math.round(job.progress)}%`}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Chip
                                    label={getStatusLabel(job.status)}
                                    color={getStatusColor(job.status) as any}
                                    size="small"
                                    sx={{
                                      fontWeight: 600,
                                      borderRadius: 2,
                                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                  />
                                </motion.div>
                              </TableCell>
                              <TableCell>
                                <KebabMenu
                                  actions={[
                                    {
                                      label: 'View Details',
                                      icon: <Visibility />,
                                      onClick: () => handleViewJobDetails(job),
                                    },
                                  ]}
                                  tooltip="Job actions"
                                />
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={pagination?.recent_jobs?.total_count || filteredJobs.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{ 
                      borderTop: 1, 
                      borderColor: 'divider',
                      background: 'rgba(248, 250, 252, 0.8)',
                      '& .MuiTablePagination-toolbar': {
                        paddingX: 3,
                      },
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontWeight: 500,
                      },
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="calendar-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <CalendarView
                    jobs={(recent_jobs || []) as any}
                    onJobClick={handleViewJobDetails}
                    searchTerm={searchTerm}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>
        </motion.div>

        {/* Job Details Dialog */}
        <Dialog 
          open={jobDetailsOpen} 
          onClose={handleCloseJobDetails} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1, 
            fontSize: '1.5rem', 
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Job Details
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedJob && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {selectedJob.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedJob.description}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Client
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedJob.client || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Team
                    </Typography>
                    <Chip 
                      label={selectedJob.team_name || 'No Team'} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Supervisor
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedJob.supervisor_name || 'N/A'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip 
                      label={selectedJob.status?.replace('_', ' ').toUpperCase() || 'N/A'} 
                      size="small" 
                      color={
                        selectedJob.status === 'completed' ? 'success' :
                        selectedJob.status === 'in_progress' ? 'primary' :
                        selectedJob.status === 'not_started' ? 'default' : 'warning'
                      }
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={selectedJob.progress || 0} 
                        sx={{ 
                          flexGrow: 1, 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: 'rgba(76, 175, 80, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            borderRadius: 4,
                          },
                        }} 
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 35 }}>
                        {selectedJob.progress || 0}%
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Start Date
                    </Typography>
                    <Typography variant="body1">
                      {selectedJob.start_date ? new Date(selectedJob.start_date).toLocaleDateString() : 
                       selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      End Date
                    </Typography>
                    <Typography variant="body1">
                      {selectedJob.end_date ? new Date(selectedJob.end_date).toLocaleDateString() : 
                       selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                {selectedJob.budget && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Budget
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ₦{selectedJob.budget?.toLocaleString()}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={handleCloseJobDetails} variant="outlined">
              Close
            </Button>
            <Button 
              onClick={() => {
                handleCloseJobDetails();
                navigate('/jobs');
              }} 
              variant="contained"
            >
              Go to Jobs Page
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default OptimizedAdminDashboardPage;
