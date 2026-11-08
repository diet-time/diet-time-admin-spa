import { isAxiosError } from 'axios';

export function toastErrorMessage(error: unknown, fallback = 'The change could not be saved. Please try again.') {
  if (isAxiosError<{ message?: string; detail?: string; errors?: Array<{ message?: string }> }>(error)) {
    const data = error.response?.data;
    return data?.message || data?.detail || (Array.isArray(data?.errors) && data.errors[0]?.message) || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
