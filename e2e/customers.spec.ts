import { expect, test } from '@playwright/test';

test.setTimeout(90_000);
const customer = { id: 'customer-1', name: 'Sara Ali', phone: '+97455555555', email: 'sara@example.test', registeredAt: '2026-10-01T08:00:00Z', isActive: true, preferredLanguage: 'en', totalOrders: 7, bookedPlans: 4, activePlans: 1, pausedPlans: 1, pendingOrders: 1, cancelledOrders: 1, rejectedOrders: 1, latestOrderAt: '2026-11-02T08:00:00Z' };
const order = { customerName: customer.name, customerPhone: customer.phone, history: [], order: { id: 'order-1', orderNumber: 'ORD-001', status: 'CONFIRMED', paymentStatus: 'PAID', placedAt: '2026-11-02T08:00:00Z', plan: { name: 'Balanced plan', durationName: '12 days' }, mealCount: 2, snackCount: 1, fulfillmentMethod: 'TAKEAWAY', takeawayBranch: { name: 'Azizia Branch' }, delivery: { startDate: '2026-11-03', endDate: '2026-11-16', days: [1, 2, 3, 4, 6, 7], serviceDates: [] }, pricing: { totalAmount: 700, currencyCode: 'QAR' }, review: { rowVersion: 1, requiresPrepayment: false, awaitingPayment: false, canFulfill: true } } };

for (const width of [1440, 390]) {
  test(`customers, search, drawer and existing order details work at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); const path = url.pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { data: { accessToken: 'test-access', accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshToken: 'test-refresh', refreshTokenExpiresAt: '2099-01-02T00:00:00Z', user: { id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] } } } });
      if (path.endsWith('/access-control/me/screens')) return route.fulfill({ json: { data: ['/customers', '/orders'].map((routeUrl, i) => ({ screenId: `screen-${i}`, groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: `SCREEN_${i}`, screenName: 'Screen', routeUrl, displayOrder: i, isActive: true, canRead: true, canWrite: false })) } });
      if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { data: { unreadCount: 0 } } });
      if (path.endsWith('/customers/customer-1/orders')) return route.fulfill({ json: { items: [order], totalCount: 1, pageNumber: 1, pageSize: 20 } });
      if (path.endsWith('/customers/customer-1')) return route.fulfill({ json: customer });
      if (path.endsWith('/customers')) return route.fulfill({ json: { items: [customer], totalCount: 1, pageNumber: 1, pageSize: 20 } });
      if (path.endsWith('/orders/order-1')) return route.fulfill({ json: order });
      if (path.endsWith('/admin/orders')) return route.fulfill({ json: { items: [order], totalCount: 1 } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Customers', exact: true, level: 2 })).toBeVisible();
    await expect(page.getByText('sara@example.test')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`customers-${width}.png`), fullPage: true });
    await page.getByLabel('Search customers').fill('Sara');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/search=Sara/);
    await page.getByRole('button', { name: 'View customer Sara Ali' }).click();
    const drawer = page.getByRole('dialog', { name: 'Customer details' });
    await expect(drawer.getByText('Balanced plan')).toBeVisible();
    await expect(drawer.getByText('7 total orders')).toBeVisible();
    expect(await drawer.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await drawer.screenshot({ path: testInfo.outputPath(`customer-details-${width}.png`) });
    await drawer.getByRole('button', { name: 'View order' }).click();
    await expect(page).toHaveURL(/\/orders\?orderId=order-1$/);
    await expect(page.getByRole('dialog', { name: /Order details/ })).toBeVisible();
  });
}
