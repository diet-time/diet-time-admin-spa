import { isAxiosError } from 'axios';

export const isSessionRejected = (error: unknown) => isAxiosError(error) &&
  (error.response?.status === 401 || error.response?.status === 403);
