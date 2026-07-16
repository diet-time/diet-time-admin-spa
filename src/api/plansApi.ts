import { apiClient } from './apiClient';
import type { PagedResponse, PlanSummary } from './apiTypes';
export interface PlanFilters { page: number; pageSize: number; search?: string; published?: boolean }
export const plansApi = {
  list: async (filters: PlanFilters, signal?: AbortSignal) => (await apiClient.get<PagedResponse<PlanSummary>>('/admin/meal-plans', { params: filters, signal })).data,
  get: async (id: string) => (await apiClient.get(`/admin/meal-plans/${id}`)).data,
  create: async (body: unknown) => (await apiClient.post<{ id: string }>('/admin/meal-plans', body)).data,
  update: async (id: string, body: unknown) => (await apiClient.put(`/admin/meal-plans/${id}`, body)).data,
  publish: async (id: string) => (await apiClient.post(`/admin/meal-plans/${id}/publish`)).data,
  unpublish: async (id: string) => (await apiClient.post(`/admin/meal-plans/${id}/unpublish`)).data,
  addDay: async (id: string, body: unknown) => (await apiClient.post(`/admin/meal-plans/${id}/days`, body)).data,
  addSlot: async (dayId: string, body: unknown) => (await apiClient.post(`/admin/meal-plan-days/${dayId}/slots`, body)).data,
  addOption: async (slotId: string, body: unknown) => (await apiClient.post(`/admin/meal-plan-slots/${slotId}/options`, body)).data,
};
