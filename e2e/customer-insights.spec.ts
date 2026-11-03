import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`customer ranking fits and links to existing customers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { data: { accessToken: 'test-access', accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshToken: 'test-refresh', refreshTokenExpiresAt: '2099-01-02T00:00:00Z', user: { id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] } } } });
      if (path.endsWith('/access-control/me/screens')) return route.fulfill({ json: { data: ['/', '/customers', '/orders'].map((routeUrl, i) => ({ screenId: `screen-${i}`, groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: `SCREEN_${i}`, screenName: 'Screen', routeUrl, displayOrder: i, isActive: true, canRead: true, canWrite: false })) } });
      if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { data: { unreadCount: 0 } } });
      if (path.endsWith('/dashboard/operations')) return route.fulfill({ json: {
        date: '2026-11-03', today: { scheduledDeliveries: 0, customers: 0, mealsToPrepare: 0, completedDeliveries: null },
        nextDeliveryDay: null, nextSevenDays: [], todayDeliveries: [], upcomingPlanActivity: { starting: [], ending: [] },
        needsAttention: { ordersRequiringReview: 0, missingDeliveryAddresses: 0, plansEndingSoon: 0, customersWithoutUpcomingDelivery: 0, deliveryConflicts: 0 },
        customerInsights: { throughDate: '2026-11-03', newCustomersFrom: '2026-10-05', customersWithBookings: 48, repeatCustomers: 18, newCustomers: 9, bookedOrders: 83, repeatCustomerRate: 37.5,
          topCustomers: ['Biju Menon', 'Aisha Al Mansouri', 'Miraz', 'Sara Mohammed Abdullah Al Kuwari', 'Ramesh Kumar'].map((customerName, i) => ({ customerId: `customer-${i}`, customerName, bookedOrders: 12 - i * 2, latestBookingAt: '2026-11-03T07:00:00Z' })) }
      } });
      if (path.endsWith('/customers')) return route.fulfill({ json: { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Customer insights' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Customers ranked by booked orders' }).getByRole('listitem')).toHaveCount(5);
    await expect(page.getByText('37.5% have booked more than once')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Orders by day' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/customer-insights-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'View customers', exact: true }).click();
    await expect(page).toHaveURL(/\/customers$/);
  });
}
