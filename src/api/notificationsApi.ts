import { apiClient, adminApiUrl } from './apiClient';
import type { ApiEnvelope } from './apiTypes';

export interface StaffNotification {
  id: string; eventType: string; title: string; message: string; orderId: string; orderNumber: string;
  serviceDayId?: string; serviceDate?: string; createdAt: string; readAt?: string; targetUrl: string;
}
export interface NotificationPage { items: StaffNotification[]; page: number; pageSize: number; totalCount: number }
export const notificationsApi = {
  list: async (page: number, signal?: AbortSignal) => (await apiClient.get<ApiEnvelope<NotificationPage>>(adminApiUrl('notifications'), { params: { page, pageSize: 20 }, signal })).data.data,
  unreadCount: async (signal?: AbortSignal) => (await apiClient.get<ApiEnvelope<{ unreadCount: number }>>(adminApiUrl('notifications/unread-count'), { signal })).data.data.unreadCount,
  read: async (id: string) => { await apiClient.patch(adminApiUrl(`notifications/${id}/read`)); },
  readAll: async () => { await apiClient.patch(adminApiUrl('notifications/read-all')); },
};
