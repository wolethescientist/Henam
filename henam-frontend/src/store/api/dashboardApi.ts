import { baseApi } from './baseApi';
import type { 
  UnifiedDashboardData,
  LightweightFinancialData
} from '../../types';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnifiedDashboard: builder.query<UnifiedDashboardData, { 
      user_id?: number; 
      team_id?: number;
      recent_jobs_limit?: number;
      overdue_jobs_limit?: number;
      client_summary_limit?: number;
      recent_jobs_page?: number;
      overdue_jobs_page?: number;
      start_date?: string;
      end_date?: string;
      month?: number;
      year?: number;
    }>({
      query: (params) => ({
        url: '/dashboard/unified',
        params,
      }),
      providesTags: ['Dashboard', 'FinancialSummary', 'Job'],
    }),
    getLightweightFinancial: builder.query<LightweightFinancialData, { team_id?: number }>({
      query: (params) => ({
        url: '/dashboard/financial/lightweight',
        params,
      }),
      providesTags: ['Dashboard', 'FinancialSummary'],
    }),
  }),
});

export const {
  useGetUnifiedDashboardQuery,
  useGetLightweightFinancialQuery,
} = dashboardApi;
