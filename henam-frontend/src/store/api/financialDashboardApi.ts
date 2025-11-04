import { baseApi } from './baseApi';
import type { 
  FinancialSummary, 
  JobFinancial, 
  FinancialFilter,
  TeamFinancialSummary,
  ClientFinancialSummary,
  MonthlyTrend
} from '../../types';

export const financialDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFinancialSummary: builder.query<FinancialSummary, void>({
      query: () => '/financial/dashboard',
      providesTags: ['FinancialSummary'],
    }),
    getJobFinancials: builder.query<JobFinancial[], FinancialFilter>({
      query: (filters) => ({
        url: '/financial/jobs',
        method: 'POST',
        body: filters,
      }),
      providesTags: ['JobFinancial'],
    }),
    getOverdueJobs: builder.query<JobFinancial[], void>({
      query: () => '/financial/overdue',
      providesTags: ['JobFinancial'],
    }),
    getTeamFinancialSummary: builder.query<TeamFinancialSummary[], void>({
      query: () => '/financial/teams/summary',
      providesTags: ['FinancialSummary'],
    }),
    getClientFinancialSummary: builder.query<ClientFinancialSummary[], void>({
      query: () => '/financial/clients/summary',
      providesTags: ['FinancialSummary'],
    }),
    getMonthlyTrends: builder.query<MonthlyTrend[], { months?: number }>({
      query: (params) => ({
        url: '/financial/monthly/trends',
        params,
      }),
      providesTags: ['FinancialSummary'],
    }),
  }),
});

export const {
  useGetFinancialSummaryQuery,
  useGetJobFinancialsQuery,
  useGetOverdueJobsQuery,
  useGetTeamFinancialSummaryQuery,
  useGetClientFinancialSummaryQuery,
  useGetMonthlyTrendsQuery,
} = financialDashboardApi;
