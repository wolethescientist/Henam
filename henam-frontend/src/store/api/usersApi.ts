import { baseApi } from './baseApi';
import type { User, CreateUserForm, StaffPerformance } from '../../types';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: ['User'],
    }),
    getUser: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (_, __, id) => [{ type: 'User', id }],
    }),
    getStaffPerformance: builder.query<StaffPerformance[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/users/staff/performance',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),
    createUser: builder.mutation<User, CreateUserForm>({
      query: (user) => ({
        url: '/users/',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: number; data: Partial<CreateUserForm> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'User', id }],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    activateUser: builder.mutation<User, number>({
      query: (id) => ({
        url: `/users/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    deactivateUser: builder.mutation<User, number>({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetStaffPerformanceQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
} = usersApi;
