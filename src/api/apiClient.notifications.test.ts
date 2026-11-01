import type { AxiosAdapter } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { adminApiUrl, apiClient } from './apiClient';
import { clearCachedScreenPermissions, setCachedScreenPermissions } from '@/auth/screenPermissionCache';
afterEach(() => clearCachedScreenPermissions());
it('allows personal read receipts from a read-only screen and still blocks order mutations', async () => {
  setCachedScreenPermissions([]);
  const adapter: AxiosAdapter = vi.fn(async config => ({ data: undefined, status: 204, statusText: 'No Content', headers: {}, config }));
  await apiClient.patch(adminApiUrl('notifications/00000000-0000-0000-0000-000000000001/read'), undefined, { adapter });
  await apiClient.patch(adminApiUrl('notifications/read-all'), undefined, { adapter });
  await expect(apiClient.post(adminApiUrl('orders/order/approve'), {}, { adapter })).rejects.toThrow('write permission');
  expect(adapter).toHaveBeenCalledTimes(2);
});
