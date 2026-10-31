import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, refreshAccessToken, setAccessToken } from './apiClient';
afterEach(() => { vi.restoreAllMocks(); setAccessToken(null); });
describe('React API audit attribution', () => {
  it('tags real API requests without relying on individual feature modules', async () => {
    let source: unknown;
    await apiClient.get('/audit-probe', { adapter: async config => {
      source = config.headers.get('X-Client-App');
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    } });
    expect(source).toBe('REACT_ADMIN');
  });
  it('also tags rotating-session requests', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'test-token' } } });
    await refreshAccessToken();
    expect(post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {}, expect.objectContaining({headers:{'X-Client-App':'REACT_ADMIN'}}));
  });
});
