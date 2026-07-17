import { apiClient } from './apiClient';
import type { PagedResponse, PlanSummary } from './apiTypes';
export interface PlanFilters { page: number; pageSize: number; search?: string; published?: boolean }
export interface PlanTranslationInput { languageCode: 'en' | 'ar'; name: string; shortDescription?: string; fullDescription?: string }
export interface PlanInput { code: string; planType: string; durationDays: number; isCustomizable: boolean; validFrom?: string | null; validUntil?: string | null; translations: PlanTranslationInput[] }
export interface PlanDayInput { dayNumber: number; dayOfWeek?: number | null; englishLabel: string; arabicLabel?: string | null }
export interface PlanSlotInput { mealTypeId: string; displayOrder: number; minimumSelection: number; maximumSelection: number; isRequired: boolean; selectionCutoffTime?: string | null; allowsPaidUpgrade: boolean }
export interface SlotOptionInput { mealItemId: string; additionalPrice: number; isDefault: boolean; isAvailable: boolean; displayOrder: number }
export interface PlanDetail {
  id: string;
  code: string;
  planType: string;
  durationDays: number;
  isCustomizable: boolean;
  isPublished: boolean;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  translations: Array<{ languageCode: string; name: string; shortDescription?: string; fullDescription?: string }>;
  days: Array<{
    id: string;
    dayNumber: number;
    englishLabel: string;
    arabicLabel?: string;
    slots: Array<{
      id: string;
      mealTypeId: string;
      mealTypeName: string;
      displayOrder: number;
      minimumSelection: number;
      maximumSelection: number;
      isRequired: boolean;
      options: Array<{ id: string; mealItemId: string; mealName: string; isDefault: boolean }>;
    }>;
  }>;
}

interface IdResponse { data?: { id?: string }; id?: string }

const responseId = (response: IdResponse) => {
  const id = response.data?.id ?? response.id;
  if (!id) throw new Error('The API response did not include an id.');
  return { id };
};

interface PlansListApiItem {
  id: string;
  code?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  planType?: string;
  durationDays?: number;
  isCustomizable?: boolean;
  customizable?: boolean;
  isPublished?: boolean;
  published?: boolean;
  isActive?: boolean;
  active?: boolean;
  validFrom?: string;
  validUntil?: string;
  priceFrom?: number;
  updatedAt?: string;
}

interface PlansListApiResponse {
  data?: PlansListApiItem[];
  items?: PlansListApiItem[];
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
  const sourceItems = response.data ?? response.items ?? [];
  const meta = response.meta;
  const items: PlanSummary[] = sourceItems.map((plan) => ({
    id: plan.id,
    code: plan.code ?? '',
    nameEn: plan.nameEn ?? plan.name ?? '',
    nameAr: plan.nameAr,
    planType: plan.planType ?? '',
    durationDays: plan.durationDays ?? 0,
    customizable: plan.customizable ?? plan.isCustomizable ?? false,
    published: plan.published ?? plan.isPublished ?? false,
    active: plan.active ?? plan.isActive ?? false,
    validFrom: plan.validFrom,
    validUntil: plan.validUntil,
    priceFrom: plan.priceFrom,
    updatedAt: plan.updatedAt ?? '',
  }));

  return {
    items,
    page: meta?.page ?? response.page ?? filters.page,
    pageSize: meta?.pageSize ?? response.pageSize ?? filters.pageSize,
    totalCount: meta?.totalCount ?? response.totalCount ?? sourceItems.length,
    totalPages: meta?.totalPages ?? response.totalPages ?? 1,
  };
};

export const plansApi = {
  list: async (filters: PlanFilters, signal?: AbortSignal) => {
    const response = await apiClient.get<PlansListApiResponse>('/admin/meal-plans', { params: filters, signal });
    return normalizePlansResponse(response.data, filters);
  },
  get: async (id: string, signal?: AbortSignal) => {
    const response = await apiClient.get<{ data: PlanDetail }>(`/admin/meal-plans/${id}`, { signal });
    return response.data.data;
  },
  create: async (body: PlanInput) => responseId((await apiClient.post<IdResponse>('/admin/meal-plans', body)).data),
  update: async (id: string, body: PlanInput) => (await apiClient.put(`/admin/meal-plans/${id}`, body)).data,
  remove: async (id: string) => (await apiClient.delete(`/admin/meal-plans/${id}`)).data,
  publish: async (id: string) => (await apiClient.post(`/admin/meal-plans/${id}/publish`)).data,
  unpublish: async (id: string) => (await apiClient.post(`/admin/meal-plans/${id}/unpublish`)).data,
  addDay: async (id: string, body: PlanDayInput) => responseId((await apiClient.post<IdResponse>(`/admin/meal-plans/${id}/days`, body)).data),
  addSlot: async (dayId: string, body: PlanSlotInput) => responseId((await apiClient.post<IdResponse>(`/admin/meal-plan-days/${dayId}/slots`, body)).data),
  addOption: async (slotId: string, body: SlotOptionInput) => responseId((await apiClient.post<IdResponse>(`/admin/meal-plan-slots/${slotId}/options`, body)).data),
};
