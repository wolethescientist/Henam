import { baseApi } from './baseApi';
import type { Team, CreateTeamForm, User } from '../../types';

export const teamsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query<Team[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/teams',
        params,
      }),
      providesTags: ['Team'],
    }),
    getTeam: builder.query<Team, number>({
      query: (id) => `/teams/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Team', id }],
    }),
    createTeam: builder.mutation<Team, CreateTeamForm>({
      query: (team) => ({
        url: '/teams',
        method: 'POST',
        body: team,
      }),
      invalidatesTags: ['Team', 'User'], // Also invalidate User tags to refresh unified data
    }),
    updateTeam: builder.mutation<Team, { id: number; data: Partial<CreateTeamForm> }>({
      query: ({ id, data }) => ({
        url: `/teams/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Team', id }, 'Team', 'User'], // Invalidate both specific and general tags
    }),
    deleteTeam: builder.mutation<void, number>({
      query: (id) => ({
        url: `/teams/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Team', 'User'], // Also invalidate User tags to refresh unified data
    }),
    addTeamMember: builder.mutation<Team, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `/teams/${teamId}/members/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'Team', id: teamId }, 'Team', 'User'], // Invalidate all related tags
    }),
    removeTeamMember: builder.mutation<Team, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `/teams/${teamId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'Team', id: teamId }, 'Team', 'User'], // Invalidate all related tags
    }),
    getTeamMembers: builder.query<User[], number>({
      query: (teamId) => `/teams/${teamId}/members`,
      providesTags: (_result, _error, teamId) => [{ type: 'Team', id: teamId }],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useGetTeamMembersQuery,
} = teamsApi;
