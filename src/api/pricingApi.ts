import { apiClient } from './apiClient';
export const pricingApi = { list: async (params: object, signal?: AbortSignal) => (await apiClient.get('/admin/pricing', { params, signal })).data };
