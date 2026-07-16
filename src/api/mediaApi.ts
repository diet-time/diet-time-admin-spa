import { apiClient } from './apiClient';

export async function uploadMealImage(
  mealId: string,
  file: File,
  onProgress?: (percentage: number) => void,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('mediaType', 'IMAGE');

  return apiClient.post(`/admin/meals/${mealId}/media/upload`, form, {
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
}

export const mediaApi = {
  removeFromMeal: async (mealId: string, mediaId: string) => (await apiClient.delete(`/admin/meals/${mealId}/media/${mediaId}`)).data,
};
