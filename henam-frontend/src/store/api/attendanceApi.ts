import { baseApi } from './baseApi';
import type { Attendance } from '../../types';

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffAttendance: builder.query<Attendance[], { staffId: number; page?: number; limit?: number }>({
      query: ({ staffId, page, limit }) => ({
        url: `/attendance/${staffId}`,
        params: { page, limit },
      }),
      providesTags: ['Attendance'],
    }),
    checkIn: builder.mutation<{ message: string }, { date?: string }>({
      query: (data) => ({
        url: '/attendance/check-in',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    checkOut: builder.mutation<{ message: string }, { date?: string }>({
      query: (data) => ({
        url: '/attendance/check-out',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    getMyAttendance: builder.query<Attendance[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/attendance/my/records',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getAttendanceStats: builder.query<{ total_records: number; present: number; absent: number; late: number; attendance_percentage: number }, void>({
      query: () => '/attendance/stats',
    }),
    getAllAttendance: builder.query<Attendance[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/attendance/all',
        params,
      }),
      providesTags: ['Attendance'],
    }),
  }),
});

export const {
  useGetStaffAttendanceQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useGetMyAttendanceQuery,
  useGetAttendanceStatsQuery,
  useGetAllAttendanceQuery,
} = attendanceApi;
