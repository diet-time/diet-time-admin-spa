import { MutationCache, QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from './store/toastStore';
import { toastErrorMessage } from '@/components/feedback/toastError';

const shouldRetryRead = (failureCount: number, error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
  }

  return failureCount < 2;
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Operations with their own handler can provide a more specific message.
      if (!mutation.options.onError) toast.error(toastErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryRead,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
