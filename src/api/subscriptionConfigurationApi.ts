import { adminApiUrl, apiClient } from './apiClient';
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

interface RawPackageMealType {
  mealTypeId: string;
  code?: string;
  mealTypeCode?: string;
  mealTypeName?: string;
  maxQuantity?: number;
  maximumQuantity?: number;
  isRequired: boolean;
  displayOrder?: number;
  selected?: boolean;
  isActive?: boolean;
}

interface RawPackageOption extends Omit<PackageOption, 'mealTypes'> { mealTypes?: RawPackageMealType[] }

const packageMealType = (item: RawPackageMealType): PackageMealType => ({
  mealTypeId: item.mealTypeId,
  mealTypeCode: item.mealTypeCode ?? item.code,
  mealTypeName: item.mealTypeName ?? (item.mealTypeCode ?? item.code ?? '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
  maximumQuantity: item.maximumQuantity ?? item.maxQuantity ?? 1,
  isRequired: item.isRequired,
  displayOrder: item.displayOrder ?? 0,
  isActive: item.isActive ?? item.selected ?? true,
});

const packageOption = (item: RawPackageOption): PackageOption => ({
  ...item,
  mealTypes: item.mealTypes?.map(packageMealType) ?? [],
});

const packageMealTypesRequest = (mealTypes: PackageMealType[]) => ({
  mealTypes: mealTypes.filter((item) => item.isActive).map((item) => ({
    mealTypeId: item.mealTypeId,
    isRequired: item.isRequired,
    maxQuantity: item.maximumQuantity,
    displayOrder: item.displayOrder,
  })),
});

export const packageOptionsApi = {
  list: async (params: { page?: number; pageSize?: number; search?: string; isActive?: boolean } = {}, signal?: AbortSignal) =>
    { const result = paged<RawPackageOption>((await apiClient.get(adminApiUrl('package-options'), { params: { activeOnly: params.isActive === true }, signal })).data, params.page, params.pageSize); return { ...result, items: result.items.filter((item) => !params.search || item.name.toLowerCase().includes(params.search.toLowerCase())).map(packageOption) }; },
  get: async (id: string, signal?: AbortSignal) =>
    packageOption(unwrap<RawPackageOption>((await apiClient.get(adminApiUrl(`package-options/${id}`), { signal })).data)),
  create: async (body: PackageOptionInput) =>
    unwrap<{ id: string }>((await apiClient.post(adminApiUrl('package-options'), body)).data),
  update: async (id: string, body: PackageOptionInput) =>
    unwrap<PackageOption>((await apiClient.put(adminApiUrl(`package-options/${id}`), body)).data),
  setStatus: async (id: string, isActive: boolean) =>
    (await apiClient.patch(adminApiUrl(`package-options/${id}/status`), { isActive })).data,
  mealTypes: async (id: string, signal?: AbortSignal) =>
    (unwrap<RawPackageMealType[]>((await apiClient.get(adminApiUrl(`package-options/${id}/meal-types`), { signal })).data) ?? []).map(packageMealType),
  updateMealTypes: async (id: string, mealTypes: PackageMealType[]) =>
    (await apiClient.put(adminApiUrl(`package-options/${id}/meal-types`), packageMealTypesRequest(mealTypes))).data,
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

interface RawWeeklyMenuItem { menuItemId: string; name: string; isDefault: boolean; displayOrder: number }
interface RawWeeklyMenuMealType { mealTypeId: string; code: string; items: RawWeeklyMenuItem[] }
interface RawWeeklyMenuDay { dayOfWeek: number; dayName: string; isActive: boolean; mealTypes: RawWeeklyMenuMealType[] }
interface RawWeeklyMenu { mealPlanId: string; mealPlanName?: string; days: RawWeeklyMenuDay[] }

const weekdayNumbers: Record<Weekday, number> = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
const weekdays = Object.fromEntries(Object.entries(weekdayNumbers).map(([name, number]) => [number, name])) as Record<number, Weekday>;
const friendlyCode = (code: string) => code.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const weeklyDay = (day: RawWeeklyMenuDay): WeeklyMenuDay => ({
  dayOfWeek: weekdays[day.dayOfWeek] ?? 'SUNDAY',
  isActive: day.isActive,
  sections: (day.mealTypes ?? []).map((section, index) => ({
    mealTypeId: section.mealTypeId,
    mealTypeCode: section.code,
    mealTypeName: friendlyCode(section.code),
    displayOrder: index + 1,
    items: (section.items ?? []).map((item) => ({
      id: item.menuItemId,
      mealId: item.menuItemId,
      mealName: item.name,
      isDefault: item.isDefault,
      displayOrder: item.displayOrder,
      isActive: true,
    })),
  })),
});

const weeklyDayRequest = (day: WeeklyMenuDay) => ({
  isActive: day.isActive,
  mealTypes: day.sections.map((section) => ({
    mealTypeId: section.mealTypeId,
    items: section.items.filter((item) => item.isActive).map((item) => ({
      menuItemId: item.mealId,
      isDefault: item.isDefault,
      displayOrder: item.displayOrder,
    })),
  })),
});

export const weeklyMenuApi = {
  get: async (mealPlanId: string, signal?: AbortSignal) => {
    const menu = unwrap<RawWeeklyMenu>((await apiClient.get(adminApiUrl(`meal-plans/${mealPlanId}/weekly-menu`), { signal })).data);
    return { mealPlanId: menu.mealPlanId, mealPlanName: menu.mealPlanName, days: (menu.days ?? []).map(weeklyDay) };
  },
  getDay: async (mealPlanId: string, day: Weekday, signal?: AbortSignal) =>
    weeklyDay(unwrap<RawWeeklyMenuDay>((await apiClient.get(adminApiUrl(`meal-plans/${mealPlanId}/weekly-menu/${weekdayNumbers[day]}`), { signal })).data)),
  updateDay: async (mealPlanId: string, day: Weekday, body: WeeklyMenuDay) =>
    (await apiClient.put(adminApiUrl(`meal-plans/${mealPlanId}/weekly-menu/${weekdayNumbers[day]}`), weeklyDayRequest(body))).data,
};

export type { MealSummary, PlanSummary };
