import { packageRequestsApi } from '@/api/packageRequestsApi';
import { staffOrdersApi } from '@/api/staffOrdersApi';

export const workspacePageSize = 20;

// Pending requests are independent of the service-date filter. Load every request
// page so badges and the attention count include requests beyond the first page.
export async function listPendingRequests() {
  const first = await packageRequestsApi.list(1);
  const rest = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.totalCount / 20) - 1) },
    (_, index) => packageRequestsApi.list(index + 2)));
  return [first, ...rest].flatMap(page => page.items);
}

// Requests lead the attention queue. Read only the one or two booking pages
// needed to fill the remaining space, rather than downloading every order.
export async function listWorkspaceOrders(status: string, page: number, requestCount: number, serviceDate?: string) {
  const start = (page - 1) * workspacePageSize;
  const requestSlots = Math.min(workspacePageSize, Math.max(0, requestCount - start));
  const offset = Math.max(0, start - requestCount);
  const orderPage = Math.floor(offset / workspacePageSize) + 1;
  const first = await staffOrdersApi.list(status, orderPage, serviceDate);
  const count = workspacePageSize - requestSlots;
  const skip = offset % workspacePageSize;
  const second = count > 0 && skip + count > workspacePageSize && first.totalCount > orderPage * workspacePageSize
    ? await staffOrdersApi.list(status, orderPage + 1, serviceDate) : undefined;
  return { items: [...first.items, ...(second?.items ?? [])].slice(skip, skip + count), totalCount: first.totalCount };
}
