import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { notificationsApi } from './notificationsApi';
vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() }, adminApiUrl: (path: string) => '/api/admin/' + path }));
beforeEach(() => vi.clearAllMocks());
it('uses recipient-scoped endpoints without accepting a recipient ID', async () => {
  vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: { items: [], page: 1, pageSize: 20, totalCount: 0 } } }).mockResolvedValueOnce({ data: { data: { unreadCount: 4 } } });
  expect((await notificationsApi.list(1)).items).toEqual([]);
  expect(await notificationsApi.unreadCount()).toBe(4);
  await notificationsApi.read('id'); await notificationsApi.readAll();
  expect(apiClient.get).toHaveBeenCalledWith('/api/admin/notifications', { params: { page: 1, pageSize: 20 }, signal: undefined, skipGlobalLoading: true });
  expect(apiClient.get).toHaveBeenCalledWith('/api/admin/notifications/unread-count', { signal: undefined, skipGlobalLoading: true });
  expect(apiClient.patch).toHaveBeenCalledWith('/api/admin/notifications/id/read', undefined, { skipGlobalLoading: true });
  expect(apiClient.patch).toHaveBeenCalledWith('/api/admin/notifications/read-all', undefined, { skipGlobalLoading: true });
});
