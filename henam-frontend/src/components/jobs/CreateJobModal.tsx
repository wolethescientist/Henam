import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete,
  FormHelperText,
} from '@mui/material';
import { Work, Add, Warning } from '@mui/icons-material';
import { 
  useGetJobAssignmentOptionsQuery,
  useCheckJobDuplicatesMutation,
  useGetClientsQuery,
  useCreateJobMutation,
} from '../../store/api/jobsApi';
import LoadingButton from '../common/LoadingButton';
import DuplicateWarningDialog from './DuplicateWarningDialog';
import { useToast } from '../../contexts/ToastContext';
import type { CreateJobForm } from '../../types';

interface CreateJobModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormErrors {
  title?: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  team_id?: string;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateJobForm>({
    title: '',
    client: '',
    start_date: '',
    end_date: '',
    team_id: 0,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientInputValue, setClientInputValue] = useState('');
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<any>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);

  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast();

  // Fetch assignment options (teams and supervisors)
  const { data: assignmentOptions, isLoading: isLoadingOptions } = useGetJobAssignmentOptionsQuery(undefined, {
    skip: !open,
    refetchOnMountOrArgChange: 300,
  });

  // Fetch clients for autocomplete
  const { data: clientsData } = useGetClientsQuery(undefined, {
    skip: !open,
  });

  // API mutations
  const [checkDuplicates] = useCheckJobDuplicatesMutation();
  const [createJob] = useCreateJobMutation();

  const teams = assignmentOptions?.teams || [];

  // Extract unique client names for autocomplete
  const clientSuggestions: string[] = clientsData?.map(c => c.client_name) || [];

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        client: '',
        start_date: '',
        end_date: '',
        team_id: teams.length > 0 ? teams[0].id : 0,
      });
      setErrors({});
      setClientInputValue('');
      setIsSubmitting(false);
      setIsCheckingDuplicates(false);
      setDuplicateCheckResult(null);
      setShowDuplicateWarning(false);
      setDuplicateCheckError(null);
    }
  }, [open, teams]);

  // Auto-trigger duplicate check when title and client are filled
  useEffect(() => {
    // Only check if modal is open and we have both title and client
    if (!open || !formData.title.trim() || !formData.client.trim()) {
      // Reset duplicate check state when fields are cleared
      if (open && (!formData.title.trim() || !formData.client.trim())) {
        setDuplicateCheckResult(null);
        setShowDuplicateWarning(false);
        setDuplicateCheckError(null);
      }
      return;
    }

    // Don't check if already checking or if we already have results for this combination
    if (isCheckingDuplicates || isSubmitting) {
      return;
    }

    // Debounce the check - wait for user to stop typing
    const timeoutId = setTimeout(async () => {
      // Perform the duplicate check without showing toasts (auto-check)
      try {
        setIsCheckingDuplicates(true);
        setDuplicateCheckResult(null);
        setDuplicateCheckError(null);
        setShowDuplicateWarning(false);

        const result = await checkDuplicates({
          client_name: formData.client,
          job_title: formData.title,
        }).unwrap();

        setDuplicateCheckResult(result);

        if (result.has_duplicates) {
          setShowDuplicateWarning(true);
        }
      } catch (error: any) {
        console.error('Failed to check duplicates:', error);
        const errorMsg = error?.data?.detail || 'Failed to check for duplicates. You can still proceed with creation.';
        setDuplicateCheckError(errorMsg);
        // Allow creation even if duplicate check fails
        setDuplicateCheckResult({ has_duplicates: false, matching_jobs: [], is_repeat_project: false });
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.title, formData.client, open, isCheckingDuplicates, isSubmitting, checkDuplicates]);

  // Validate a single field
  const validateField = (field: keyof CreateJobForm, value: any): string | undefined => {
    switch (field) {
      case 'title':
        if (!value || value.trim() === '') {
          return 'Job title is required';
        }
        if (value.length < 3) {
          return 'Job title must be at least 3 characters';
        }
        break;

      case 'client':
        if (!value || value.trim() === '') {
          return 'Client name is required';
        }
        if (value.length < 2) {
          return 'Client name must be at least 2 characters';
        }
        break;

      case 'start_date':
        if (!value) {
          return 'Start date is required';
        }
        // Check if start date is in the past (with 1 day tolerance)
        const startDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneDayAgo = new Date(today);
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        if (startDate < oneDayAgo) {
          return 'Start date cannot be in the past';
        }
        break;

      case 'end_date':
        if (!value) {
          return 'End date is required';
        }
        if (formData.start_date && value) {
          const start = new Date(formData.start_date);
          const end = new Date(value);
          if (end <= start) {
            return 'End date must be after start date';
          }
        }
        break;

      case 'team_id':
        if (!value || value === 0) {
          return 'Team selection is required';
        }
        break;
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Only validate fields that are in FormErrors type
    const fieldsToValidate: Array<keyof FormErrors> = ['title', 'client', 'start_date', 'end_date', 'team_id'];
    
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change with validation
  const handleInputChange = (field: keyof CreateJobForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (field in errors) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }

    // Validate field on blur (we'll add onBlur handlers)
  };

  // Handle field blur for validation
  const handleFieldBlur = (field: keyof CreateJobForm) => () => {
    const error = validateField(field, formData[field]);
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  // Handle client autocomplete change
  const handleClientChange = (_event: any, newValue: string | null) => {
    setFormData(prev => ({
      ...prev,
      client: newValue || '',
    }));

    // Clear error for client field
    if (errors.client) {
      setErrors(prev => ({
        ...prev,
        client: undefined,
      }));
    }
  };

  // Check for duplicates
  const handleCheckDuplicates = async (showToasts: boolean = false) => {
    // Validate required fields first
    if (!formData.title.trim() || !formData.client.trim()) {
      if (showToasts) {
        showError('Please enter job title and client name first');
      }
      return false;
    }

    setIsCheckingDuplicates(true);
    setDuplicateCheckResult(null);
    setDuplicateCheckError(null);
    setShowDuplicateWarning(false);

    try {
      const result = await checkDuplicates({
        client_name: formData.client,
        job_title: formData.title,
      }).unwrap();

      setDuplicateCheckResult(result);

      if (result.has_duplicates) {
        setShowDuplicateWarning(true);
        if (showToasts) {
          showWarning(`Found ${result.matching_jobs.length} similar job(s) for this client`);
        }
        return false; // Don't proceed with creation
      } else {
        if (showToasts) {
          showSuccess('No duplicates found - safe to proceed');
        }
        return true; // Safe to proceed
      }
    } catch (error: any) {
      console.error('Failed to check duplicates:', error);
      const errorMsg = error?.data?.detail || 'Failed to check for duplicates. You can still proceed with creation.';
      setDuplicateCheckError(errorMsg);
      if (showToasts) {
        showError(errorMsg);
      }
      // Allow creation even if duplicate check fails
      setDuplicateCheckResult({ has_duplicates: false, matching_jobs: [], is_repeat_project: false });
      return true; // Allow proceeding despite error
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (skipDuplicateCheck: boolean = false) => {
    // Validate form
    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    // Check for duplicates if not already checked and not skipping
    if (!skipDuplicateCheck && !duplicateCheckResult && formData.title && formData.client) {
      const canProceed = await handleCheckDuplicates();
      if (!canProceed) {
        return; // Let user review duplicates before proceeding
      }
    }

    setIsSubmitting(true);

    try {
      await createJob(formData).unwrap();

      showSuccess(`Job "${formData.title}" created successfully!`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error: any) {
      console.error('Failed to create job:', error);
      const errorMessage = error?.data?.detail || 'Failed to create job. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle creating job anyway (override duplicate warning)
  const handleCreateAnyway = (justification: string) => {
    setShowDuplicateWarning(false);
    // Store justification for the API call
    handleSubmitWithJustification(justification);
  };

  // Handle viewing existing job
  const handleViewExisting = (jobId: number) => {
    // For now, just close the modal and show a toast
    // In the future, this could navigate to the job details page
    showSuccess(`Navigating to job #${jobId}`);
    handleClose();
  };

  // Handle canceling duplicate warning
  const handleCancelDuplicateWarning = () => {
    setShowDuplicateWarning(false);
    setDuplicateCheckResult(null);
  };

  // Handle form submission with justification
  const handleSubmitWithJustification = async (_justification: string) => {
    setIsSubmitting(true);

    try {
      // TODO: In the future, pass justification to the API when backend supports it
      // For now, just create the job
      await createJob(formData).unwrap();

      showSuccess(`Job "${formData.title}" created successfully (duplicate override applied)`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error: any) {
      console.error('Failed to create job:', error);
      const errorMessage = error?.data?.detail || 'Failed to create job. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Check if form is valid (for submit button state)
  const isFormValid = () => {
    return (
      formData.title.trim() !== '' &&
      formData.client.trim() !== '' &&
      formData.start_date !== '' &&
      formData.end_date !== '' &&
      formData.team_id !== 0 &&
      Object.keys(errors).length === 0
    );
  };

  if (isLoadingOptions) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading form options...
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
          <Work color="primary" />
          <Typography variant="h6">
            Create New Job
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Create a job manually before an invoice is received. The system will check for duplicates before creation.
          </Alert>

          {/* Job Title */}
          <TextField
            fullWidth
            label="Job Title"
            value={formData.title}
            onChange={handleInputChange('title')}
            onBlur={handleFieldBlur('title')}
            margin="normal"
            required
            error={!!errors.title}
            helperText={errors.title}
            placeholder="e.g., Website Redesign, Mobile App Development"
          />

          {/* Client Name with Autocomplete */}
          <Autocomplete
            freeSolo
            options={clientSuggestions}
            value={formData.client}
            onChange={handleClientChange}
            inputValue={clientInputValue}
            onInputChange={(_event, newInputValue) => {
              setClientInputValue(newInputValue);
              setFormData(prev => ({
                ...prev,
                client: newInputValue,
              }));
            }}
            onBlur={handleFieldBlur('client')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Client Name"
                margin="normal"
                required
                error={!!errors.client}
                helperText={errors.client || 'Start typing to see suggestions from existing clients'}
                placeholder="e.g., Acme Corporation"
              />
            )}
          />

          {/* Team Selection */}
          <FormControl 
            fullWidth 
            margin="normal" 
            required 
            error={!!errors.team_id}
          >
            <InputLabel>Team</InputLabel>
            <Select
              value={formData.team_id || ''}
              onChange={handleInputChange('team_id')}
              onBlur={handleFieldBlur('team_id')}
              label="Team"
            >
              {teams.length === 0 && (
                <MenuItem value="" disabled>
                  No teams available
                </MenuItem>
              )}
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  <Box>
                    <Typography variant="body1">{team.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {team.supervisor?.name || 'No supervisor'} • {team.member_count || 0} members
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.team_id && (
              <FormHelperText>{errors.team_id}</FormHelperText>
            )}
          </FormControl>

          {/* Date Fields */}
          <Box display="flex" gap={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange('start_date')}
              onBlur={handleFieldBlur('start_date')}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
              error={!!errors.start_date}
              helperText={errors.start_date}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={handleInputChange('end_date')}
              onBlur={handleFieldBlur('end_date')}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
              error={!!errors.end_date}
              helperText={errors.end_date}
            />
          </Box>

          {/* Loading State During Duplicate Check */}
          {isCheckingDuplicates && (
            <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mt: 3 }}>
              <Typography variant="body2">
                Checking for duplicate jobs...
              </Typography>
            </Alert>
          )}

          {/* Duplicate Check Error */}
          {duplicateCheckError && !isCheckingDuplicates && (
            <Alert severity="error" sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Duplicate Check Failed
              </Typography>
              <Typography variant="body2">
                {duplicateCheckError}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                You can still proceed with job creation.
              </Typography>
            </Alert>
          )}

          {/* Duplicate Check Results - Warning (Simple Alert) */}
          {showDuplicateWarning && duplicateCheckResult && duplicateCheckResult.has_duplicates && (
            <Alert severity="warning" icon={<Warning />} sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                ⚠️ Similar Jobs Found
              </Typography>
              <Typography variant="body2">
                {duplicateCheckResult.matching_jobs.length} similar job(s) found for this client.
                Please review before creating.
              </Typography>
            </Alert>
          )}

          {/* Duplicate Check Results - No Duplicates */}
          {duplicateCheckResult && !duplicateCheckResult.has_duplicates && !isCheckingDuplicates && (
            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                ✓ No duplicate jobs found. Safe to proceed.
              </Typography>
            </Alert>
          )}

          {/* Repeat Project Indicator */}
          {duplicateCheckResult && duplicateCheckResult.is_repeat_project && !duplicateCheckResult.has_duplicates && !isCheckingDuplicates && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                🔄 Repeat Project Detected
              </Typography>
              <Typography variant="body2">
                This client has completed similar projects before. Consider reviewing previous job settings.
              </Typography>
              {duplicateCheckResult.previous_job && (
                <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Previous: {duplicateCheckResult.previous_job.title} (Completed)
                  </Typography>
                </Box>
              )}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting || isCheckingDuplicates}>
          Cancel
        </Button>
        
        {/* Check Duplicates Button - shown when form is valid but not checked yet */}
        {isFormValid() && !duplicateCheckResult && !showDuplicateWarning && (
          <LoadingButton
            onClick={() => handleCheckDuplicates(true)}
            loading={isCheckingDuplicates}
            variant="outlined"
            loadingText="Checking..."
            sx={{ minWidth: 140 }}
          >
            Check Duplicates
          </LoadingButton>
        )}
        
        {/* Create Button - shown after duplicate check passes or when no duplicates */}
        {!showDuplicateWarning && duplicateCheckResult && !duplicateCheckResult.has_duplicates && (
          <LoadingButton
            onClick={() => handleSubmit(false)}
            loading={isSubmitting}
            variant="contained"
            startIcon={<Add />}
            loadingText="Creating..."
            sx={{ minWidth: 140 }}
          >
            Create Job
          </LoadingButton>
        )}
      </DialogActions>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        open={showDuplicateWarning && duplicateCheckResult?.has_duplicates === true}
        newJobData={formData}
        matchingJobs={duplicateCheckResult?.matching_jobs || []}
        isRepeatProject={duplicateCheckResult?.is_repeat_project || false}
        previousJob={duplicateCheckResult?.previous_job}
        suggestion={duplicateCheckResult?.suggestion}
        onViewExisting={handleViewExisting}
        onCreateAnyway={handleCreateAnyway}
        onCancel={handleCancelDuplicateWarning}
        isCreating={isSubmitting}
      />
    </Dialog>
  );
};

export default CreateJobModal;
