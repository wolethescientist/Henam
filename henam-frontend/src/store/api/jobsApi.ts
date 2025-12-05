import { baseApi } from './baseApi';
import type { Job, JobDisplayResponse, CreateJobForm, PaginatedResponse } from '../../types';

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<PaginatedResponse<Job>, { 
      page?: number; 
      limit?: number; 
      search?: string; 
      status_filter?: string;
      supervisor_filter?: number;
      month?: number;
      year?: number;
      week?: number;
      start_date?: string;
      end_date?: string;
    }>({
      query: (params) => ({
        url: '/jobs',
        params,
      }),
      providesTags: ['Job'],
    }),
    getJob: builder.query<Job, number>({
      query: (id) => `/jobs/${id}`,
      providesTags: (_, __, id) => [{ type: 'Job', id }],
    }),
    createJob: builder.mutation<Job, CreateJobForm>({
      query: ({ skip_duplicate_check, duplicate_justification, ...job }) => ({
        url: '/jobs',
        method: 'POST',
        body: job,
        params: {
          ...(skip_duplicate_check !== undefined && { skip_duplicate_check }),
          ...(duplicate_justification && { duplicate_justification }),
        },
      }),
      invalidatesTags: ['Job', 'Dashboard', 'FinancialSummary', 'Client'],
      // Task 15.1: Add optimistic updates and comprehensive cache invalidation
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          
          // Invalidate client cache after job creation
          dispatch(baseApi.util.invalidateTags(['Job', 'Client']));
          
          // Add small delay to ensure cache invalidation propagates
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Job creation failed:', error);
        }
      },
    }),
    updateJob: builder.mutation<Job, { id: number; data: Partial<CreateJobForm> }>({
      query: ({ id, data }) => ({
        url: `/jobs/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Job', id }, 'Dashboard', 'FinancialSummary'],
      // Force refetch of unified data
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate unified jobs data
          dispatch(baseApi.util.invalidateTags(['Job', 'Team']));
        } catch {}
      },
    }),
    deleteJob: builder.mutation<void, number>({
      query: (id) => ({
        url: `/jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Job', 'Dashboard', 'FinancialSummary'],
    }),
    updateJobProgress: builder.mutation<{ message: string }, { id: number; progress: number }>({
      query: ({ id, progress }) => ({
        url: `/jobs/${id}/progress`,
        method: 'PATCH',
        body: { progress },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Job', id }, 'Dashboard', 'FinancialSummary'],
      // Force refetch of unified data
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate unified jobs data
          dispatch(baseApi.util.invalidateTags(['Job']));
        } catch {}
      },
    }),
    attachInvoiceToJob: builder.mutation<{ message: string }, { jobId: number; invoiceId: number }>({
      query: ({ jobId, invoiceId }) => ({
        url: `/jobs/${jobId}/invoice`,
        method: 'POST',
        body: { invoice_id: invoiceId },
      }),
      invalidatesTags: (_, __, { jobId }) => [{ type: 'Job', id: jobId }, 'Dashboard', 'FinancialSummary'],
    }),
    assignJob: builder.mutation<{ message: string; job_id: number; supervisor_id: number; team_id: number }, { jobId: number; supervisorId: number; teamId: number }>({
      query: ({ jobId, supervisorId, teamId }) => ({
        url: '/jobs/assign',
        method: 'POST',
        body: { job_id: jobId, supervisor_id: supervisorId, team_id: teamId },
      }),
      invalidatesTags: ['Job', 'Dashboard', 'FinancialSummary'],
    }),
    assignJobToTeamOrUser: builder.mutation<{ message: string; job_id: number }, { jobId: number; assignmentType: 'team' | 'user'; targetId: number }>({
      query: ({ jobId, assignmentType, targetId }) => ({
        url: `/jobs/${jobId}/assign`,
        method: 'PATCH',
        body: { assignment_type: assignmentType, target_id: targetId },
        headers: {
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
        },
      }),
      invalidatesTags: ['Job', 'Team', 'User', 'Dashboard', 'FinancialSummary'],
      // Force aggressive cache invalidation
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate ALL related cache entries
          dispatch(baseApi.util.invalidateTags(['Job', 'Team', 'User', 'Dashboard']));
          
          // Add small delay to ensure cache invalidation propagates
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Assignment failed:', error);
        }
      },
    }),
    getJobsProgressSummary: builder.query<{
      total_jobs: number;
      not_started: number;
      in_progress: number;
      completed: number;
      average_progress: number;
    }, void>({
      query: () => ({
        url: '/jobs/progress-summary',
        method: 'GET',
      }),
      providesTags: ['Job'],
    }),
    getJobsForDashboard: builder.query<JobDisplayResponse[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/jobs/dashboard',
        params,
      }),
      providesTags: ['Job'],
    }),
    getMyJobs: builder.query<Job[], { page?: number; limit?: number; status_filter?: string }>({
      query: (params) => ({
        url: '/jobs/my-jobs',
        params,
      }),
      providesTags: ['Job'],
    }),
    getJobsAssignedByMe: builder.query<Job[], { page?: number; limit?: number; status_filter?: string }>({
      query: (params) => ({
        url: '/jobs/assigned-by-me',
        params,
      }),
      providesTags: ['Job'],
    }),
    getJobAssignmentOptions: builder.query<{
      teams: Array<{
        id: number;
        name: string;
        supervisor?: { id: number; name: string; email: string };
        member_count: number;
        members: Array<{ id: number; name: string; email: string }>;
      }>;
      users: Array<{
        id: number;
        name: string;
        email: string;
        team?: { id: number; name: string };
        is_supervisor: boolean;
      }>;
      total_teams: number;
      total_users: number;
    }, void>({
      query: () => '/jobs/assignment-options',
      providesTags: ['Job', 'Team', 'User'],
    }),
    checkJobDuplicates: builder.mutation<{
      has_duplicates: boolean;
      matching_jobs: Array<{
        id: number;
        title: string;
        client: string;
        status: string;
        progress: number;
        team_name: string;
        supervisor_name: string;
        start_date: string;
        created_at: string;
      }>;
      is_repeat_project: boolean;
      previous_job?: {
        id: number;
        title: string;
        client: string;
        status: string;
        progress: number;
        team_name: string;
        supervisor_name: string;
        start_date: string;
        created_at: string;
      };
      suggestion: string;
    }, { client_name: string; job_title: string }>({
      query: (data) => ({
        url: '/jobs/check-duplicates',
        method: 'POST',
        body: data,
      }),
    }),
    getClients: builder.query<Array<{
      client_name: string;
      total_jobs: number;
      active_jobs: number;
      completed_jobs: number;
      total_billed: number;
      total_paid: number;
      total_pending: number;
      last_job_date: string;
    }>, void>({
      query: () => '/jobs/clients',
      providesTags: ['Job', 'Client'],
    }),
    getJobsByClient: builder.query<Job[], { client_name: string; include_completed?: boolean }>({
      query: ({ client_name, include_completed = false }) => ({
        url: `/jobs/by-client/${encodeURIComponent(client_name)}`,
        params: { include_completed },
      }),
      providesTags: (_result, _error, { client_name }) => [
        'Job',
        { type: 'Client' as const, id: client_name },
      ],
    }),
    getJobAuditLog: builder.query<PaginatedResponse<{
      id: number;
      event_type: string;
      user_name: string;
      timestamp: string;
      event_data: any;
      description: string;
    }>, { jobId: number; page?: number; limit?: number }>({
      query: ({ jobId, page = 1, limit = 50 }) => ({
        url: `/jobs/${jobId}/audit-log`,
        params: { page, limit },
      }),
      providesTags: (_, __, { jobId }) => [{ type: 'Job', id: jobId }],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useUpdateJobProgressMutation,
  useAttachInvoiceToJobMutation,
  useAssignJobMutation,
  useAssignJobToTeamOrUserMutation,
  useGetJobsProgressSummaryQuery,
  useGetJobsForDashboardQuery,
  useGetMyJobsQuery,
  useGetJobsAssignedByMeQuery,
  useGetJobAssignmentOptionsQuery,
  useCheckJobDuplicatesMutation,
  useGetClientsQuery,
  useGetJobsByClientQuery,
  useGetJobAuditLogQuery,
} = jobsApi;
