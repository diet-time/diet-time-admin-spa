import { apiClient } from './apiClient';
import type { MealSummary, PagedResponse, PlanSummary } from './apiTypes';

interface Envelope<T> {
  data?: T;
  items?: T;
  meta?: { page?: number; pageSize?: number; totalCount?: number; totalPages?: number };
}

const unwrap = <T>(value: Envelope<T> | T): T => {
  if (value && typeof value === 'object' && 'data' in value && (value as Envelope<T>).data !== undefined)
    return (value as Envelope<T>).data as T;
  return value as T;
};

const paged = <T>(value: Envelope<T[]> | T[], page = 1, pageSize = 100): PagedResponse<T> => {
  const envelope = value as Envelope<T[]>;
  const items = Array.isArray(value) ? value : envelope.data ?? envelope.items ?? [];
  return {
    items,
    page: envelope.meta?.page ?? page,
    pageSize: envelope.meta?.pageSize ?? pageSize,
    totalCount: envelope.meta?.totalCount ?? items.length,
    totalPages: envelope.meta?.totalPages ?? 1,
  };
};

export interface PackageMealType {
  mealTypeId: string;
  mealTypeCode?: string;
  mealTypeName: string;
  maximumQuantity: number;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface PackageOption {
  id: string;
  name: string;
  mealCount: number;
  snackCount: number;
  displayOrder: number;
  isActive: boolean;
  pricingUsageCount?: number;
  mealTypes?: PackageMealType[];
}

export interface PackageOptionInput {
  name: string;
  mealCount: number;
  snackCount: number;
  displayOrder: number;
  isActive: boolean;
}

export const packageOptionsApi = {
  list: async (params: { page?: number; pageSize?: number; search?: string; isActive?: boolean } = {}, signal?: AbortSignal) =>
    paged<PackageOption>((await apiClient.get('/admin/package-options', { params, signal })).data, params.page, params.pageSize),
  get: async (id: string, signal?: AbortSignal) =>
    unwrap<PackageOption>((await apiClient.get(`/admin/package-options/${id}`, { signal })).data),
  create: async (body: PackageOptionInput) =>
    unwrap<{ id: string }>((await apiClient.post('/admin/package-options', body)).data),
  update: async (id: string, body: PackageOptionInput) =>
    unwrap<PackageOption>((await apiClient.put(`/admin/package-options/${id}`, body)).data),
  setStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch(`/admin/package-options/${id}/status`, { isActive })).data,
  mealTypes: async (id: string, signal?: AbortSignal) =>
    unwrap<PackageMealType[]>((await apiClient.get(`/admin/package-options/${id}/meal-types`, { signal })).data) ?? [],
  updateMealTypes: async (id: string, mealTypes: PackageMealType[]) =>
    (await apiClient.put(`/admin/package-options/${id}/meal-types`, { mealTypes })).data,
};

export interface DurationOption {
  id: string;
  name: string;
  durationDays?: number;
  isActive?: boolean;
}

export interface MealPlanPrice {
  id: string;
  mealPlanId: string;
  mealPlanName: string;
  durationId: string;
  durationName: string;
  packageOptionId: string;
  packageOptionName: string;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface MealPlanPriceInput {
  mealPlanId: string;
  durationId: string;
  packageOptionId: string;
  price: number;
  currency: string;
  isActive: boolean;
}

export const subscriptionPricingApi = {
  list: async (params: { page?: number; pageSize?: number; mealPlanId?: string; durationId?: string; isActive?: boolean } = {}, signal?: AbortSignal) =>
    paged<MealPlanPrice>((await apiClient.get('/admin/meal-plan-prices', { params, signal })).data, params.page, params.pageSize),
  get: async (id: string, signal?: AbortSignal) =>
    unwrap<MealPlanPrice>((await apiClient.get(`/admin/meal-plan-prices/${id}`, { signal })).data),
  create: async (body: MealPlanPriceInput) =>
    unwrap<{ id: string }>((await apiClient.post('/admin/meal-plan-prices', body)).data),
  update: async (id: string, body: MealPlanPriceInput) =>
    (await apiClient.put(`/admin/meal-plan-prices/${id}`, body)).data,
  setStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch(`/admin/meal-plan-prices/${id}/status`, { isActive })).data,
  durations: async (signal?: AbortSignal): Promise<DurationOption[]> => {
    // Duration masters already exist in this SPA as meal-plan price packages.
    const response = await apiClient.get('/admin/meal-plan-price-packages/lookup', { signal });
    const items = unwrap<Record<string, unknown>[]>(response.data) ?? [];
    return items.map((item) => ({
      id: String(item.id),
      name: String(item.name ?? item.nameEn ?? (item.durationDays ? `${item.durationDays} Days` : 'Duration')),
      durationDays: typeof item.durationDays === 'number' ? item.durationDays : undefined,
      isActive: item.isActive !== false,
    })).sort((left, right) => (left.durationDays ?? 0) - (right.durationDays ?? 0));
  },
};

export type Weekday = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface WeeklyMenuItem {
  id?: string;
  mealId: string;
  mealName: string;
  isDefault: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface WeeklyMenuSection {
  mealTypeId: string;
  mealTypeCode: string;
  mealTypeName: string;
  displayOrder: number;
  items: WeeklyMenuItem[];
}

export interface WeeklyMenuDay {
  dayOfWeek: Weekday;
  isActive: boolean;
  sections: WeeklyMenuSection[];
}

export interface WeeklyMenu {
  mealPlanId: string;
  mealPlanName?: string;
  days: WeeklyMenuDay[];
}

export const weeklyMenuApi = {
  get: async (mealPlanId: string, signal?: AbortSignal) =>
    unwrap<WeeklyMenu>((await apiClient.get(`/admin/meal-plans/${mealPlanId}/weekly-menu`, { signal })).data),
  getDay: async (mealPlanId: string, day: Weekday, signal?: AbortSignal) =>
    unwrap<WeeklyMenuDay>((await apiClient.get(`/admin/meal-plans/${mealPlanId}/weekly-menu/${day}`, { signal })).data),
  updateDay: async (mealPlanId: string, day: Weekday, body: WeeklyMenuDay) =>
    (await apiClient.put(`/admin/meal-plans/${mealPlanId}/weekly-menu/${day}`, body)).data,
};

export type { MealSummary, PlanSummary };
