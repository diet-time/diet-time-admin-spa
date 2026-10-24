import { adminApiUrl, apiClient } from './apiClient';
import type { PagedResponse } from './apiTypes';

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

export interface PackageOption {
  id: string;
  name: string;
  mealCount: number;
  snackCount: number;
  displayOrder: number;
  isActive: boolean;
  pricingUsageCount?: number;
}

export interface PackageOptionInput {
  name: string;
  mealCount: number;
  snackCount: number;
  displayOrder: number;
  isActive: boolean;
}

type RawPackageOption = PackageOption;

export const packageOptionsApi = {
  list: async (params: { page?: number; pageSize?: number; search?: string; isActive?: boolean } = {}, signal?: AbortSignal) =>
    { const result = paged<RawPackageOption>((await apiClient.get(adminApiUrl('package-options'), { params: { activeOnly: params.isActive === true }, signal })).data, params.page, params.pageSize); return { ...result, items: result.items.filter((item) => !params.search || item.name.toLowerCase().includes(params.search.toLowerCase())) }; },
  get: async (id: string, signal?: AbortSignal) =>
    unwrap<RawPackageOption>((await apiClient.get(adminApiUrl(`package-options/${id}`), { signal })).data),
  create: async (body: PackageOptionInput) =>
    unwrap<{ id: string }>((await apiClient.post(adminApiUrl('package-options'), body)).data),
  update: async (id: string, body: PackageOptionInput) =>
    unwrap<PackageOption>((await apiClient.put(adminApiUrl(`package-options/${id}`), body)).data),
  setStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch(adminApiUrl(`package-options/${id}/status`), { isActive })).data,
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

interface RawMealPlanPrice extends Omit<MealPlanPrice, 'packageOptionName' | 'currency'> {
  packageOptionName?: string;
  packageName?: string;
  currency?: string;
  currencyCode?: string;
}

const mealPlanPrice = (item: RawMealPlanPrice): MealPlanPrice => ({
  ...item,
  packageOptionName: item.packageOptionName ?? item.packageName ?? 'Package',
  currency: item.currency ?? item.currencyCode ?? 'QAR',
});

const priceRequest = (body: MealPlanPriceInput) => ({
  mealPlanId: body.mealPlanId,
  durationId: body.durationId,
  packageOptionId: body.packageOptionId,
  price: body.price,
  currencyCode: body.currency,
  isActive: body.isActive,
});

export const subscriptionPricingApi = {
  list: async (params: { page?: number; pageSize?: number; mealPlanId?: string; durationId?: string; isActive?: boolean } = {}, signal?: AbortSignal) =>
    { const result = paged<RawMealPlanPrice>((await apiClient.get(adminApiUrl('meal-plan-prices'), { params: { mealPlanId: params.mealPlanId, durationId: params.durationId, activeOnly: params.isActive === true }, signal })).data, params.page, params.pageSize); return { ...result, items: result.items.map(mealPlanPrice).filter((item) => params.isActive === undefined || item.isActive === params.isActive) }; },
  get: async (id: string, signal?: AbortSignal) =>
    mealPlanPrice(unwrap<RawMealPlanPrice>((await apiClient.get(adminApiUrl(`meal-plan-prices/${id}`), { signal })).data)),
  create: async (body: MealPlanPriceInput) =>
    unwrap<{ id: string }>((await apiClient.post(adminApiUrl('meal-plan-prices'), priceRequest(body))).data),
  update: async (id: string, body: MealPlanPriceInput) =>
    (await apiClient.put(adminApiUrl(`meal-plan-prices/${id}`), priceRequest(body))).data,
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
