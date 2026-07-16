import { apiClient } from './apiClient';
import type { AuditEntry, PagedResponse } from './apiTypes';
export const auditApi = { list: async (params: object, signal?: AbortSignal) => (await apiClient.get<PagedResponse<AuditEntry>>('/admin/audit', { params, signal })).data };
