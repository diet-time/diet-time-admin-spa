import { AxiosError } from 'axios';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { useApiActivityStore } from '@/app/store/apiActivityStore';
import { clearCachedScreenPermissions, setCachedScreenPermissions } from '@/auth/screenPermissionCache';

beforeEach(() => { useApiActivityStore.setState({ activeRequests: 0 }); clearCachedScreenPermissions(); });
afterEach(() => clearCachedScreenPermissions());

it('keeps quiet panel refreshes out of the global loading overlay', async () => {
  await apiClient.get('/quiet-refresh', { skipGlobalLoading: true, adapter: async config => {
    expect(useApiActivityStore.getState().activeRequests).toBe(0);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  } });
  expect(useApiActivityStore.getState().activeRequests).toBe(0);
  await apiClient.get('/normal-request', { adapter: async config => {
    expect(useApiActivityStore.getState().activeRequests).toBe(1);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  } });
  expect(useApiActivityStore.getState().activeRequests).toBe(0);
});

it('does not clear another request\'s loader when a background refresh or permission check fails', async () => {
  let finish!: () => void;
  const foreground = apiClient.get('/normal-request', { adapter: async config => {
    await new Promise<void>(resolve => { finish = resolve; });
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  } });
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  try {
    await expect(apiClient.get('/quiet-refresh', { skipGlobalLoading: true, adapter: async config => {
      throw new AxiosError('Network error', 'ERR_NETWORK', config);
    } })).rejects.toThrow('Network error');
    expect(useApiActivityStore.getState().activeRequests).toBe(1);
    setCachedScreenPermissions([]);
    await expect(apiClient.post('/admin/orders/id/approve')).rejects.toThrow('write permission');
    expect(useApiActivityStore.getState().activeRequests).toBe(1);
  } finally { finish(); await foreground; }
  expect(useApiActivityStore.getState().activeRequests).toBe(0);
});
