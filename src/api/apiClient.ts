import axios, { type AxiosError } from 'axios';
import type { ApiEnvelope, ApiErrorBody, AuthSessionApi } from './apiTypes';
import { useApiActivityStore } from '@/app/store/apiActivityStore';
import { useAuthStore } from '@/app/store/authStore';
import { canWriteFromPath, clearCachedScreenPermissions } from '@/auth/screenPermissionCache';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5004/' : undefined);
if (!configuredBaseUrl) throw new Error('VITE_API_BASE_URL is required');

const normalizedConfiguredBaseUrl = configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`;
const baseURL = /\/api\/v\d+\/$/i.test(normalizedConfiguredBaseUrl)
  ? normalizedConfiguredBaseUrl
  : new URL('api/v1/', normalizedConfiguredBaseUrl).toString();

/** Unversioned admin endpoints used by newer meal-configuration controllers. */
export const adminApiUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ''), new URL('../admin/', baseURL)).toString();

let accessToken: string | null = null;
let refreshPromise: Promise<AuthSessionApi> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (!token) clearCachedScreenPermissions();
};

export const apiClient = axios.create({
  baseURL,
  timeout: 20_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() ?? 'GET';
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const isAuthRequest = config.url?.includes('/auth/') || config.url?.startsWith('auth/');
  if (isMutation && !isAuthRequest && !canWriteFromPath(window.location.pathname))
    return Promise.reject(new Error('You do not have write permission for this screen.'));
  useApiActivityStore.getState().requestStarted();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    useApiActivityStore.getState().requestFinished();
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    useApiActivityStore.getState().requestFinished();
    const request = error.config;
    const isAuthEndpoint = request?.url?.includes('/auth/');
    const retryableRequest = request as (typeof request & { _authRetry?: boolean }) | undefined;
    if (error.response?.status === 401 && request && !isAuthEndpoint && !retryableRequest?._authRetry) {
      retryableRequest!._authRetry = true;
      try {
        await refreshAccessToken();
        return apiClient.request(request);
      } catch {
        setAccessToken(null);
        useAuthStore.getState().clear();
      }
    }
    if (error.response?.status === 403) window.dispatchEvent(new CustomEvent('api:forbidden'));
    return Promise.reject(error);
  },
);

export const refreshAccessToken = async () => {
  refreshPromise ??= axios
    .post<ApiEnvelope<AuthSessionApi>>(`${baseURL}auth/refresh`, {}, { withCredentials: true, timeout: 20_000 })
    .then((response) => {
      setAccessToken(response.data.data.accessToken);
      return response.data.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

export const friendlyApiError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const correlation = error.response?.data?.correlationId;
    if (correlation) console.warn('API correlation ID:', correlation);
  }
  return fallback;
};
