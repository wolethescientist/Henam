import { baseApi } from './baseApi';
import type { ExpenseCategory, CreateExpenseCategoryForm, UpdateExpenseCategoryForm } from '../../types';

export const expenseCategoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenseCategories: builder.query<ExpenseCategory[], { 
      page?: number; 
      limit?: number; 
      search?: string;
      active_only?: boolean;
    }>({
      query: (params) => ({
        url: '/expense-categories',
        params,
      }),
      providesTags: ['ExpenseCategory'],
    }),
    getExpenseCategory: builder.query<ExpenseCategory, number>({
      query: (id) => `/expense-categories/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ExpenseCategory', id }],
    }),
    createExpenseCategory: builder.mutation<ExpenseCategory, CreateExpenseCategoryForm>({
      query: (category) => ({
        url: '/expense-categories',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['ExpenseCategory', 'Expense'],
    }),
    updateExpenseCategory: builder.mutation<ExpenseCategory, { id: number; data: UpdateExpenseCategoryForm }>({
      query: ({ id, data }) => ({
        url: `/expense-categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ExpenseCategory', id }, 'Expense'],
    }),
    deleteExpenseCategory: builder.mutation<{ message: string; deleted?: boolean; deactivated?: boolean }, number>({
      query: (id) => ({
        url: `/expense-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExpenseCategory', 'Expense'],
    }),
    getCategoryUsageStats: builder.query<Array<{
      category_id: number;
      category_name: string;
      is_active: boolean;
      expense_count: number;
      total_amount: number;
    }>, void>({
      query: () => '/expense-categories/stats/usage',
      providesTags: ['ExpenseCategory'],
    }),
  }),
});

export const {
  useGetExpenseCategoriesQuery,
  useGetExpenseCategoryQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetCategoryUsageStatsQuery,
} = expenseCategoriesApi;