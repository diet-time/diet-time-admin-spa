import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/app/store/authStore';
import { apiClient, refreshAccessToken, setAccessToken } from '@/api/apiClient';
import type { AuthSessionApi } from '@/api/apiTypes';
import { endSession, restoreSession } from './session';

vi.mock('@/api/apiClient', () => ({ apiClient: { post: vi.fn() }, refreshAccessToken: vi.fn(), setAccessToken: vi.fn() }));
const session: AuthSessionApi = { accessToken: 'access', accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshToken: 'refresh', refreshTokenExpiresAt: '2099-01-02T00:00:00Z', user: { id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] } };
const rejected = () => new AxiosError('Expired session', 'ERR_BAD_REQUEST', undefined, undefined, { status: 401, data: {}, headers: {}, config: { headers: new AxiosHeaders() }, statusText: 'Unauthorized' });
beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ user: null, status: 'checking' }); });

it('waits for the cookie refresh and restores the user after a reload', async () => {
  let finish!: (value: AuthSessionApi) => void;
  vi.mocked(refreshAccessToken).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const restoration = restoreSession();
  expect(useAuthStore.getState().status).toBe('checking');
  finish(session); await restoration;
  expect(useAuthStore.getState().status).toBe('authenticated');
  expect(useAuthStore.getState().user?.id).toBe('admin');
  expect(setAccessToken).toHaveBeenCalledWith('access');
});
it('requires login only when the refresh session is rejected', async () => {
  vi.mocked(refreshAccessToken).mockRejectedValue(rejected());
  await restoreSession();
  expect(useAuthStore.getState().status).toBe('anonymous');
  expect(setAccessToken).toHaveBeenCalledWith(null);
});
it('keeps temporary refresh failures retryable without falsely logging out', async () => {
  vi.mocked(refreshAccessToken).mockRejectedValueOnce(new AxiosError('Network error', 'ERR_NETWORK')).mockResolvedValueOnce(session);
  await restoreSession();
  expect(useAuthStore.getState().status).toBe('unavailable');
  expect(setAccessToken).not.toHaveBeenCalledWith(null);
  await restoreSession();
  expect(useAuthStore.getState().status).toBe('authenticated');
});
it('still clears the client session on explicit logout', async () => {
  useAuthStore.getState().setSession(session.user);
  vi.mocked(apiClient.post).mockResolvedValue({});
  await endSession();
  expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {});
  expect(useAuthStore.getState().status).toBe('anonymous');
});
