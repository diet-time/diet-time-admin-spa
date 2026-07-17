import { apiClient } from './apiClient';
import type { PagedResponse, PlanSummary } from './apiTypes';
export interface PlanFilters { page: number; pageSize: number; search?: string; published?: boolean }

interface PlansListApiResponse {
  data?: PlanSummary[];
  items?: PlanSummary[];
  meta?: Partial<Omit<PagedResponse<PlanSummary>, 'items'>>;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

const normalizePlansResponse = (
  response: PlansListApiResponse,
  filters: PlanFilters,
): PagedResponse<PlanSummary> => {
  const items = response.data ?? response.items ?? [];
  const meta = response.meta;

  return {
    items,
    page: meta?.page ?? response.page ?? filters.page,
    pageSize: meta?.pageSize ?? response.pageSize ?? filters.pageSize,
    totalCount: meta?.totalCount ?? response.totalCount ?? items.length,
    totalPages: meta?.totalPages ?? response.totalPages ?? 1,
  };
};

export const plansApi = {
  list: async (filters: PlanFilters, signal?: AbortSignal) => {
    const response = await apiClient.get<PlansListApiResponse>('/admin/meal-plans', { params: filters, signal });
    return normalizePlansResponse(response.data, filters);
  },
  get: async (id: string) => (await apiClient.get(`/admin/meal-plans/${id}`)).data,
  create: async (body: unknown) => (await apiClient.post<{ id: string }>('/admin/meal-plans', body)).data,
  update: async (id: string, body: unknown) => (await apiClient.put(`/admin/meal-plans/${id}`, body)).data,
  publish: async (id: string) => (await apiClient.post(`/admin/meal-plans/${id}/publish`)).data,
  unpublish: async (id: string) => (await apiClient.post(`/admin/meal-plans/${id}/unpublish`)).data,
  addDay: async (id: string, body: unknown) => (await apiClient.post(`/admin/meal-plans/${id}/days`, body)).data,
  addSlot: async (dayId: string, body: unknown) => (await apiClient.post(`/admin/meal-plan-days/${dayId}/slots`, body)).data,
  addOption: async (slotId: string, body: unknown) => (await apiClient.post(`/admin/meal-plan-slots/${slotId}/options`, body)).data,
};
