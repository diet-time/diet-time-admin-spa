import axios, { type AxiosError } from 'axios';
import type { ApiErrorBody } from './apiTypes';

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL && !import.meta.env.DEV) throw new Error('VITE_API_BASE_URL is required');

export const apiClient = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 403) window.dispatchEvent(new CustomEvent('api:forbidden'));
    return Promise.reject(error);
  },
);

export const friendlyApiError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const correlation = error.response?.data?.correlationId;
    if (correlation) console.warn('API correlation ID:', correlation);
  }
  return fallback;
};
