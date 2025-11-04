import { baseApi } from './baseApi';

export interface BackendNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  read_at?: string;
}

export interface BackendReminder {
  id: number;
  user_id: number;
  type: string;
  related_id?: number;
  scheduled_at: string;
  channel: string;
  message: string;
  status: string;
  created_at: string;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<BackendNotification[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/notifications/',
        params,
      }),
      providesTags: ['Notification'],
    }),
    getUnreadNotifications: builder.query<BackendNotification[], void>({
      query: () => '/notifications/unread',
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<void, number>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    deleteNotification: builder.mutation<void, number>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
    getReminders: builder.query<BackendReminder[], { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/reminders/',
        params,
      }),
      providesTags: ['Reminder'],
    }),
    getNotificationCount: builder.query<{ unread_count: number }, void>({
      query: () => '/notifications/count',
      providesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useGetRemindersQuery,
  useGetNotificationCountQuery,
} = notificationsApi;