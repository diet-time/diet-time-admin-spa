import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { staffOrdersApi } from './staffOrdersApi';
vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn() }, adminApiUrl: (path: string) => `/api/admin/${path}` }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], totalCount: 0 } }); });
describe('Staff daily orders API', () => {
  it('sends the selected service date before server pagination', async () => {
    await staffOrdersApi.list('', 2, '2026-11-01');
    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/orders', { params: { status: undefined, pageNumber: 2, pageSize: 20, serviceDate: '2026-11-01' } });
  });
  it('keeps the existing global pending queue independent of dates', async () => {
    await staffOrdersApi.list('PENDING_APPROVAL', 1);
    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/orders', { params: { status: 'PENDING_APPROVAL', pageNumber: 1, pageSize: 20 } });
  });
});
