import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

const shouldRetryRead = (failureCount: number, error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
  }

  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryRead,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
