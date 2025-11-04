import { useCallback } from 'react';
import { 
  useCreateJobMutation, 
  useUpdateJobMutation, 
  useDeleteJobMutation, 
  useUpdateJobProgressMutation,
  useAssignJobMutation 
} from '../store/api/jobsApi';
import { useApiWithNotifications } from './useApiWithNotifications';
import type { CreateJobForm } from '../types';

export const useJobsWithNotifications = () => {
  const { executeWithNotifications } = useApiWithNotifications();
  
  const [createJobMutation] = useCreateJobMutation();
  const [updateJobMutation] = useUpdateJobMutation();
  const [deleteJobMutation] = useDeleteJobMutation();
  const [updateJobProgressMutation] = useUpdateJobProgressMutation();
  const [assignJobMutation] = useAssignJobMutation();

  const createJob = useCallback(async (jobData: CreateJobForm) => {
    return await executeWithNotifications(
      () => createJobMutation(jobData).unwrap(),
      {
        loadingMessage: 'Creating job...',
        successMessage: `Job "${jobData.title}" created successfully! Email notifications sent to all users.`,
        errorMessage: 'Failed to create job',
      }
    );
  }, [createJobMutation, executeWithNotifications]);

  const updateJob = useCallback(async (id: number, data: Partial<CreateJobForm>) => {
    return await executeWithNotifications(
      () => updateJobMutation({ id, data }).unwrap(),
      {
        loadingMessage: 'Updating job...',
        successMessage: `Job updated successfully! Email notifications sent to job participants.`,
        errorMessage: 'Failed to update job',
      }
    );
  }, [updateJobMutation, executeWithNotifications]);

  const deleteJob = useCallback(async (id: number) => {
    return await executeWithNotifications(
      () => deleteJobMutation(id).unwrap(),
      {
        loadingMessage: 'Deleting job...',
        successMessage: 'Job deleted successfully!',
        errorMessage: 'Failed to delete job',
      }
    );
  }, [deleteJobMutation, executeWithNotifications]);

  const updateJobProgress = useCallback(async (id: number, progress: number) => {
    return await executeWithNotifications(
      () => updateJobProgressMutation({ id, progress }).unwrap(),
      {
        loadingMessage: 'Updating job progress...',
        successMessage: `Job progress updated to ${progress}%! Email notifications sent to job participants.`,
        errorMessage: 'Failed to update job progress',
      }
    );
  }, [updateJobProgressMutation, executeWithNotifications]);

  const assignJob = useCallback(async (jobId: number, supervisorId: number, teamId: number) => {
    return await executeWithNotifications(
      () => assignJobMutation({ jobId, supervisorId, teamId }).unwrap(),
      {
        loadingMessage: 'Assigning job...',
        successMessage: 'Job assigned successfully! Email notifications sent to supervisor and team members.',
        errorMessage: 'Failed to assign job',
      }
    );
  }, [assignJobMutation, executeWithNotifications]);

  return {
    createJob,
    updateJob,
    deleteJob,
    updateJobProgress,
    assignJob,
  };
};
