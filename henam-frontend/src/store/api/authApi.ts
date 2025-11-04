import { baseApi } from './baseApi';
import type { LoginResponse, User, LoginForm } from '../../types';

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone_number?: string;
  contact_info?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginForm>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
    }),
    register: builder.mutation<User, { name: string; email: string; password: string; team_id?: number }>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    updateMyProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (profileData) => ({
        url: '/users/me/profile',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: ['User'],
    }),
    changeMyPassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (passwordData) => ({
        url: '/auth/change-password',
        method: 'PUT',
        body: passwordData,
      }),
    }),
    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordRequest>({
      query: (request) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: request,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, ResetPasswordRequest>({
      query: (request) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: request,
      }),
    }),
    uploadMyPicture: builder.mutation<{ message: string; picture_url: string }, FormData>({
      query: (formData) => ({
        url: '/users/me/picture/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useRegisterMutation,
  useUpdateMyProfileMutation,
  useChangeMyPasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useUploadMyPictureMutation,
} = authApi;

export default authApi;
