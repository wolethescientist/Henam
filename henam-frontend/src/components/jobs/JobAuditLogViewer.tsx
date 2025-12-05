import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Pagination,
  Card,
  CardContent,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import {
  History,
  Add,
  Warning,
  Link as LinkIcon,
  Edit,
  MergeType,
  Person,
} from '@mui/icons-material';
import { useGetJobAuditLogQuery } from '../../store/api/jobsApi';

interface JobAuditLogViewerProps {
  jobId: number;
}

const JobAuditLogViewer: React.FC<JobAuditLogViewerProps> = ({ jobId }) => {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useGetJobAuditLogQuery({ jobId, page, limit });

  // Filter audit logs by event type (client-side filtering)
  const filteredLogs = eventTypeFilter
    ? data?.items?.filter((log) => log.event_type === eventTypeFilter) || []
    : data?.items || [];

  // Calculate total pages based on filtered results
  const totalPages = data?.total_pages || 1;
  const paginatedLogs = filteredLogs;

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleFilterChange = (event: any) => {
    setEventTypeFilter(event.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'JOB_CREATED':
        return <Add />;
      case 'DUPLICATE_WARNING_SHOWN':
      case 'DUPLICATE_OVERRIDE':
        return <Warning />;
      case 'INVOICE_LINKED':
        return <LinkIcon />;
      case 'JOB_UPDATED':
        return <Edit />;
      case 'JOB_MERGED':
        return <MergeType />;
      default:
        return <History />;
    }
  };

  const getEventColor = (eventType: string): 'primary' | 'warning' | 'success' | 'info' | 'error' | 'secondary' => {
    switch (eventType) {
      case 'JOB_CREATED':
        return 'success';
      case 'DUPLICATE_WARNING_SHOWN':
        return 'warning';
      case 'DUPLICATE_OVERRIDE':
        return 'error';
      case 'INVOICE_LINKED':
        return 'info';
      case 'JOB_UPDATED':
        return 'primary';
      case 'JOB_MERGED':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load audit log. Please try again.
      </Alert>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No audit log entries yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Activity history will appear here
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Filter Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <History />
          Audit Trail
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Event Type</InputLabel>
          <Select
            value={eventTypeFilter}
            onChange={handleFilterChange}
            label="Filter by Event Type"
          >
            <MenuItem value="">All Events</MenuItem>
            <MenuItem value="JOB_CREATED">Job Created</MenuItem>
            <MenuItem value="DUPLICATE_WARNING_SHOWN">Duplicate Warning</MenuItem>
            <MenuItem value="DUPLICATE_OVERRIDE">Duplicate Override</MenuItem>
            <MenuItem value="INVOICE_LINKED">Invoice Linked</MenuItem>
            <MenuItem value="JOB_UPDATED">Job Updated</MenuItem>
            <MenuItem value="JOB_MERGED">Job Merged</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Audit Log List */}
      <Paper sx={{ p: 2 }}>
        {paginatedLogs.length === 0 ? (
          <Alert severity="info">No events match the selected filter.</Alert>
        ) : (
          <Stack spacing={2}>
            {paginatedLogs.map((log, index) => (
              <Box key={log.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: `${getEventColor(log.event_type)}.main`,
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: `${getEventColor(log.event_type)}.main`,
                            }}
                          >
                            {getEventIcon(log.event_type)}
                          </Avatar>
                          <Chip
                            label={formatEventType(log.event_type)}
                            color={getEventColor(log.event_type)}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                          {log.description}
                        </Typography>
                      </Box>
                      <Box textAlign="right" ml={2}>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                        <Person sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {log.user_name}
                      </Typography>
                    </Box>

                    {/* Display event data if available */}
                    {log.event_data && Object.keys(log.event_data).length > 0 && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 1.5,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          fontSize: '0.875rem',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          Event Details:
                        </Typography>
                        {Object.entries(log.event_data).map(([key, value]) => (
                          <Typography key={key} variant="caption" display="block">
                            <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
                {index < paginatedLogs.length - 1 && <Divider />}
              </Box>
            ))}
          </Stack>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default JobAuditLogViewer;
