import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { planPricingApi } from './planPricingApi';

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
        }],
        meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
      },
    });

    const result = await planPricingApi.list({ page: 1, pageSize: 25, status: 'ACTIVE' });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/meal-plan-pricing',
      expect.objectContaining({ params: { page: 1, pageSize: 25, status: 'ACTIVE' } }),
    );
    expect(result.items[0]).toMatchObject({
      mealPlanName: 'Balanced Living',
      durationDays: 20,
      mealsPerDay: 3,
      snacksPerDay: 1,
      amount: 1600,
      status: 'ACTIVE',
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
      durationDays: 20,
      mealsPerDay: 3,
      snacksPerDay: 1,
      currencyCode: 'QAR',
      amount: 1600,
      effectiveFrom: '2026-08-01T00:00:00Z',
      effectiveUntil: null,
      isActive: true,
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
});
