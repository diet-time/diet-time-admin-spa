import axios, { type AxiosError } from 'axios';
import type { ApiErrorBody } from './apiTypes';
import { useApiActivityStore } from '@/app/store/apiActivityStore';

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL && !import.meta.env.DEV) throw new Error('VITE_API_BASE_URL is required');

export const apiClient = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  useApiActivityStore.getState().requestStarted();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    useApiActivityStore.getState().requestFinished();
    return response;
  },
  (error: AxiosError<ApiErrorBody>) => {
    useApiActivityStore.getState().requestFinished();
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
