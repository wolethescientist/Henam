import { baseApi } from './baseApi';
import type { FinancialAnalytics } from '../../types';

export const financialAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFinancialAnalytics: builder.query<FinancialAnalytics, { 
      period?: string; 
      start_date?: string; 
      end_date?: string; 
    }>({
      query: (params) => ({
        url: '/financial-analytics',
        params,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true',
        },
      }),
      providesTags: ['FinancialAnalytics', 'Invoice', 'Expense'],
      // Keep data for 5 seconds to prevent rapid re-fetching
      keepUnusedDataFor: 5,
    }),
    exportFinancialAnalyticsPdf: builder.mutation<Blob, { 
      period?: string; 
      start_date?: string; 
      end_date?: string; 
    }>({
      query: (params) => ({
        url: '/financial-analytics/export/pdf',
        params,
        responseType: 'blob',
      }),
      invalidatesTags: ['FinancialAnalytics'],
    }),
  }),
});

export const {
  useGetFinancialAnalyticsQuery,
  useExportFinancialAnalyticsPdfMutation,
} = financialAnalyticsApi;
