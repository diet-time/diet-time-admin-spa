import { apiClient } from './apiClient';
import type { DashboardData } from './apiTypes';
export const dashboardApi = { get: async (signal?: AbortSignal) => (await apiClient.get<DashboardData>('/admin/dashboard', { signal })).data };
