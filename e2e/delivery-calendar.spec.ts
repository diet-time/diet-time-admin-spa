import { expect, test } from '@playwright/test';

const session = {
  accessToken: 'calendar-test-token',
  accessTokenExpiresAt: '2099-01-01T00:00:00Z',
  refreshToken: 'calendar-test-refresh',
  refreshTokenExpiresAt: '2099-01-02T00:00:00Z',
  user: { id: 'admin-1', email: 'admin@diettime.test', name: 'Admin User', roles: ['Admin'] },
};

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/refresh', (route) => route.fulfill({ json: { data: session } }));
  await page.route('**/access-control/me/screens', (route) => route.fulfill({
    json: {
      data: [{
        screenId: 'delivery-calendar', groupCode: 'operations', groupName: 'Operations',
        screenCode: 'delivery-calendar', screenName: 'Delivery Calendar', routeUrl: '/operations/delivery-calendar',
        displayOrder: 1, isActive: true, canRead: true, canWrite: true,
      }],
    },
  }));
  await page.route('**/admin/meal-plans**', (route) => route.fulfill({
    json: { data: [], meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 0 } },
  }));
  await page.route('**/admin/orders/delivery-calendar**', (route) => route.fulfill({
    json: {
      data: {
        startDate: '2026-08-01', endDate: '2026-08-31',
        days: [{
          date: '2026-08-11', totalOrders: 1, totalCustomers: 1, totalMealItems: 4,
          orders: [{ id: 'order-1', orderNumber: 'DT-000001', customerProfileId: 'customer-1', customerName: 'Sara Ali', mealPlanTemplateId: 'plan-1', planName: 'Balanced', mealCount: 4, deliverySlot: 'Morning', status: 'CONFIRMED' }],
          mealTypeTotals: [{ mealType: 'Lunch', quantity: 1 }, { mealType: 'Snack', quantity: 3 }],
        }],
      },
    },
  }));
});

test('shows order volume and opens the current day', async ({ page }) => {
  await page.goto('/operations/delivery-calendar');
  await expect(page.getByRole('heading', { name: 'Delivery Calendar' })).toBeVisible();
  await expect(page.getByText('Today at a glance')).toBeVisible();
  await expect(page.getByText('Deliveries this month')).toBeVisible();
  await expect(page.getByText('DT-000001')).not.toBeVisible();

  await page.getByRole('button', { name: 'View orders' }).click();
  await expect(page.getByText('Orders scheduled for this delivery date')).toBeVisible();
  await expect(page.getByText('DT-000001')).toBeVisible();
});

test('keeps the list view readable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/operations/delivery-calendar');
  await page.getByLabel('Calendar view').click();
  await page.getByRole('option', { name: 'List' }).click();
  await expect(page.getByRole('button', { name: /Open deliveries for/ }).first()).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
