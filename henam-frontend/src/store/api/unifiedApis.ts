import { baseApi } from './baseApi';
import type { 
  Team, 
  User, 
  Job, 
  Task, 
  Invoice, 
  Attendance,
} from '../../types';

// Pagination types
export interface PaginationMeta {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_page?: number;
  previous_page?: number;
  start_index: number;
  end_index: number;
}

// Unified Teams API
export const unifiedTeamsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedTeamsData: builder.query<{
      teams: Team[];
      supervisors: User[];
      available_staff: User[];
      pagination: PaginationMeta;
    }, {
      page?: number;
      limit?: number;
      search?: string;
    }>({
      query: (params) => ({
        url: '/unified/teams',
        params,
      }),
      providesTags: ['Team', 'User'],
    }),
  }),
});

// Unified Jobs API
export const unifiedJobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedJobsData: builder.query<{
      jobs: Job[];
      teams: Team[];
      invoices_by_job: Record<number, Invoice[]>;
      pagination: PaginationMeta;
    }, {
      page?: number;
      limit?: number;
      search?: string;
      status_filter?: string;
      team_id?: number;
      supervisor_filter?: number;
      month?: number;
      year?: number;
      week?: number;
      start_date?: string;
      end_date?: string;
      forceRefresh?: boolean;
      timestamp?: number;
    }>({
      query: (params) => {
        const { forceRefresh, timestamp, ...queryParams } = params;
        return {
          url: '/unified/jobs',
          params: {
            ...queryParams,
            // Add timestamp to force cache refresh
            ...(timestamp && { _t: timestamp }),
          },
          headers: {
            ...(forceRefresh && { 'X-Force-Refresh': 'true' }),
            'Cache-Control': 'no-cache',
          },
        };
      },
      providesTags: ['Job', 'Team', 'Invoice'],
      // Don't keep any unused data - always refetch after invalidation
      keepUnusedDataFor: 0,
      // Force refetch when parameters change
      serializeQueryArgs: ({ queryArgs }) => {
        // Create a stable cache key that includes all filter parameters
        const { page, limit, search, status_filter, team_id, supervisor_filter, month, year, week, start_date, end_date } = queryArgs;
        return JSON.stringify({ page, limit, search, status_filter, team_id, supervisor_filter, month, year, week, start_date, end_date });
      },
    }),
  }),
});

// Unified Tasks API
export const unifiedTasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedTasksData: builder.query<{
      tasks: Task[];
      users: User[];
      jobs: Job[];
      pagination: PaginationMeta;
    }, {
      page?: number;
      limit?: number;
      search?: string;
      status_filter?: string;
      priority_filter?: string;
      assigned_to_id?: number;
    }>({
      query: (params) => ({
        url: '/unified/tasks',
        params,
      }),
      providesTags: ['Task', 'User', 'Job'],
    }),
  }),
});

// Unified Invoices API
export const unifiedInvoicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedInvoicesData: builder.query<{
      invoices: Invoice[];
      jobs: Job[];
      overdue_invoices: Invoice[];
      pagination: PaginationMeta;
    }, {
      page?: number;
      limit?: number;
      search?: string;
      status_filter?: string;
      team_id?: number;
    }>({
      query: (params) => ({
        url: '/unified/invoices',
        params,
      }),
      providesTags: ['Invoice', 'Job'],
    }),
  }),
});

// Unified Attendance API
export const unifiedAttendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedAttendanceData: builder.query<{
      attendance_records: Attendance[];
      stats: {
        total_records: number;
        present_count: number;
        absent_count: number;
        late_count: number;
      };
      total_count: number;
    }, {
      page?: number;
      limit?: number;
      search?: string;
      user_id?: number;
      team_id?: number;
    }>({
      query: (params) => ({
        url: '/unified/attendance',
        params,
      }),
      providesTags: ['Attendance', 'User'],
    }),
  }),
});

// Unified Staff API
export const unifiedStaffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedStaffData: builder.query<{
      staff_data: User[];
      teams: Team[];
      supervisors: User[];
      total_count: number;
    }, {
      page?: number;
      limit?: number;
      search?: string;
      team_id?: number;
    }>({
      query: (params) => ({
        url: '/unified/staff',
        params,
      }),
      providesTags: ['User', 'Team'],
    }),
    getStaffDropdownData: builder.query<{
      teams: Team[];
      supervisors: User[];
    }, void>({
      query: () => ({
        url: '/unified/staff/dropdowns',
      }),
      providesTags: ['Team', 'User'],
    }),
  }),
});

// Export hooks
export const {
  useGetUnifiedTeamsDataQuery,
} = unifiedTeamsApi;

export const {
  useGetUnifiedJobsDataQuery,
} = unifiedJobsApi;

export const {
  useGetUnifiedTasksDataQuery,
} = unifiedTasksApi;

export const {
  useGetUnifiedInvoicesDataQuery,
} = unifiedInvoicesApi;

export const {
  useGetUnifiedAttendanceDataQuery,
} = unifiedAttendanceApi;

export const {
  useGetUnifiedStaffDataQuery,
  useGetStaffDropdownDataQuery,
} = unifiedStaffApi;
