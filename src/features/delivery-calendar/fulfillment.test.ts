import { describe, expect, it } from 'vitest';
import { dailyCounts, isFutureServiceDate, visibleDeliveries, type FulfillmentFilter } from './fulfillment';
import type { CustomerDelivery } from './types';

const row = (id: string, status: string, overdue = false): CustomerDelivery => ({ id, serviceDayId: id, orderNumber: id, customerName: id, planName: 'Plan', mealCount: 1, deliverySlot: 'Morning', status: 'CONFIRMED', fulfillmentStatus: status, isOverdue: overdue });
const rows = [row('done', 'DELIVERED'), row('pending-1', 'SCHEDULED'), row('overdue-1', 'SCHEDULED', true), row('collected', 'COLLECTED'), row('overdue-2', 'SCHEDULED', true), row('pending-2', 'SCHEDULED')];
describe('daily fulfillment filters and counts', () => {
  it('blocks tomorrow until Qatar midnight, irrespective of the browser timezone', () => {
    expect(isFutureServiceDate('2026-11-03', new Date('2026-11-02T20:59:59Z'))).toBe(true);
    expect(isFutureServiceDate('2026-11-03', new Date('2026-11-02T21:00:00Z'))).toBe(false);
    expect(isFutureServiceDate('2026-11-02', new Date('2026-11-02T21:00:00Z'))).toBe(false);
  });
  it.each<[FulfillmentFilter, string[]]>([
    ['All', ['overdue-1', 'overdue-2', 'pending-1', 'pending-2', 'done', 'collected']],
    ['Pending', ['pending-1', 'pending-2']], ['Overdue', ['overdue-1', 'overdue-2']], ['Delivered', ['done']], ['Collected', ['collected']],
  ])('filters %s and keeps stable order within priority groups', (filter, expected) => {
    expect(visibleDeliveries(rows, filter).map(r => r.id)).toEqual(expected);
    expect(rows[0]?.id).toBe('done');
  });
  it('counts service days separately from orders', () => {
    expect(dailyCounts({ day: { date: '2026-11-01', operationalStatus: 'OVERDUE', totalDeliveries: 1, totalCustomers: 1, totalMealItems: 6, overrideCount: 0, totalServiceDays: 6, fulfilledCount: 2, pendingCount: 2, overdueCount: 2 }, deliveries: rows, totalMealItems: 6, overrides: [], production: [] })).toEqual({ total: 6, pending: 2, overdue: 2, fulfilled: 2 });
  });
});
