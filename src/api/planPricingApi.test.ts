import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { mealPlanPricePackagesApi, planPricingApi } from './planPricingApi';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('planPricingApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps paged package pricing returned by the admin API', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [{
          id: 'price-1',
          mealPlanTemplateId: 'plan-1',
          mealPlanCode: 'PLN_CLASSIC',
          mealPlanName: 'Balanced Living',
          mealPlanPricePackageId: 'package-1',
          packageCode: 'MONTH',
          packageNameEn: '1 Month',
          durationDays: 20,
          mealsPerDay: 3,
          snacksPerDay: 1,
          currencyCode: 'QAR',
          amount: 1600,
          effectiveFrom: '2026-08-01T00:00:00Z',
          effectiveUntil: null,
          isActive: true,
          status: 'ACTIVE',
          canDelete: false,
          translations: [
            { languageCode: 'en', name: 'Three Meals – One Week', description: 'Three meals daily.' },
            { languageCode: 'ar', name: 'ثلاث وجبات – أسبوع واحد', description: 'ثلاث وجبات يومياً.' },
          ],
        }],
        meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
      },
    });

    const result = await planPricingApi.list({ page: 1, pageSize: 25, status: 'ACTIVE', mealPlanPricePackageId: 'package-1' });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/meal-plan-pricing',
      expect.objectContaining({ params: { page: 1, pageSize: 25, status: 'ACTIVE', mealPlanPricePackageId: 'package-1' } }),
    );
    expect(result.items[0]).toMatchObject({
      mealPlanName: 'Balanced Living',
      durationDays: 20,
      mealsPerDay: 3,
      snacksPerDay: 1,
      amount: 1600,
      status: 'ACTIVE',
      translations: expect.arrayContaining([expect.objectContaining({ languageCode: 'en', name: 'Three Meals – One Week' })]),
    });
    expect(result.totalCount).toBe(1);
  });

  it('uses the package pricing create, update, status, and delete endpoints', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: 'price-1' } } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: undefined });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });
    const body = {
      mealPlanTemplateId: 'plan-1',
      mealPlanPricePackageId: 'package-1',
      mealsPerDay: 3,
      snacksPerDay: 1,
      currencyCode: 'QAR',
      amount: 1600,
      effectiveFrom: '2026-08-01T00:00:00Z',
      effectiveUntil: null,
      isActive: true,
      translations: [
        { languageCode: 'en', name: 'Three Meals – One Week', description: 'Three meals daily.' },
        { languageCode: 'ar', name: 'ثلاث وجبات – أسبوع واحد', description: 'ثلاث وجبات يومياً.' },
      ],
    };

    await planPricingApi.create(body);
    await planPricingApi.update('price-1', body);
    await planPricingApi.setStatus('price-1', false);
    await planPricingApi.remove('price-1');

    expect(apiClient.post).toHaveBeenCalledWith('/admin/meal-plan-pricing', body);
    expect(apiClient.put).toHaveBeenCalledWith('/admin/meal-plan-pricing/price-1', body);
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/meal-plan-pricing/price-1/status', { isActive: false });
    expect(apiClient.delete).toHaveBeenCalledWith('/admin/meal-plan-pricing/price-1');
  });

  it('loads price-detail translations for editing', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {
      id: 'price-1', mealPlanTemplateId: 'plan-1', mealPlanCode: 'PLAN', mealPlanName: 'Plan',
      mealPlanPricePackageId: 'week', durationDays: 6, mealsPerDay: 3, snacksPerDay: 1,
      currencyCode: 'QAR', amount: 780, effectiveFrom: '2026-08-08T00:00:00Z', effectiveUntil: null,
      isActive: true, status: 'ACTIVE', canDelete: false,
      translations: [{ languageCode: 'en', name: 'Detail name', description: 'Detail description' }],
    } } });

    const detail = await planPricingApi.get('price-1');

    expect(apiClient.get).toHaveBeenCalledWith('/admin/meal-plan-pricing/price-1', { signal: undefined });
    expect(detail.translations).toEqual([{ languageCode: 'en', name: 'Detail name', description: 'Detail description' }]);
  });

  it('lists price packages in API display order and maps pagination', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [
          { id: 'package-1', code: 'day', nameEn: '1 Day', nameAr: 'يوم واحد', durationDays: 1, displayOrder: 1, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
          { id: 'package-2', code: 'week', nameEn: '1 Week', nameAr: 'أسبوع واحد', durationDays: 6, displayOrder: 2, isActive: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
        ],
        meta: { page: 1, pageSize: 25, totalCount: 2, totalPages: 1 },
      },
    });

    const result = await mealPlanPricePackagesApi.list({ page: 1, pageSize: 25, search: 'week', isActive: false });

    expect(apiClient.get).toHaveBeenCalledWith('/admin/meal-plan-price-packages', expect.objectContaining({ params: { page: 1, pageSize: 25, search: 'week', isActive: false } }));
    expect(result.items.map((item) => item.code)).toEqual(['DAY', 'WEEK']);
    expect(result.totalCount).toBe(2);
  });

  it('loads lookup options and uses package create, update, and status endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [
      { id: 'package-2', code: 'WEEK', nameEn: '1 Week', nameAr: 'أسبوع واحد', durationDays: 6, displayOrder: 2 },
      { id: 'package-1', code: 'DAY', nameEn: '1 Day', nameAr: 'يوم واحد', durationDays: 1, displayOrder: 1 },
    ] } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { id: 'package-1' } } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: undefined });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
    const body = { code: 'WEEK', nameEn: '1 Week', nameAr: 'أسبوع واحد', durationDays: 6, displayOrder: 2, isActive: true };

    const lookup = await mealPlanPricePackagesApi.lookup();
    await mealPlanPricePackagesApi.create(body);
    await mealPlanPricePackagesApi.update('package-1', body);
    await mealPlanPricePackagesApi.setStatus('package-1', false);

    expect(lookup.map((item) => item.id)).toEqual(['package-1', 'package-2']);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/meal-plan-price-packages/lookup', { signal: undefined });
    expect(apiClient.post).toHaveBeenCalledWith('/admin/meal-plan-price-packages', body);
    expect(apiClient.put).toHaveBeenCalledWith('/admin/meal-plan-price-packages/package-1', body);
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/meal-plan-price-packages/package-1/status', { isActive: false });
  });
});
