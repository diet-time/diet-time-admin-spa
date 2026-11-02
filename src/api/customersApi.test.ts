import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { customersApi } from './customersApi';

vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn() }, adminApiUrl: (path: string) => `/api/admin/${path}` }));
beforeEach(() => vi.clearAllMocks());
it('requests searched, paginated customers and scoped order history quietly', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], totalCount: 0 } });
  await customersApi.list('Sara', 2);
  await customersApi.get('customer');
  await customersApi.orders('customer', 3);
  expect(apiClient.get).toHaveBeenCalledWith('/api/admin/customers', expect.objectContaining({ params: { search: 'Sara', pageNumber: 2, pageSize: 20 }, skipGlobalLoading: true }));
  expect(apiClient.get).toHaveBeenCalledWith('/api/admin/customers/customer', expect.objectContaining({ skipGlobalLoading: true }));
  expect(apiClient.get).toHaveBeenCalledWith('/api/admin/customers/customer/orders', expect.objectContaining({ params: { pageNumber: 3, pageSize: 20 }, skipGlobalLoading: true }));
});
