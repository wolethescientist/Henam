import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  Alert,
  InputAdornment,
  LinearProgress,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Search,
  Work,
  CheckCircle,
  Group,
  Person,
  CalendarToday,
  Add,
  Close,
  Info,
} from '@mui/icons-material';
import LoadingButton from '../common/LoadingButton';
import { useToast } from '../../contexts/ToastContext';

interface JobSummary {
  id: number;
  title: string;
  client: string;
  status: string;
  progress: number;
  team_name: string;
  supervisor_name: string;
  start_date: string;
  created_at?: string;
}

interface JobSelectionDialogProps {
  open: boolean;
  matchingJobs: JobSummary[];
  invoiceNumber: string;
  invoiceAmount: number;
  clientName: string;
  onSelectJob: (jobId: number) => void;
  onCreateNew: () => void;
  onCancel: () => void;
  isLinking?: boolean;
}

const JobSelectionDialog: React.FC<JobSelectionDialogProps> = ({
  open,
  matchingJobs,
  invoiceNumber,
  invoiceAmount,
  clientName,
  onSelectJob,
  onCreateNew,
  onCancel,
  isLinking = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  
  // Toast notifications
  const { showWarning, showInfo } = useToast();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedJobId(null);
    }
  }, [open]);

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) {
      return matchingJobs;
    }

    const query = searchQuery.toLowerCase();
    return matchingJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.team_name.toLowerCase().includes(query) ||
        job.supervisor_name.toLowerCase().includes(query) ||
        job.status.toLowerCase().includes(query)
    );
  }, [matchingJobs, searchQuery]);

  // Format status for display
  const formatStatus = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get status color
  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
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

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Handle job selection
  const handleJobSelect = (jobId: number) => {
    setSelectedJobId(jobId);
  };

  // Handle confirm selection
  const handleConfirmSelection = () => {
    if (selectedJobId) {
      const selectedJob = matchingJobs.find(job => job.id === selectedJobId);
      if (selectedJob) {
        showInfo(`Linking invoice ${invoiceNumber} to job "${selectedJob.title}"...`);
      }
      onSelectJob(selectedJobId);
    } else {
      showWarning('Please select a job to link the invoice to');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (selectedJobId) {
      showInfo('Invoice linking cancelled');
    }
    setSearchQuery('');
    setSelectedJobId(null);
    onCancel();
  };
  
  // Handle create new job
  const handleCreateNewJob = () => {
    showInfo('Creating new job for this invoice...');
    onCreateNew();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Work color="primary" />
          <Box flex={1}>
            <Typography variant="h6">Link Invoice to Existing Job</Typography>
            <Typography variant="body2" color="text.secondary">
              Invoice {invoiceNumber} • ${invoiceAmount.toLocaleString()} • {clientName}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pb: 2 }}>
          {/* Info Alert */}
          <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
            <Typography variant="body2">
              Multiple active jobs found for <strong>{clientName}</strong>. Please select which job
              this invoice should be linked to, or create a new job.
            </Typography>
          </Alert>

          {/* Search Field */}
          <TextField
            fullWidth
            placeholder="Search jobs by title, team, supervisor, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Job Count */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {filteredJobs.length === matchingJobs.length
              ? `${matchingJobs.length} active job${matchingJobs.length !== 1 ? 's' : ''} found`
              : `Showing ${filteredJobs.length} of ${matchingJobs.length} job${matchingJobs.length !== 1 ? 's' : ''}`}
          </Typography>

          {/* Jobs List */}
          <RadioGroup value={selectedJobId} onChange={(e) => handleJobSelect(Number(e.target.value))}>
            <Stack spacing={2}>
              {filteredJobs.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    color: 'text.secondary',
                  }}
                >
                  <Search sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1">No jobs found matching your search</Typography>
                  <Typography variant="body2">Try a different search term</Typography>
                </Box>
              ) : (
                filteredJobs.map((job) => (
                  <Card
                    key={job.id}
                    variant="outlined"
                    sx={{
                      border: selectedJobId === job.id ? 2 : 1,
                      borderColor: selectedJobId === job.id ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2,
                      },
                    }}
                  >
                    <CardActionArea onClick={() => handleJobSelect(job.id)}>
                      <CardContent>
                        <Box display="flex" alignItems="flex-start" gap={2}>
                          {/* Radio Button */}
                          <FormControlLabel
                            value={job.id}
                            control={<Radio />}
                            label=""
                            sx={{ m: 0 }}
                          />

                          {/* Job Details */}
                          <Box flex={1}>
                            {/* Title and Status */}
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={1}
                            >
                              <Typography variant="h6" component="div">
                                {job.title}
                              </Typography>
                              <Chip
                                label={formatStatus(job.status)}
                                color={getStatusColor(job.status)}
                                size="small"
                              />
                            </Box>

                            {/* Progress Bar */}
                            <Box mb={2}>
                              <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" color="text.secondary">
                                  Progress
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {job.progress}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={job.progress}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>

                            {/* Job Metadata */}
                            <Stack direction="row" spacing={3} flexWrap="wrap">
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Group fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {job.team_name}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {job.supervisor_name}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <CalendarToday fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  Started {formatDate(job.start_date)}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))
              )}
            </Stack>
          </RadioGroup>

          {/* Create New Job Option */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Card
            variant="outlined"
            sx={{
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <CardActionArea onClick={handleCreateNewJob}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Add color="primary" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="subtitle1" color="primary">
                      Create New Job Instead
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This invoice doesn't match any of the existing jobs
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} disabled={isLinking} startIcon={<Close />}>
          Cancel
        </Button>
        {selectedJobId ? (
          <LoadingButton
            onClick={handleConfirmSelection}
            loading={isLinking}
            variant="contained"
            startIcon={<CheckCircle />}
            loadingText="Linking..."
            sx={{ minWidth: 140 }}
          >
            Link to Job
          </LoadingButton>
        ) : (
          <Button
            disabled
            variant="contained"
            startIcon={<CheckCircle />}
            sx={{ minWidth: 140 }}
          >
            Link to Job
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default JobSelectionDialog;
