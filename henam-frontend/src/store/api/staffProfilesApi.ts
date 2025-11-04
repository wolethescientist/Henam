import { baseApi } from './baseApi';
import type { 
  StaffPerformance, 
  TeamPerformance, 
  UserProfile, 
  UserUpdate,
} from '../../types';

export const staffProfilesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffProfiles: builder.query<StaffPerformance[], { team_id?: number }>({
      query: (params) => ({
        url: '/staff/profiles',
        params,
      }),
      providesTags: ['StaffProfile'],
    }),
    getStaffProfile: builder.query<UserProfile, number>({
      query: (userId) => `/staff/profiles/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'StaffProfile', id: userId }],
    }),
    updateStaffProfile: builder.mutation<UserProfile, { userId: number; data: UserUpdate }>({
      query: ({ userId, data }) => ({
        url: `/staff/profiles/${userId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [{ type: 'StaffProfile', id: userId }],
    }),
    getTeamPerformance: builder.query<TeamPerformance[], void>({
      query: () => '/staff/teams/performance',
      providesTags: ['TeamPerformance'],
    }),
    calculateEfficiencyScores: builder.mutation<{ message: string; period_start: string; period_end: string }, void>({
      query: () => ({
        url: '/staff/efficiency/calculate',
        method: 'POST',
      }),
      invalidatesTags: ['StaffProfile', 'TeamPerformance'],
    }),
  }),
});

export const {
  useGetStaffProfilesQuery,
  useGetStaffProfileQuery,
  useUpdateStaffProfileMutation,
  useGetTeamPerformanceQuery,
  useCalculateEfficiencyScoresMutation,
} = staffProfilesApi;
