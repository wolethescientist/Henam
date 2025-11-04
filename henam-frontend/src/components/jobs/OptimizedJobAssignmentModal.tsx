import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  Card,
  CardContent,
  Fade,
} from '@mui/material';
import { Assignment, Person, Group, CheckCircleOutline, CheckCircle } from '@mui/icons-material';
import { useAssignJobToTeamOrUserMutation, useGetJobAssignmentOptionsQuery } from '../../store/api/jobsApi';
import LoadingButton from '../common/LoadingButton';
import toast from 'react-hot-toast';

interface OptimizedJobAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  currentTeamId?: number;
  currentSupervisorId?: number;
  onSuccess?: (timestamp?: number) => void | Promise<void>; // Callback for successful assignment with optional timestamp
}

const OptimizedJobAssignmentModal: React.FC<OptimizedJobAssignmentModalProps> = ({
  open,
  onClose,
  jobId,
  jobTitle,
  currentTeamId,
  currentSupervisorId,
  onSuccess,
}) => {
  const [assignmentType, setAssignmentType] = useState<'team' | 'user'>('team');
  const [selectedTargetId, setSelectedTargetId] = useState<number | ''>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignJobToTeamOrUser, { isLoading, error }] = useAssignJobToTeamOrUserMutation();

  // Dedicated API call for assignment options - only fetch when modal is open
  const { data: assignmentOptions, isLoading: isLoadingData } = useGetJobAssignmentOptionsQuery(undefined, {
    skip: !open, // Only fetch when modal is actually open
    refetchOnMountOrArgChange: 300, // Cache for 5 minutes
  });

  const teams = assignmentOptions?.teams || [];
  const users = assignmentOptions?.users || [];

  // Pre-fill current assignment when modal opens
  useEffect(() => {
    if (open) {
      if (currentTeamId) {
        setAssignmentType('team');
        setSelectedTargetId(currentTeamId);
      } else if (currentSupervisorId) {
        setAssignmentType('user');
        setSelectedTargetId(currentSupervisorId);
      } else {
        setAssignmentType('team');
        setSelectedTargetId('');
      }
      setShowSuccess(false);
    }
  }, [open, currentTeamId, currentSupervisorId]);

  const handleAssign = async () => {
    if (!selectedTargetId) {
      toast.error('Please select a team or user to assign the job to');
      return;
    }

    try {
      await assignJobToTeamOrUser({
        jobId,
        assignmentType,
        targetId: selectedTargetId as number,
      }).unwrap();
      
      // Show success state
      setShowSuccess(true);
      
      // Show success toast
      const targetName = assignmentType === 'team' 
        ? teams.find(t => t.id === selectedTargetId)?.name 
        : users.find(s => s.id === selectedTargetId)?.name;
      
      toast.success(`Job successfully assigned to ${assignmentType === 'team' ? 'team' : 'user'}: ${targetName}`);
      
      // Trigger success callback first to refetch data
      if (onSuccess) {
        const timestamp = Date.now();
        await onSuccess(timestamp);
      }
      
      // Then close modal after data is refreshed
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      console.error('Failed to assign job:', error);
      toast.error('Failed to assign job. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedTargetId('');
    setShowSuccess(false);
    onClose();
  };

  // Get selected target details for preview
  const getSelectedTargetDetails = () => {
    if (!selectedTargetId) return null;
    
    if (assignmentType === 'team') {
      const team = teams.find(t => t.id === selectedTargetId);
      return team ? {
        name: team.name,
        type: 'team',
        supervisor: team.supervisor?.name || 'No supervisor assigned',
        memberCount: team.member_count || 0,
        icon: <Group color="primary" />
      } : null;
    } else {
      const user = users.find(s => s.id === selectedTargetId);
      return user ? {
        name: user.name,
        type: 'user',
        email: user.email || 'No email',
        team: user.team?.name || 'No team assigned',
        isSupervisor: user.is_supervisor,
        icon: <Person color="primary" />
      } : null;
    }
  };

  const selectedDetails = getSelectedTargetDetails();

  if (isLoadingData) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading assignment options...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Assignment color="primary" />
          <Typography variant="h6">
            {showSuccess ? 'Assignment Successful!' : 'Assign Job'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Job Info */}
          <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Job to Assign:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {jobTitle}
              </Typography>
            </CardContent>
          </Card>

          {showSuccess ? (
            <Fade in={showSuccess}>
              <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h6" color="success.main" gutterBottom>
                  Job Assigned Successfully!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  The job has been assigned and notifications have been sent.
                </Typography>
              </Box>
            </Fade>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to assign job. Please try again.
                </Alert>
              )}

              {/* Assignment Type Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Assignment Type:
                </Typography>
                <Box display="flex" gap={2}>
                  <Button
                    variant={assignmentType === 'team' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setAssignmentType('team');
                      setSelectedTargetId('');
                    }}
                    startIcon={<Group />}
                    sx={{ flex: 1 }}
                  >
                    Assign to Team
                  </Button>
                  <Button
                    variant={assignmentType === 'user' ? 'contained' : 'outlined'}
                    onClick={() => {
                      setAssignmentType('user');
                      setSelectedTargetId('');
                    }}
                    startIcon={<Person />}
                    sx={{ flex: 1 }}
                  >
                    Assign to User
                  </Button>
                </Box>
              </Box>

              {/* Target Selection */}
              <FormControl fullWidth margin="normal">
                <InputLabel>
                  {assignmentType === 'team' ? 'Select Team' : 'Select User'}
                </InputLabel>
                <Select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value as number)}
                  label={assignmentType === 'team' ? 'Select Team' : 'Select User'}
                >
                  {assignmentType === 'team' ? (
                    teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <Group fontSize="small" />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="body1">{team.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team.supervisor?.name || 'No supervisor'} • {team.member_count || 0} members
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))
                  ) : (
                    users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                            {user.name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="body1">{user.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email || 'No email'} • {user.team?.name || 'No team'}
                              {user.is_supervisor && ' • Supervisor'}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Assignment Preview */}
              {selectedDetails && (
                <Card sx={{ mt: 3, border: '2px solid', borderColor: 'primary.main' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      {selectedDetails.icon}
                      <Typography variant="subtitle1" color="primary">
                        Assignment Preview
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {selectedDetails.name}
                      </Typography>
                      {assignmentType === 'team' ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Supervisor:</strong> {selectedDetails.supervisor}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Members:</strong> {selectedDetails.memberCount} team members
                          </Typography>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Email:</strong> {selectedDetails.email}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Team:</strong> {selectedDetails.team}
                          </Typography>
                          {selectedDetails.isSupervisor && (
                            <Typography variant="body2" color="primary">
                              <strong>Role:</strong> Team Supervisor
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {!showSuccess && (
          <>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton
              onClick={!selectedTargetId ? undefined : handleAssign}
              loading={isLoading}
              variant="contained"
              startIcon={<Assignment />}
              loadingText="Assigning..."
              sx={{ 
                minWidth: 140,
                opacity: !selectedTargetId ? 0.6 : 1,
                pointerEvents: !selectedTargetId ? 'none' : 'auto'
              }}
            >
              Assign Job
            </LoadingButton>
          </>
        )}
        {showSuccess && (
          <Button onClick={handleClose} variant="contained" startIcon={<CheckCircleOutline />}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OptimizedJobAssignmentModal;
