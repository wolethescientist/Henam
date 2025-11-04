import { baseApi } from './baseApi';
import type { Task, CreateTaskForm, PaginatedResponse } from '../../types';

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<PaginatedResponse<Task>, { 
      page?: number; 
      limit?: number; 
      search?: string; 
      status_filter?: string;
      staff_filter?: number;
      priority_filter?: string;
    }>({
      query: (params) => ({
        url: '/tasks',
        params,
      }),
      providesTags: ['Task'],
    }),
    getTask: builder.query<Task, number>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<Task, CreateTaskForm>({
      query: (task) => ({
        url: '/tasks',
        method: 'POST',
        body: task,
      }),
      invalidatesTags: ['Task', 'Dashboard'],
    }),
    updateTask: builder.mutation<Task, { id: number; data: Partial<CreateTaskForm> }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, 'Dashboard'],
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task', 'Dashboard'],
    }),
    updateTaskStatus: builder.mutation<{ message: string }, { id: number; status: string }>({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, 'Dashboard'],
    }),
    updateTaskProgress: builder.mutation<{ message: string; progress: number }, { id: number; progress: number }>({
      query: ({ id, progress }) => ({
        url: `/tasks/${id}/progress`,
        method: 'PATCH',
        body: { progress },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, 'Dashboard'],
    }),
    getMyTasks: builder.query<{ items: Task[]; total_count: number; page: number; limit: number; total_pages: number }, { 
      page?: number; 
      limit?: number; 
      search?: string; 
      status_filter?: string; 
      priority_filter?: string;
      staff_filter?: number;
    }>({
      query: (params) => ({
        url: '/tasks/my-tasks',
        params,
      }),
      providesTags: ['Task'],
    }),
    getTasksAssignedByMe: builder.query<{ items: Task[]; total_count: number; page: number; limit: number; total_pages: number }, { 
      page?: number; 
      limit?: number; 
      search?: string; 
      status_filter?: string; 
      priority_filter?: string;
      staff_filter?: number;
    }>({
      query: (params) => ({
        url: '/tasks/assigned-by-me',
        params,
      }),
      providesTags: ['Task'],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
  useGetMyTasksQuery,
  useGetTasksAssignedByMeQuery,
} = tasksApi;
