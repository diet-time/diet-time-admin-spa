import { apiClient } from './apiClient';
import type { PagedResponse, PlanSummary } from './apiTypes';
import { normalizeMenuWeekday, sortMenuDays, type MenuWeekday } from '@/features/meal-plans/menuWeekdays';
export interface PlanFilters { page: number; pageSize: number; search?: string; published?: boolean }
export interface PlanTranslationInput { languageCode: 'en' | 'ar'; name: string; shortDescription?: string; fullDescription?: string }
export interface PlanStructureOptionInput { mealItemId: string; additionalPrice: number; isDefault: boolean; isAvailable: boolean; displayOrder: number }
export interface PlanStructureSlotInput { mealTypeId: string; displayOrder: number; minimumSelection: number; maximumSelection: number; isRequired: boolean; selectionCutoffTime?: string | null; allowsPaidUpgrade: boolean; options: PlanStructureOptionInput[] }
export interface PlanStructureDayInput { menuWeekday: MenuWeekday; displayOrder: number; isActive: boolean; slots: PlanStructureSlotInput[] }
export interface PlanInput { code: string; planType: string; durationDays: number; isCustomizable: boolean; validFrom?: string | null; validUntil?: string | null; translations: PlanTranslationInput[]; days?: PlanStructureDayInput[]; publish?: boolean }
export interface PlanDayInput { menuWeekday: MenuWeekday; displayOrder: number; isActive: boolean }
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
  imageUrl?: string | null;
  imageType?: 'MEALPLAN' | null;
  translations: Array<{ languageCode: string; name: string; shortDescription?: string; fullDescription?: string }>;
  days: Array<{
    id: string;
    templateId: string;
    menuWeekday: MenuWeekday;
    displayOrder: number;
    isActive: boolean;
    slotCount: number;
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

interface RawPlanDay extends Omit<PlanDetail['days'][number], 'menuWeekday' | 'displayOrder' | 'templateId' | 'isActive' | 'slotCount'> {
  templateId?: string;
  menuWeekday: string;
  displayOrder: number;
  isActive?: boolean;
  slotCount?: number;
}

interface RawPlanDetail extends Omit<PlanDetail, 'days'> { days: RawPlanDay[] }

const normalizePlanDay = (day: RawPlanDay, templateId: string): PlanDetail['days'][number] => ({
  ...day,
  templateId: day.templateId ?? templateId,
  menuWeekday: normalizeMenuWeekday(day.menuWeekday),
  displayOrder: day.displayOrder,
  isActive: day.isActive ?? true,
  slotCount: day.slotCount ?? day.slots.length,
});

const normalizePlanDetail = (plan: RawPlanDetail): PlanDetail => ({
  ...plan,
  days: sortMenuDays(plan.days.map((day) => normalizePlanDay(day, plan.id))),
});

interface IdResponse { data?: { id?: string }; id?: string }
interface VersionedUpdateApiResponse { data: { id: string; createdDraft: boolean } }
interface PlanImageApiResponse { data: { planId: string; imageType: 'MEALPLAN'; publicUrl: string; contentType: string } }

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
    const response = await apiClient.get<{ data: RawPlanDetail }>(`/admin/meal-plans/${id}`, { signal });
    return normalizePlanDetail(response.data.data);
  },
  create: async (body: PlanInput) => responseId((await apiClient.post<IdResponse>('/admin/meal-plans', body)).data),
  update: async (id: string, body: PlanInput) => (await apiClient.put<VersionedUpdateApiResponse>(`/admin/meal-plans/${id}`, body)).data.data,
  uploadImage: async (id: string, file: File, onProgress?: (percentage: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    form.append('imageType', 'MEALPLAN');
    const response = await apiClient.post<PlanImageApiResponse>(`/admin/meal-plans/${id}/image/upload`, form, {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
      },
    });
    return response.data.data;
  },
  remove: async (id: string) => (await apiClient.delete(`/admin/meal-plans/${id}`)).data,
  getTemplateDays: async (id: string, signal?: AbortSignal) => {
    const response = await apiClient.get<{ data: RawPlanDay[] }>(`/admin/meal-plan-templates/${id}/days`, { signal });
    return sortMenuDays(response.data.data.map((day) => normalizePlanDay({ ...day, slots: day.slots ?? [] }, id)));
  },
  createTemplateDay: async (id: string, body: PlanDayInput) => responseId((await apiClient.post<IdResponse>(`/admin/meal-plan-templates/${id}/days`, body)).data),
  updateTemplateDay: async (id: string, dayId: string, body: PlanDayInput) => (await apiClient.put(`/admin/meal-plan-templates/${id}/days/${dayId}`, body)).data,
  deleteTemplateDay: async (id: string, dayId: string) => (await apiClient.delete(`/admin/meal-plan-templates/${id}/days/${dayId}`)).data,
  getTemplateDayByWeekday: async (id: string, weekday: MenuWeekday, signal?: AbortSignal) => (await apiClient.get(`/admin/meal-plan-templates/${id}/days/by-weekday/${weekday}`, { signal })).data,
  addSlot: async (dayId: string, body: PlanSlotInput) => responseId((await apiClient.post<IdResponse>(`/admin/meal-plan-days/${dayId}/slots`, body)).data),
  addOption: async (slotId: string, body: SlotOptionInput) => responseId((await apiClient.post<IdResponse>(`/admin/meal-plan-slots/${slotId}/options`, body)).data),
};
