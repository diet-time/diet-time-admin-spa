import axios from 'axios';
import { apiClient } from './apiClient';

export interface UploadRequest {
  fileName: string;
  contentType: string;
  entityType: 'MEAL_ITEM';
  entityId: string;
}

export interface UploadTicket {
  uploadUrl: string;
  objectKey: string;
  expiresAt?: string;
  headers?: Record<string, string>;
}

export const mediaApi = {
  requestUpload: async (body: UploadRequest) => (
    await apiClient.post<{ data: UploadTicket }>('/admin/media/upload-url', body)
  ).data.data,
  upload: async (ticket: UploadTicket, file: File, onProgress: (percent: number) => void) => axios.put(ticket.uploadUrl, file, {
    headers: { 'Content-Type': file.type, ...ticket.headers },
    onUploadProgress: ({ loaded, total }) => onProgress(total ? Math.round(loaded / total * 100) : 0),
  }),
  attachToMeal: async (mealId: string, body: object) => (await apiClient.post(`/admin/meals/${mealId}/media`, body)).data,
  removeFromMeal: async (mealId: string, mediaId: string) => (await apiClient.delete(`/admin/meals/${mealId}/media/${mediaId}`)).data,
};
