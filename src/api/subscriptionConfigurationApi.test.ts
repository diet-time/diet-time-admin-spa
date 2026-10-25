import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { subscriptionPricingApi } from './subscriptionConfigurationApi';

vi.mock('./apiClient', () => ({ apiClient: { patch: vi.fn(), put: vi.fn() }, adminApiUrl: (path: string) => path }));
beforeEach(() => vi.clearAllMocks());

it('deactivates through the existing status endpoint without resubmitting price mappings', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
  await subscriptionPricingApi.setStatus('legacy-price', false);
  expect(apiClient.patch).toHaveBeenCalledWith('/admin/meal-plan-pricing/legacy-price/status', { isActive: false });
  expect(apiClient.put).not.toHaveBeenCalled();
});

it('uses the status endpoint to reactivate the selected price', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
  await subscriptionPricingApi.setStatus('price-1', true);
  expect(apiClient.patch).toHaveBeenCalledWith('/admin/meal-plan-pricing/price-1/status', { isActive: true });
});
