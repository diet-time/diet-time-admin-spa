import { apiClient, adminApiUrl } from './apiClient';
export interface OrderWhatsAppNotification {
  id: string; notificationType: string; recipientPhone?: string; templateName?: string;
  status: string; providerStatus?: string; attemptCount: number; errorMessage?: string;
  createdAt: string; sentAt?: string; deliveredAt?: string; readAt?: string; twilioMessageSid?: string;
}
export const orderWhatsAppApi = {
  history: async (orderId: string) => (await apiClient.get<OrderWhatsAppNotification[]>(
    adminApiUrl(`orders/${orderId}/whatsapp-notifications`), { skipGlobalLoading: true })).data,
};
