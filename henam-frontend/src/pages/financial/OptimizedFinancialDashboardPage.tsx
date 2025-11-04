import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Warning,
  Receipt,
  Schedule,
} from '@mui/icons-material';
import { useGetUnifiedDashboardQuery } from '../../store/api/dashboardApi';
import { useAppSelector } from '../../hooks/redux';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const OptimizedFinancialDashboardPage: React.FC = () => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'teams' | 'clients'>('overview');

  // Single API call instead of 6 separate calls
  const { data: dashboardData, isLoading, error } = useGetUnifiedDashboardQuery({
    team_id: currentUser?.team_id,
  });

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactElement;
    color: string;
    trend?: number;
    subtitle?: string;
  }> = ({ title, value, icon, color, trend, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="div" fontWeight="bold">
              {typeof value === 'number' ? `₦${value.toLocaleString()}` : value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {trend >= 0 ? (
                <TrendingUp sx={{ color: 'success.main' }} />
              ) : (
                <TrendingDown sx={{ color: 'error.main' }} />
              )}
              <Typography
                variant="body2"
                color={trend >= 0 ? 'success.main' : 'error.main'}
                sx={{ ml: 0.5 }}
              >
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'overdue': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  if (isLoading) {
    return <SkeletonLoader variant="financial" count={5} />;
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom color="error">
          Error loading dashboard
        </Typography>
        <Typography variant="body1" color="error">
          Please try refreshing the page or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  const { financial_summary, team_performance, recent_jobs, overdue_jobs, monthly_trends, client_summary } = dashboardData || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AttachMoney sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Financial Dashboard
        </Typography>
      </Box>

      {/* Overdue Invoices Alert */}
      {overdue_jobs && overdue_jobs.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1 }} />
            You have {overdue_jobs.length} job(s) with overdue invoices that require attention.
          </Box>
        </Alert>
      )}

      {/* Financial Summary Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 3 }}>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Total Billed"
            value={financial_summary?.total_billed || 0}
            icon={<Receipt />}
            color="#2196f3"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Total Paid"
            value={financial_summary?.total_paid || 0}
            icon={<TrendingUp />}
            color="#4caf50"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Pending Amount"
            value={financial_summary?.total_pending || 0}
            icon={<Schedule />}
            color="#ff9800"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Overdue Amount"
            value={financial_summary?.overdue_amount || 0}
            icon={<Warning />}
            color="#f44336"
            subtitle={`${financial_summary?.overdue_invoices_count || 0} invoices`}
          />
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" value="overview" />
          <Tab label="Job Financials" value="jobs" />
          <Tab label="Team Summary" value="teams" />
          <Tab label="Client Summary" value="clients" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Box display="flex" flexWrap="wrap" gap={3}>
          {/* Monthly Trends Chart */}
          <Box flex="2" minWidth="400px">
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Monthly Financial Trends
              </Typography>
              <Box>
                {monthly_trends?.slice(-6).map((trend) => (
                  <Box key={trend.month} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{trend.month_name}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        ₦{trend.total_billed.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(trend.total_billed / Math.max(...(monthly_trends?.map(t => t.total_billed) || [1]))) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Overdue Jobs */}
          <Box flex="1" minWidth="300px">
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Overdue Jobs
              </Typography>
              <Box>
                {overdue_jobs?.slice(0, 5).map((job) => (
                  <Box key={job.job_id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {job.job_title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.client}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      Overdue
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {activeTab === 'jobs' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Jobs
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job Title</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Supervisor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recent_jobs?.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>{job.client}</TableCell>
                    <TableCell>{job.team_name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress variant="determinate" value={job.progress} />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" color="text.secondary">
                            {`${Math.round(job.progress)}%`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status.toUpperCase()}
                        color={getStatusColor(job.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{job.supervisor_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 'teams' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Team Performance Summary
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell>Members</TableCell>
                  <TableCell>Avg Attendance</TableCell>
                  <TableCell>Avg Efficiency</TableCell>
                  <TableCell>Jobs Handled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {team_performance?.map((team) => (
                  <TableRow key={team.team_id} hover>
                    <TableCell>{team.team_name}</TableCell>
                    <TableCell>{team.total_members}</TableCell>
                    <TableCell>{team.average_attendance.toFixed(1)}%</TableCell>
                    <TableCell>{team.average_efficiency.toFixed(1)}</TableCell>
                    <TableCell>{team.total_jobs_handled}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 'clients' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Client Financial Summary
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Total Billed</TableCell>
                  <TableCell>Total Paid</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>Overdue</TableCell>
                  <TableCell>Jobs</TableCell>
                  <TableCell>Invoices</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {client_summary?.map((client) => (
                  <TableRow key={client.client} hover>
                    <TableCell>{client.client}</TableCell>
                    <TableCell>₦{client.total_billed.toLocaleString()}</TableCell>
                    <TableCell>₦{client.total_paid.toLocaleString()}</TableCell>
                    <TableCell>₦{client.total_pending.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={client.overdue_count}
                        color={client.overdue_count > 0 ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{client.job_count}</TableCell>
                    <TableCell>{client.invoice_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default OptimizedFinancialDashboardPage;
