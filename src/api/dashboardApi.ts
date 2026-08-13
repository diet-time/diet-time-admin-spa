import { apiClient } from './apiClient';
import type { DashboardDeliveriesPage, OperationsDashboard } from './apiTypes';
export const dashboardApi = {
  operations: async (date: string, signal?: AbortSignal) => (await apiClient.get<OperationsDashboard>('/admin/dashboard/operations', { params: { date }, signal })).data,
  deliveries: async (date: string, page = 1, pageSize = 25, signal?: AbortSignal) => (await apiClient.get<DashboardDeliveriesPage>('/admin/dashboard/operations/deliveries', { params: { date, page, pageSize }, signal })).data,
};
