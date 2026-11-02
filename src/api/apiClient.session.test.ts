import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiClient, refreshAccessToken, setAccessToken } from './apiClient';
import { useAuthStore } from '@/app/store/authStore';

const unauthorized = (config: InternalAxiosRequestConfig) => new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config });
beforeEach(() => { setAccessToken('old'); useAuthStore.getState().setSession({ id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] }); });
afterEach(() => { vi.restoreAllMocks(); setAccessToken(null); useAuthStore.getState().clear(); });

it('uses the Admin origin for browser session restoration', async () => {
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new' } } });
  await refreshAccessToken();
  expect(post).toHaveBeenCalledWith(`${window.location.origin}/api/v1/auth/refresh`, {}, expect.objectContaining({ withCredentials: true }));
});
it('shares one refresh across concurrent unauthorized requests and retries with the rotated access token', async () => {
  let finish!: (value: unknown) => void;
  const post = vi.spyOn(axios, 'post').mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const config: AxiosRequestConfig = { adapter: async config => {
    if (config.headers.Authorization !== 'Bearer new') throw unauthorized(config);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  } };
  const requests = [apiClient.get('/probe-1', config), apiClient.get('/probe-2', config)];
  await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
  finish({ data: { data: { accessToken: 'new' } } });
  await Promise.all(requests);
  expect(post).toHaveBeenCalledOnce();
});
it('does not discard an authenticated session when refresh has a network error', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('Network error', 'ERR_NETWORK'));
  await expect(apiClient.get('/probe', { adapter: async config => { throw unauthorized(config); } })).rejects.toThrow('Unauthorized');
  expect(useAuthStore.getState().status).toBe('authenticated');
});
it('clears authentication when the server rejects the refresh session', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue(unauthorized({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig));
  await expect(apiClient.get('/probe', { adapter: async config => { throw unauthorized(config); } })).rejects.toThrow('Unauthorized');
  expect(useAuthStore.getState().status).toBe('anonymous');
});
