import { apiClient } from './apiClient';
import type { PagedResponse } from './apiTypes';

export type PlanPriceStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export interface PlanPrice {
  id: string;
  mealPlanTemplateId: string;
  mealPlanCode: string;
  mealPlanName: string;
  durationDays: number;
  mealsPerDay: number;
  snacksPerDay: number;
  currencyCode: string;
  amount: number;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  isActive: boolean;
  status: PlanPriceStatus;
  canDelete: boolean;
}

export interface PlanPriceInput {
  mealPlanTemplateId: string;
  durationDays: number;
  mealsPerDay: number;
  snacksPerDay: number;
  currencyCode: string;
  amount: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
}

export interface PlanPriceFilters {
  page: number;
  pageSize: number;
  search?: string;
  mealPlanTemplateId?: string;
  status?: PlanPriceStatus;
  currencyCode?: string;
}

export interface PlanPriceSummary {
  active: number;
  scheduled: number;
  expired: number;
  inactive: number;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
}

const deriveStatus = (price: Omit<PlanPrice, 'status' | 'canDelete'> & Partial<Pick<PlanPrice, 'status' | 'canDelete'>>): PlanPriceStatus => {
  if (price.status) return price.status;
  if (!price.isActive) return 'INACTIVE';
  const now = Date.now();
  if (price.effectiveUntil && new Date(price.effectiveUntil).getTime() < now) return 'EXPIRED';
  if (new Date(price.effectiveFrom).getTime() > now) return 'SCHEDULED';
  return 'ACTIVE';
};

const normalizePrice = (price: PlanPrice): PlanPrice => ({
  ...price,
  currencyCode: price.currencyCode.trim().toUpperCase(),
  status: deriveStatus(price),
  canDelete: price.canDelete ?? (!price.isActive && new Date(price.effectiveFrom).getTime() > Date.now()),
});

export const planPricingApi = {
  list: async (filters: PlanPriceFilters, signal?: AbortSignal): Promise<PagedResponse<PlanPrice>> => {
    const response = await apiClient.get<ApiEnvelope<PlanPrice[]>>('/admin/meal-plan-pricing', { params: filters, signal });
    const items = (response.data.data ?? []).map(normalizePrice);
    return {
      items,
      page: response.data.meta?.page ?? filters.page,
      pageSize: response.data.meta?.pageSize ?? filters.pageSize,
      totalCount: response.data.meta?.totalCount ?? items.length,
      totalPages: response.data.meta?.totalPages ?? 1,
    };
  },
  get: async (id: string, signal?: AbortSignal) =>
    normalizePrice((await apiClient.get<ApiEnvelope<PlanPrice>>(`/admin/meal-plan-pricing/${id}`, { signal })).data.data),
  summary: async (signal?: AbortSignal) =>
    (await apiClient.get<ApiEnvelope<PlanPriceSummary>>('/admin/meal-plan-pricing/summary', { signal })).data.data,
  currencies: async (signal?: AbortSignal) =>
    (await apiClient.get<ApiEnvelope<string[]>>('/admin/meal-plan-pricing/currencies', { signal })).data.data,
  create: async (body: PlanPriceInput) =>
    (await apiClient.post<ApiEnvelope<{ id: string }>>('/admin/meal-plan-pricing', body)).data.data,
  update: async (id: string, body: PlanPriceInput) =>
    (await apiClient.put(`/admin/meal-plan-pricing/${id}`, body)).data,
  setStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch(`/admin/meal-plan-pricing/${id}/status`, { isActive })).data,
  remove: async (id: string) =>
    (await apiClient.delete(`/admin/meal-plan-pricing/${id}`)).data,
};
