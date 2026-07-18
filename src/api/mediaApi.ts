import { apiClient } from './apiClient';

export type MealMediaType = 'IMAGE' | 'THUMBNAIL';

export interface MealMedia {
  id: string;
  mealItemId: string;
  mediaType: MealMediaType;
  objectKey: string;
  publicUrl?: string;
  contentType: string;
  isPrimary: boolean;
  displayOrder: number;
  status: string;
  altTextEn?: string;
}

export async function uploadMealImage(
  mealId: string,
  file: File,
  mediaType: MealMediaType,
  onProgress?: (percentage: number) => void,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('mediaType', mediaType);

  const response = await apiClient.post<{ data: MealMedia }>(`/admin/meals/${mealId}/media/upload`, form, {
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data.data;
}

export const mediaApi = {
  removeFromMeal: async (mealId: string, mediaId: string) => (await apiClient.delete(`/admin/meals/${mealId}/media/${mediaId}`)).data,
};
