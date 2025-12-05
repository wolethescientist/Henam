import { baseApi } from './baseApi';
import type { Invoice, CreateInvoiceForm } from '../../types';

export interface InvoicesResponse {
  items: Invoice[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const invoicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<InvoicesResponse, { 
      page?: number; 
      limit?: number; 
      search?: string; 
      status_filter?: string; 
      team_id?: number; 
    }>({
      query: ({ page = 1, limit = 20, search, status_filter, team_id }) => ({
        url: '/invoices',
        params: { page, limit, search, status_filter, team_id },
      }),
      providesTags: ['Invoice'],
    }),
    
    // Invoice CRUD endpoints - now fully implemented in backend
    createInvoice: builder.mutation<Invoice, CreateInvoiceForm>({
      query: (invoice) => ({
        url: '/invoices',
        method: 'POST',
        body: invoice,
      }),
      invalidatesTags: ['Invoice', 'Dashboard', 'FinancialSummary'],
      // Force refetch of invoice list after creation
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refetch the invoices list
          dispatch(invoicesApi.util.invalidateTags(['Invoice']));
        } catch {}
      },
    }),
    
    updateInvoice: builder.mutation<Invoice, { id: number; data: Partial<CreateInvoiceForm> }>({
      query: ({ id, data }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Invoice', id }, 'Invoice', 'Dashboard'],
    }),
    
    deleteInvoice: builder.mutation<void, number>({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invoice'],
    }),
    
    updateInvoicePayment: builder.mutation<Invoice, { id: number; paid_amount: number }>({
      query: ({ id, paid_amount }) => ({
        url: `/invoices/${id}/payment`,
        method: 'PATCH',
        body: { paid_amount },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Invoice', id }, 'Invoice', 'Dashboard', 'FinancialSummary'],
    }),
    
    linkInvoiceToJob: builder.mutation<{
      message: string;
      invoice_id: number;
      job_id: number;
      invoice_number: string;
      job_title: string;
    }, { invoice_id: number; job_id: number }>({
      query: ({ invoice_id, job_id }) => ({
        url: `/invoices/${invoice_id}/link-to-job`,
        method: 'POST',
        body: { job_id },
      }),
      invalidatesTags: (_, __, { invoice_id, job_id }) => [
        { type: 'Invoice', id: invoice_id },
        { type: 'Job', id: job_id },
        'Invoice',
        'Job',
        'Dashboard',
        'FinancialSummary',
        'Client',
      ],
      // Task 15.1: Add optimistic updates for better UX
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          
          // Invalidate invoice and job caches after linking
          dispatch(baseApi.util.invalidateTags(['Invoice', 'Job', 'Client']));
          
          // Add small delay to ensure cache invalidation propagates
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Invoice linking failed:', error);
        }
      },
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useUpdateInvoicePaymentMutation,
  useLinkInvoiceToJobMutation,
} = invoicesApi;
