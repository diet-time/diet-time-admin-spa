import { apiClient, adminApiUrl } from './apiClient';
import type { ApiEnvelope } from './apiTypes';

export interface StaffNotification {
  id: string; eventType: string; title: string; message: string; orderId: string; orderNumber: string;
  serviceDayId?: string; serviceDate?: string; createdAt: string; readAt?: string; targetUrl: string;
  customerName?: string;
}
export interface NotificationPage { items: StaffNotification[]; page: number; pageSize: number; totalCount: number }
export const recentNotificationLimit = 50;
export const notificationsApi = {
  list: async (page: number, signal?: AbortSignal) => (await apiClient.get<ApiEnvelope<NotificationPage>>(adminApiUrl('notifications'), { params: { page, pageSize: recentNotificationLimit }, signal, skipGlobalLoading: true })).data.data,
  unreadCount: async (signal?: AbortSignal) => (await apiClient.get<ApiEnvelope<{ unreadCount: number }>>(adminApiUrl('notifications/unread-count'), { signal, skipGlobalLoading: true })).data.data.unreadCount,
  read: async (id: string) => { await apiClient.patch(adminApiUrl(`notifications/${id}/read`), undefined, { skipGlobalLoading: true }); },
  readAll: async () => { await apiClient.patch(adminApiUrl('notifications/read-all'), undefined, { skipGlobalLoading: true }); },
};
