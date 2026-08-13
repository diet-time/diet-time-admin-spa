import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { deliveryCalendarApi } from './deliveryCalendarApi';

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('./plansApi', () => ({
  plansApi: { list: vi.fn() },
}));

const monthResponse = {
  data: {
    data: {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      days: [{
        date: '2026-08-11',
        totalOrders: 1,
        totalCustomers: 1,
        totalMealItems: 4,
        orders: [{
          id: 'order-1', orderNumber: 'DT-000001', customerProfileId: 'customer-1', customerName: 'Sara Ali',
          mealPlanTemplateId: 'plan-1', planName: 'Balanced', mealCount: 4, deliverySlot: 'Morning', status: 'CONFIRMED',
        }],
        mealTypeTotals: [{ mealType: 'Lunch', quantity: 1 }, { mealType: 'Snack', quantity: 3 }],
      }],
    },
  },
};

describe('deliveryCalendarApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads month totals from the admin order calendar endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(monthResponse);

    const result = await deliveryCalendarApi.month('2026-08', { planId: 'plan-1', status: 'CONFIRMED', hasOverride: '', closure: '' });

    expect(apiClient.get).toHaveBeenCalledWith('/admin/orders/delivery-calendar', expect.objectContaining({
      params: { month: '2026-08', planId: 'plan-1', orderStatus: 'CONFIRMED' },
    }));
    expect(result).toEqual([expect.objectContaining({
      date: '2026-08-11', totalDeliveries: 1, totalCustomers: 1, totalMealItems: 4, operationalStatus: 'SCHEDULED',
    })]);
  });

  it('maps real orders and meal quantities into date details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(monthResponse);

    const result = await deliveryCalendarApi.detail('2026-08-11');

    expect(result.deliveries[0]).toMatchObject({ orderNumber: 'DT-000001', customerName: 'Sara Ali', mealCount: 4 });
    expect(result.production).toEqual([{ mealType: 'Lunch', quantity: 1 }, { mealType: 'Snack', quantity: 3 }]);
    expect(result.overrides).toEqual([]);
  });

  it('loads a typed kitchen preparation summary for the selected date', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {
      date: '2026-08-15', status: 'SCHEDULED', orderCount: 2, customerCount: 2, mealItemCount: 6,
      mealTypes: [{ mealTypeId: 'type-1', mealTypeName: 'Lunch', quantity: 6, items: [{ menuItemId: 'meal-1', menuItemName: 'Chicken with Rice', quantity: 6 }] }],
      planBreakdown: [{ mealPlanId: 'plan-1', mealPlanName: 'Balanced Living', orderCount: 2 }],
    } } });

    const result = await deliveryCalendarApi.preparationSummary('2026-08-15');

    expect(apiClient.get).toHaveBeenCalledWith('/admin/delivery-calendar/2026-08-15/preparation-summary', expect.any(Object));
    expect(result.mealTypes[0]?.items[0]).toMatchObject({ menuItemName: 'Chicken with Rice', quantity: 6 });
    expect(result.planBreakdown[0]?.orderCount).toBe(2);
  });
});
