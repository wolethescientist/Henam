import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  Work,
  TrendingUp,
  Receipt,
  Assignment,
  Edit,
  Delete,
  Business,
  CheckCircle,
  HourglassEmpty,
  History,
} from '@mui/icons-material';
import { useGetClientsQuery, useGetJobsByClientQuery } from '../../store/api/jobsApi';
import type { Job } from '../../types';
import KebabMenu from '../common/KebabMenu';
import SkeletonLoader from '../common/SkeletonLoader';

interface ClientGroupedViewProps {
  onEditJob?: (job: Job) => void;
  onDeleteJob?: (jobId: number) => void;
  onUpdateProgress?: (job: Job) => void;
  onViewInvoices?: (job: Job) => void;
  onAssignJob?: (job: Job) => void;
  onViewAuditLog?: (job: Job) => void;
}

const ClientGroupedView: React.FC<ClientGroupedViewProps> = ({
  onEditJob,
  onDeleteJob,
  onUpdateProgress,
  onViewInvoices,
  onAssignJob,
  onViewAuditLog,
}) => {
  const [expandedClient, setExpandedClient] = useState<string | false>(false);
  
  // Fetch all clients
  const { data: clients = [], isLoading, error } = useGetClientsQuery();

  const handleAccordionChange = (clientName: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedClient(isExpanded ? clientName : false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
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

  if (isLoading) {
    return <SkeletonLoader variant="jobs" count={5} />;
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load clients. Please try again.
      </Alert>
    );
  }

  if (clients.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No clients found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Jobs will appear here once they are created
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Jobs Grouped by Client
      </Typography>

      {clients.map((client) => (
        <ClientAccordion
          key={client.client_name}
          client={client}
          expanded={expandedClient === client.client_name}
          onChange={handleAccordionChange(client.client_name)}
          onEditJob={onEditJob}
          onDeleteJob={onDeleteJob}
          onUpdateProgress={onUpdateProgress}
          onViewInvoices={onViewInvoices}
          onAssignJob={onAssignJob}
          onViewAuditLog={onViewAuditLog}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      ))}
    </Box>
  );
};

interface ClientAccordionProps {
  client: {
    client_name: string;
    total_jobs: number;
    active_jobs: number;
    completed_jobs: number;
    total_billed: number;
    total_paid: number;
    total_pending: number;
    last_job_date: string;
  };
  expanded: boolean;
  onChange: (event: React.SyntheticEvent, isExpanded: boolean) => void;
  onEditJob?: (job: Job) => void;
  onDeleteJob?: (jobId: number) => void;
  onUpdateProgress?: (job: Job) => void;
  onViewInvoices?: (job: Job) => void;
  onAssignJob?: (job: Job) => void;
  onViewAuditLog?: (job: Job) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

const ClientAccordion: React.FC<ClientAccordionProps> = ({
  client,
  expanded,
  onChange,
  onEditJob,
  onDeleteJob,
  onUpdateProgress,
  onViewInvoices,
  onAssignJob,
  onViewAuditLog,
  formatCurrency,
  getStatusColor,
  getStatusLabel,
}) => {
  // Fetch jobs for this client when expanded
  const { data: jobs = [], isLoading } = useGetJobsByClientQuery(
    { client_name: client.client_name, include_completed: true },
    { skip: !expanded }
  );

  const paymentPercentage = client.total_billed > 0 
    ? (client.total_paid / client.total_billed) * 100 
    : 0;

  return (
    <Accordion
      expanded={expanded}
      onChange={onChange}
      sx={{
        mb: 2,
        '&:before': { display: 'none' },
        boxShadow: 2,
        borderRadius: 2,
        '&.Mui-expanded': {
          margin: '0 0 16px 0',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          '&.Mui-expanded': {
            minHeight: 64,
          },
          '& .MuiAccordionSummary-content': {
            my: 2,
          },
        }}
      >
        <Box sx={{ width: '100%', pr: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Business />
              </Avatar>
              <Box>
                <Typography variant="h6">{client.client_name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Last job: {new Date(client.last_job_date).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Chip
                icon={<Work />}
                label={`${client.total_jobs} Jobs`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<CheckCircle />}
                label={`${client.completed_jobs} Completed`}
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<HourglassEmpty />}
                label={`${client.active_jobs} Active`}
                size="small"
                color="warning"
                variant="outlined"
              />
            </Box>
          </Box>

          <Box 
            display="flex" 
            gap={2} 
            sx={{ 
              mt: 1,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <Box flex={1}>
              <Typography variant="caption" color="textSecondary">
                Total Billed
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(client.total_billed)}
              </Typography>
            </Box>
            <Box flex={1}>
              <Typography variant="caption" color="textSecondary">
                Total Paid
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(client.total_paid)}
              </Typography>
            </Box>
            <Box flex={1}>
              <Typography variant="caption" color="textSecondary">
                Pending
              </Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(client.total_pending)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="textSecondary">
                Payment Progress
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {paymentPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={paymentPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: paymentPercentage >= 80 ? 'success.main' : paymentPercentage >= 50 ? 'warning.main' : 'error.main',
                },
              }}
            />
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        <Divider sx={{ mb: 2 }} />
        
        {isLoading ? (
          <Box py={2}>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              Loading jobs...
            </Typography>
          </Box>
        ) : jobs.length === 0 ? (
          <Box py={2}>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              No jobs found for this client
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
              All Jobs ({jobs.length})
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              {jobs.map((job) => (
                <Card key={job.id} variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Work color="action" fontSize="small" />
                          <Typography variant="subtitle1" fontWeight={600}>
                            {job.title}
                          </Typography>
                          <Chip
                            label={getStatusLabel(job.status)}
                            color={getStatusColor(job.status) as any}
                            size="small"
                          />
                        </Box>

                        <Box 
                          display="flex" 
                          gap={2} 
                          sx={{ 
                            mt: 1,
                            flexDirection: { xs: 'column', sm: 'row' },
                            flexWrap: 'wrap',
                          }}
                        >
                          <Box flex={{ xs: '1 1 100%', sm: '1 1 45%', md: '1 1 20%' }}>
                            <Typography variant="caption" color="textSecondary">
                              Team
                            </Typography>
                            <Typography variant="body2">
                              {job.team?.name || 'No Team'}
                            </Typography>
                          </Box>
                          <Box flex={{ xs: '1 1 100%', sm: '1 1 45%', md: '1 1 20%' }}>
                            <Typography variant="caption" color="textSecondary">
                              Supervisor
                            </Typography>
                            <Typography variant="body2">
                              {job.supervisor?.name || 'Unassigned'}
                            </Typography>
                          </Box>
                          <Box flex={{ xs: '1 1 100%', sm: '1 1 45%', md: '1 1 20%' }}>
                            <Typography variant="caption" color="textSecondary">
                              Start Date
                            </Typography>
                            <Typography variant="body2">
                              {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                          <Box flex={{ xs: '1 1 100%', sm: '1 1 45%', md: '1 1 20%' }}>
                            <Typography variant="caption" color="textSecondary">
                              End Date
                            </Typography>
                            <Typography variant="body2">
                              {job.end_date ? new Date(job.end_date).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="caption" color="textSecondary">
                              Progress
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {job.progress || 0}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={job.progress || 0}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </Box>

                      <Box ml={2}>
                        <KebabMenu
                          actions={[
                            ...(onAssignJob ? [{
                              label: 'Assign Job',
                              icon: <Assignment />,
                              onClick: () => onAssignJob(job),
                            }] : []),
                            ...(onViewInvoices ? [{
                              label: 'View Invoices',
                              icon: <Receipt />,
                              onClick: () => onViewInvoices(job),
                            }] : []),
                            ...(onViewAuditLog ? [{
                              label: 'View Audit Log',
                              icon: <History />,
                              onClick: () => onViewAuditLog(job),
                            }] : []),
                            ...(onUpdateProgress ? [{
                              label: 'Update Progress',
                              icon: <TrendingUp />,
                              onClick: () => onUpdateProgress(job),
                            }] : []),
                            ...(onEditJob ? [{
                              label: 'Edit Job',
                              icon: <Edit />,
                              onClick: () => onEditJob(job),
                              divider: true,
                            }] : []),
                            ...(onDeleteJob ? [{
                              label: 'Delete Job',
                              icon: <Delete />,
                              onClick: () => onDeleteJob(job.id),
                              color: 'error' as const,
                            }] : []),
                          ]}
                          tooltip="Job actions"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ClientGroupedView;
