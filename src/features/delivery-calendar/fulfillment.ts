import type { CustomerDelivery, DeliveryDateDetail } from './types';

export type FulfillmentFilter = 'All' | 'Pending' | 'Overdue' | 'Delivered' | 'Collected';
export const isFulfilled = (row: CustomerDelivery) => row.fulfillmentStatus === 'DELIVERED' || row.fulfillmentStatus === 'COLLECTED';
export const fulfillmentPriority = (row: CustomerDelivery) => isFulfilled(row) ? 2 : row.isOverdue ? 0 : 1;
export const visibleDeliveries = (rows: CustomerDelivery[], filter: FulfillmentFilter) => rows.filter(row => {
  if (filter === 'All') return true;
  if (filter === 'Delivered' || filter === 'Collected') return row.fulfillmentStatus === filter.toUpperCase();
  if (filter === 'Overdue') return !isFulfilled(row) && row.isOverdue;
  return !isFulfilled(row) && !row.isOverdue;
}).sort((a, b) => fulfillmentPriority(a) - fulfillmentPriority(b));

export function dailyCounts({ day, deliveries }: DeliveryDateDetail) {
  const fulfilled = day.fulfilledCount ?? deliveries.filter(isFulfilled).length;
  const overdue = day.overdueCount ?? deliveries.filter(row => !isFulfilled(row) && row.isOverdue).length;
  const total = day.totalServiceDays ?? deliveries.length;
  return { total, fulfilled, overdue, pending: day.pendingCount ?? total - fulfilled - overdue };
}
