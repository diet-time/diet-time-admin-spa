import { apiClient, adminApiUrl } from './apiClient';
import type { StaffOrder } from './staffOrdersApi';

export interface AdminCustomer {
  id: string; name: string; phone?: string; email?: string; registeredAt?: string; isActive: boolean;
  preferredLanguage: string; totalOrders: number; bookedPlans: number; activePlans: number; pausedPlans: number;
  pendingOrders: number; cancelledOrders: number; rejectedOrders: number; latestOrderAt?: string;
}
export interface CustomerPage { items: AdminCustomer[]; totalCount: number; pageNumber: number; pageSize: number }
export interface CustomerOrdersPage { items: StaffOrder[]; totalCount: number; pageNumber: number; pageSize: number }

export const customersApi = {
  list: async (search: string, page: number, signal?: AbortSignal, sort?: string) => (await apiClient.get<CustomerPage>(adminApiUrl('customers'), { params: { search: search || undefined, pageNumber: page, pageSize: 20, ...(sort ? { sort } : {}) }, signal, skipGlobalLoading: true })).data,
  get: async (id: string, signal?: AbortSignal) => (await apiClient.get<AdminCustomer>(adminApiUrl(`customers/${id}`), { signal, skipGlobalLoading: true })).data,
  orders: async (id: string, page: number, signal?: AbortSignal) => (await apiClient.get<CustomerOrdersPage>(adminApiUrl(`customers/${id}/orders`), { params: { pageNumber: page, pageSize: 20 }, signal, skipGlobalLoading: true })).data,
};
