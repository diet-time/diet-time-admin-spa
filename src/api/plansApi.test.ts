import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { plansApi } from './plansApi';

vi.mock('./apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('plansApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the plan upsert endpoint to save and publish together', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { data: { id: 'plan-2', createdDraft: false } },
    });

    await plansApi.update('plan-1', {
      code: 'PLN_CLASSIC',
      planType: 'STANDARD',
      durationDays: 20,
      isCustomizable: true,
      translations: [{ languageCode: 'en', name: 'Classic' }],
      days: [],
      publish: true,
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      '/admin/meal-plans/plan-1',
      expect.objectContaining({ publish: true }),
    );
  });

  it('uploads plan images with imageType MEALPLAN', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          planId: 'plan-1',
          imageType: 'MEALPLAN',
          publicUrl: '/api/v1/media/meal-plans/plan-1/image.jpg',
          contentType: 'image/jpeg',
        },
      },
    });
    const file = new File(['image'], 'plan.jpg', { type: 'image/jpeg' });

    await plansApi.uploadImage('plan-1', file);

    const call = vi.mocked(apiClient.post).mock.calls[0];
    expect(call).toBeDefined();
    const body = call?.[1] as FormData;
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/meal-plans/plan-1/image/upload',
      expect.any(FormData),
      expect.any(Object),
    );
    expect((body as FormData).get('imageType')).toBe('MEALPLAN');
    expect((body as FormData).get('file')).toBe(file);
  });
});
