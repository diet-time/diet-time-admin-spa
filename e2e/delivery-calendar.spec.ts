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
});

test('shows order volume and opens the current day', async ({ page }) => {
  await page.goto('/operations/delivery-calendar');
  await expect(page.getByRole('heading', { name: 'Delivery Calendar' })).toBeVisible();
  await expect(page.getByText('Today at a glance')).toBeVisible();
  await expect(page.getByText('Deliveries this month')).toBeVisible();

  await page.getByRole('button', { name: 'View orders' }).click();
  await expect(page.getByText('Operations for this calendar date')).toBeVisible();
});

test('keeps the list view readable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/operations/delivery-calendar');
  await page.getByRole('button', { name: 'List' }).click();
  await expect(page.getByRole('button', { name: /Open deliveries for/ }).first()).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
