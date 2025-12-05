import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Chip,
  Paper,
  Divider,
  Alert,
  Stack,
} from '@mui/material';
import {
  Warning,
  Visibility,
  Add,
  Close,
  Repeat,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import LoadingButton from '../common/LoadingButton';
import { useToast } from '../../contexts/ToastContext';
import type { CreateJobForm } from '../../types';

interface JobSummary {
  id: number;
  title: string;
  client: string;
  status: string;
  progress: number;
  team_name: string;
  supervisor_name: string;
  start_date: string;
  created_at: string;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  newJobData: CreateJobForm;
  matchingJobs: JobSummary[];
  isRepeatProject: boolean;
  previousJob?: JobSummary;
  suggestion?: string;
  onViewExisting: (jobId: number) => void;
  onCreateAnyway: (justification: string) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

const DuplicateWarningDialog: React.FC<DuplicateWarningDialogProps> = ({
  open,
  newJobData,
  matchingJobs,
  isRepeatProject,
  previousJob,
  suggestion,
  onViewExisting,
  onCreateAnyway,
  onCancel,
  isCreating = false,
}) => {
  const [justification, setJustification] = useState('');
  const [showJustificationField, setShowJustificationField] = useState(false);
  
  // Toast notifications
  const { showWarning } = useToast();

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setJustification('');
      setShowJustificationField(false);
    }
  }, [open]);

  const handleCreateAnyway = () => {
    if (!showJustificationField) {
      setShowJustificationField(true);
      showWarning('Please provide a justification for creating this duplicate job');
      return;
    }

    if (justification.trim()) {
      onCreateAnyway(justification.trim());
    } else {
      showWarning('Justification is required to proceed with duplicate creation');
    }
  };

  const handleCancel = () => {
    setShowJustificationField(false);
    setJustification('');
    onCancel();
  };

  // Format status for display
  const formatStatus = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get status color
  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'not_started':
        return 'warning';
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
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  // Check if there are differences between new and existing job
  const getDifferences = (existingJob: JobSummary): string[] => {
    const differences: string[] = [];
    
    if (newJobData.title !== existingJob.title) {
      differences.push('title');
    }
    if (newJobData.client !== existingJob.client) {
      differences.push('client');
    }
    if (newJobData.start_date !== existingJob.start_date) {
      differences.push('start_date');
    }
    
    return differences;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="warning" fontSize="large" />
          <Box flex={1}>
            <Typography variant="h6" component="div">
              Duplicate Job Warning
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Similar jobs found for this client
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Suggestion Alert */}
          {suggestion && (
            <Alert severity="warning" icon={<Info />}>
              {suggestion}
            </Alert>
          )}

          {/* Repeat Project Indicator */}
          {isRepeatProject && (
            <Alert 
              severity="info" 
              icon={<Repeat />}
              sx={{ bgcolor: 'info.lighter' }}
            >
              <Typography variant="subtitle2" gutterBottom>
                <strong>Repeat Project Detected</strong>
              </Typography>
              <Typography variant="body2">
                This client has completed similar projects before. Consider:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>
                  <Typography variant="body2">
                    Reviewing previous job settings and team assignments
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Appending a sequence number or date to distinguish this iteration
                    (e.g., "{newJobData.title} - Phase 2" or "{newJobData.title} - {new Date().getFullYear()}")
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Copying successful configurations from the previous project
                  </Typography>
                </li>
              </Box>
              {previousJob && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Previous Completed Project:</strong>
                  </Typography>
                  <Typography variant="body2">
                    {previousJob.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Team: {previousJob.team_name} • Supervisor: {previousJob.supervisor_name}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}

          {/* New Job Data */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.lighter', border: '2px solid', borderColor: 'primary.main' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Add color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                New Job You're Creating
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {newJobData.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Client
                  </Typography>
                  <Typography variant="body2">
                    {newJobData.client}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(newJobData.start_date)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    End Date
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(newJobData.end_date)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box>
                    <Chip 
                      label="Not Started" 
                      size="small" 
                      color="warning"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Divider>
            <Chip label="VS" size="small" />
          </Divider>

          {/* Existing Jobs */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Existing Active Jobs ({matchingJobs.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              These jobs are currently active for the same client
            </Typography>

            <Stack spacing={2} sx={{ mt: 2 }}>
              {matchingJobs.map((job) => {
                const differences = getDifferences(job);
                
                return (
                  <Paper 
                    key={job.id}
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => onViewExisting(job.id)}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={1.5}>
                      <Box flex={1}>
                        <Typography variant="body1" fontWeight={600}>
                          {job.title}
                          {differences.length === 0 && (
                            <Chip 
                              label="Exact Match" 
                              size="small" 
                              color="error"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Job ID: #{job.id}
                        </Typography>
                      </Box>
                      <Chip 
                        label={formatStatus(job.status)}
                        size="small"
                        color={getStatusColor(job.status)}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Client
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{
                              color: differences.includes('client') ? 'warning.main' : 'text.primary',
                              fontWeight: differences.includes('client') ? 600 : 400,
                            }}
                          >
                            {job.client}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progress
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              {job.progress}%
                            </Typography>
                            {job.progress === 100 && (
                              <CheckCircle color="success" fontSize="small" />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Team
                          </Typography>
                          <Typography variant="body2">
                            {job.team_name}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Supervisor
                          </Typography>
                          <Typography variant="body2">
                            {job.supervisor_name}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Start Date
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{
                              color: differences.includes('start_date') ? 'warning.main' : 'text.primary',
                              fontWeight: differences.includes('start_date') ? 600 : 400,
                            }}
                          >
                            {formatDate(job.start_date)}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Created
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(job.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {differences.length > 0 && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="warning.main">
                          ⚠️ Differences: {differences.map(d => d.replace(/_/g, ' ')).join(', ')}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewExisting(job.id);
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Box>

          {/* Justification Field */}
          {showJustificationField && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Please provide a reason for creating this job despite the duplicates found.
                  This will be logged for audit purposes.
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Justification (Required)"
                placeholder="e.g., This is a different phase of the project, or the existing job is for a different scope..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                error={showJustificationField && !justification.trim()}
                helperText={
                  showJustificationField && !justification.trim()
                    ? 'Justification is required to proceed'
                    : 'Explain why this is not a duplicate'
                }
                autoFocus
              />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleCancel}
          startIcon={<Close />}
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={() => onViewExisting(matchingJobs[0]?.id)}
          startIcon={<Visibility />}
          disabled={isCreating || matchingJobs.length === 0}
        >
          View Existing
        </Button>
        {!isCreating && showJustificationField && !justification.trim() ? (
          <Button
            variant="contained"
            color="warning"
            onClick={handleCreateAnyway}
            startIcon={<Add />}
            disabled
          >
            Confirm & Create
          </Button>
        ) : (
          <LoadingButton
            variant="contained"
            color={showJustificationField ? 'warning' : 'primary'}
            onClick={handleCreateAnyway}
            startIcon={<Add />}
            loading={isCreating}
            loadingText="Creating..."
          >
            {showJustificationField ? 'Confirm & Create' : 'Create Anyway'}
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DuplicateWarningDialog;
