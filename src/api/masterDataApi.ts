import { apiClient } from './apiClient';
import type { MasterRecord, PagedResponse } from './apiTypes';
import i18n from '@/i18n';
export interface MasterFilters { page: number; pageSize: number; search?: string; sort?: string }
export interface MasterInput { code: string; nameEn: string; nameAr?: string; descriptionEn?: string; descriptionAr?: string; displayOrder?: number; isActive: boolean }
export type MasterResource = 'meal-categories' | 'ingredients' | 'allergens' | 'meal-types';
interface MasterListApiItem {
  id: string;
  code?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  displayOrder?: number;
  isActive?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
export const masterDataApi = {
  list: async (resource: MasterResource, filters: MasterFilters, signal?: AbortSignal) => {
    if (resource !== 'meal-types' && resource !== 'allergens' && resource !== 'ingredients' && resource !== 'meal-categories') {
      throw new Error(`The backend does not expose a list endpoint for ${resource}.`);
    }

    const isAdminResource = resource === 'allergens' || resource === 'ingredients' || resource === 'meal-categories';
    const endpoint = isAdminResource ? `/admin/${resource}` : '/meal-types';
    // GET /meal-types returns the complete public list. It only accepts the
    // normalized language value, not browser locales or list parameters.
    const params = isAdminResource
      ? { ...filters, sort: filters.sort ?? 'createdAt_desc' }
      : { language: i18n.resolvedLanguage === 'ar' ? 'ar' : 'en' };
    const response = await apiClient.get<{ data?: MasterListApiItem[]; meta?: { page?: number; pageSize?: number; totalCount?: number; totalPages?: number } }>(endpoint, { params, signal });
    const items = response.data.data ?? [];
    return {
      items: items.map((item) => ({
        id: item.id,
        code: item.code ?? '',
        nameEn: item.nameEn ?? item.name ?? '',
        nameAr: item.nameAr,
        descriptionEn: item.descriptionEn,
        descriptionAr: item.descriptionAr,
        displayOrder: item.displayOrder,
        isActive: item.isActive ?? true,
        usageCount: item.usageCount ?? 0,
        createdAt: item.createdAt ?? '',
        updatedAt: item.updatedAt ?? '',
      })),
      page: response.data.meta?.page ?? filters.page,
      pageSize: response.data.meta?.pageSize ?? filters.pageSize,
      totalCount: response.data.meta?.totalCount ?? items.length,
      totalPages: response.data.meta?.totalPages ?? 1,
    } satisfies PagedResponse<MasterRecord>;
  },
  create: async (resource: MasterResource, body: MasterInput) => (await apiClient.post(`/admin/${resource}`, body)).data,
  update: async (resource: MasterResource, id: string, body: MasterInput) => (await apiClient.put(`/admin/${resource}/${id}`, body)).data,
};
