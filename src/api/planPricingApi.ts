import { apiClient } from './apiClient';
import type { PagedResponse } from './apiTypes';

export type PlanPriceStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export interface MealPlanPriceTranslation {
  languageCode: string;
  name: string;
  description?: string | null;
}

export interface PlanPrice {
  id: string;
  mealPlanTemplateId: string;
  mealPlanCode: string;
  mealPlanName: string;
  mealPlanPricePackageId?: string | null;
  packageCode?: string | null;
  packageNameEn?: string | null;
  packageNameAr?: string | null;
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
  translations?: MealPlanPriceTranslation[];
}

interface PlanPriceInputBase {
  mealPlanTemplateId: string;
  mealPlanPricePackageId: string;
  mealsPerDay: number;
  snacksPerDay: number;
  currencyCode: string;
  amount: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
}

export interface PlanPriceCreateInput extends PlanPriceInputBase {
  translations?: MealPlanPriceTranslation[];
}

export interface PlanPriceUpdateInput extends PlanPriceInputBase {
  /** Omit to preserve the translations currently stored by the backend. */
  translations?: MealPlanPriceTranslation[];
}

export type PlanPriceInput = PlanPriceCreateInput | PlanPriceUpdateInput;

export interface PlanPriceFilters {
  page: number;
  pageSize: number;
  search?: string;
  mealPlanTemplateId?: string;
  status?: PlanPriceStatus;
  currencyCode?: string;
  mealPlanPricePackageId?: string;
}

export interface MealPlanPricePackage {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  durationDays: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  canEditDurationDays?: boolean;
}

export interface MealPlanPricePackageRequest {
  code: string;
  nameEn: string;
  nameAr: string;
  durationDays: number;
  displayOrder: number;
  isActive: boolean;
}

export interface MealPlanPricePackageLookup {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  durationDays: number;
  displayOrder: number;
}

export interface MealPlanPricePackageFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
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

const normalizePackage = (item: MealPlanPricePackage): MealPlanPricePackage => ({
  ...item,
  code: item.code.trim().toUpperCase(),
});

export const getMealPlanPricePackages = async (
  filters: MealPlanPricePackageFilters,
  signal?: AbortSignal,
): Promise<PagedResponse<MealPlanPricePackage>> => {
  const response = await apiClient.get<ApiEnvelope<MealPlanPricePackage[]>>('/admin/meal-plan-price-packages', { params: filters, signal });
  const items = (response.data.data ?? []).map(normalizePackage);
  return {
    items,
    page: response.data.meta?.page ?? filters.page,
    pageSize: response.data.meta?.pageSize ?? filters.pageSize,
    totalCount: response.data.meta?.totalCount ?? items.length,
    totalPages: response.data.meta?.totalPages ?? 1,
  };
};

export const getMealPlanPricePackage = async (id: string, signal?: AbortSignal) =>
  normalizePackage((await apiClient.get<ApiEnvelope<MealPlanPricePackage>>(`/admin/meal-plan-price-packages/${id}`, { signal })).data.data);

export const getMealPlanPricePackageLookup = async (signal?: AbortSignal) =>
  ((await apiClient.get<ApiEnvelope<MealPlanPricePackageLookup[]>>('/admin/meal-plan-price-packages/lookup', { signal })).data.data ?? [])
    .sort((left, right) => left.displayOrder - right.displayOrder);

export const createMealPlanPricePackage = async (body: MealPlanPricePackageRequest) =>
  (await apiClient.post<ApiEnvelope<{ id: string }>>('/admin/meal-plan-price-packages', body)).data.data;

export const updateMealPlanPricePackage = async (id: string, body: MealPlanPricePackageRequest) =>
  (await apiClient.put(`/admin/meal-plan-price-packages/${id}`, body)).data;

export const updateMealPlanPricePackageStatus = async (id: string, isActive: boolean) =>
  (await apiClient.patch(`/admin/meal-plan-price-packages/${id}/status`, { isActive })).data;

export const mealPlanPricePackagesApi = {
  list: getMealPlanPricePackages,
  get: getMealPlanPricePackage,
  lookup: getMealPlanPricePackageLookup,
  create: createMealPlanPricePackage,
  update: updateMealPlanPricePackage,
  setStatus: updateMealPlanPricePackageStatus,
};

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
  create: async (body: PlanPriceCreateInput) =>
    (await apiClient.post<ApiEnvelope<{ id: string }>>('/admin/meal-plan-pricing', body)).data.data,
  update: async (id: string, body: PlanPriceUpdateInput) =>
    (await apiClient.put(`/admin/meal-plan-pricing/${id}`, body)).data,
  setStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch(`/admin/meal-plan-pricing/${id}/status`, { isActive })).data,
  remove: async (id: string) =>
    (await apiClient.delete(`/admin/meal-plan-pricing/${id}`)).data,
};
