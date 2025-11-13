import { baseApi } from './baseApi';
import type { Expense, CreateExpenseForm, UpdateExpenseForm, ExpenseCategorySummary } from '../../types';

interface PaginatedExpensesResponse {
  items: Expense[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const expensesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<PaginatedExpensesResponse, { 
      page?: number; 
      limit?: number; 
      category?: string; 
      category_id?: number;
      start_date?: string; 
      end_date?: string; 
      search?: string; 
    }>({
      query: (params) => ({
        url: '/expenses',
        params,
      }),
      providesTags: ['Expense'],
    }),
    getExpense: builder.query<Expense, number>({
      query: (id) => `/expenses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Expense', id }],
    }),
    createExpense: builder.mutation<Expense, CreateExpenseForm>({
      query: (expense) => ({
        url: '/expenses',
        method: 'POST',
        body: expense,
      }),
      invalidatesTags: ['Expense', 'FinancialAnalytics'],
    }),
    updateExpense: builder.mutation<Expense, { id: number; data: UpdateExpenseForm }>({
      query: ({ id, data }) => ({
        url: `/expenses/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Expense', id }, 'FinancialAnalytics'],
    }),
    deleteExpense: builder.mutation<void, number>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Expense', 'FinancialAnalytics'],
    }),
    getExpenseCategoriesSummary: builder.query<ExpenseCategorySummary[], { 
      start_date?: string; 
      end_date?: string; 
    }>({
      query: (params) => ({
        url: '/expenses/categories/summary',
        params,
      }),
      providesTags: ['Expense'],
    }),
    exportExpensesExcel: builder.mutation<Blob, { 
      start_date?: string; 
      end_date?: string; 
      category?: string; 
    }>({
      query: (params) => ({
        url: '/expenses/export/excel',
        params,
      }),
    }),
    getExpensesSummary: builder.query<{
      total_amount: number;
      category_count: number;
    }, { 
      start_date?: string; 
      end_date?: string; 
    }>({
      query: (params) => ({
        url: '/expenses/stats/summary',
        params,
      }),
      providesTags: ['Expense'],
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpenseCategoriesSummaryQuery,
  useExportExpensesExcelMutation,
  useGetExpensesSummaryQuery,
} = expensesApi;
