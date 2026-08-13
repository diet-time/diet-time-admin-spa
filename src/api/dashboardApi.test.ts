import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { dashboardApi } from './dashboardApi';

vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn() } }));

describe('dashboardApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the operations dashboard for the selected date', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { date: '2026-08-13' } });
    await dashboardApi.operations('2026-08-13');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/operations', expect.objectContaining({ params: { date: '2026-08-13' } }));
  });

  it('loads paged dashboard deliveries from the dedicated endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], meta: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 } } });
    await dashboardApi.deliveries('2026-08-13');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/operations/deliveries', expect.objectContaining({ params: { date: '2026-08-13', page: 1, pageSize: 25 } }));
  });
});
