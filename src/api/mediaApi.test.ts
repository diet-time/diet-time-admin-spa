import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { uploadMealImage } from './mediaApi';

vi.mock('./apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('uploadMealImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads original meal images with the MEALITEM media type', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          id: 'media-1',
          mealItemId: 'meal-1',
          mediaType: 'MEALITEM',
          objectKey: 'meals/meal-1/images/image.jpg',
          contentType: 'image/jpeg',
          isPrimary: true,
          displayOrder: 0,
          status: 'ACTIVE',
        },
      },
    });
    const file = new File(['image'], 'meal.jpg', { type: 'image/jpeg' });

    await uploadMealImage('meal-1', file, 'MEALITEM');

    const body = vi.mocked(apiClient.post).mock.calls[0]?.[1] as FormData;
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/meals/meal-1/media/upload',
      expect.any(FormData),
      expect.any(Object),
    );
    expect(body.get('mediaType')).toBe('MEALITEM');
    expect(body.get('isPrimary')).toBe('true');
    expect(body.get('file')).toBe(file);
  });

  it('keeps thumbnail uploads non-primary', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          id: 'media-2',
          mealItemId: 'meal-1',
          mediaType: 'THUMBNAIL',
          objectKey: 'meals/meal-1/thumbnails/image.jpg',
          contentType: 'image/jpeg',
          isPrimary: false,
          displayOrder: 0,
          status: 'ACTIVE',
        },
      },
    });
    const file = new File(['image'], 'thumb.jpg', { type: 'image/jpeg' });

    await uploadMealImage('meal-1', file, 'THUMBNAIL');

    const body = vi.mocked(apiClient.post).mock.calls[0]?.[1] as FormData;
    expect(body.get('mediaType')).toBe('THUMBNAIL');
    expect(body.has('isPrimary')).toBe(false);
  });
});
