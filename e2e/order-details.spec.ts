import { expect, test } from '@playwright/test';

const session = {
  accessToken: 'order-review-test-token', accessTokenExpiresAt: '2099-01-01T00:00:00Z',
  refreshToken: 'order-review-test-refresh', refreshTokenExpiresAt: '2099-01-02T00:00:00Z',
  user: { id: 'admin-demo', email: 'admin@diettime.test', name: 'Admin User', roles: ['Admin'] },
};
const order = {
  customerName: 'Sample Customer', customerPhone: '+97455555555',
  order: {
    id: 'review-demo', orderNumber: 'ORD-DEMO-0043', status: 'ACTIVE', paymentStatus: 'PAID', placedAt: '2026-10-30T12:00:00Z',
    plan: { name: 'Complete Balance', durationName: '2 Weeks' }, mealCount: 2, snackCount: 1, fulfillmentMethod: 'HOME_DELIVERY',
    delivery: { startDate: '2026-10-31', endDate: '2026-11-12', days: [1, 2, 3, 4, 6, 7],
      serviceDates: ['2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-07','2026-11-08','2026-11-09','2026-11-10','2026-11-11','2026-11-12'],
      address: { formattedAddress: 'Al Waab, Doha, Qatar', area: 'Al Waab', buildingNo: '15', streetNo: '960', zoneNo: '55' }, timeSlot: { name: 'Morning' } },
    pricing: { currencyCode: 'QAR', totalAmount: 999 }, review: { rowVersion: 5, requiresPrepayment: false, awaitingPayment: false, canFulfill: true },
  },
  history: [
    { id: 'history-first', status: 'CONFIRMED', changedAt: '2026-10-30T18:53:35Z', reason: 'Order placed by customer' },
    { id: 'history-active', previousStatus: 'CONFIRMED', status: 'ACTIVE', changedBy: 'internal-staff-id', changedAt: '2026-10-31T05:54:55Z', reason: 'Service schedule activated' },
    { id: 'history-payment', previousStatus: 'ACTIVE', status: 'ACTIVE', previousPaymentStatus: 'PENDING', paymentStatus: 'PAID', changedBy: 'internal-payment-id', changedAt: '2026-10-31T05:55:07Z', reason: 'Manual payment verified' },
  ],
};
test.beforeEach(async ({ page }) => {
  await page.route('**/auth/refresh', route => route.fulfill({ json: { data: session } }));
  await page.route('**/access-control/me/screens', route => route.fulfill({ json: { data: [{ screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 1, isActive: true, canRead: true, canWrite: true }] } }));
  await page.route('**/admin/orders**', route => {
    if (route.request().method() !== 'GET') return route.abort();
    return route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/review-demo') ? order : { items: [order], totalCount: 1 } });
  });
});
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`order review stays readable and actions remain visible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/orders?status=ACTIVE&orderId=review-demo', { waitUntil: 'domcontentloaded' });
    const dialog = page.getByRole('dialog', { name: /Order details/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Customer', exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Home Delivery', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Mark Completed', exact: true })).toHaveCount(0);
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    const box = await close.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.screenshot({ path: testInfo.outputPath(`order-details-${viewport.width}.png`) });
    await dialog.getByRole('button', { name: /Service dates/ }).click();
    await expect(dialog.getByRole('list', { name: 'Scheduled service dates' }).getByRole('listitem')).toHaveCount(12);
    await dialog.getByRole('button', { name: /Activity history/ }).click();
    await expect(dialog.getByText('Manual payment verified')).toBeVisible();
    await expect(dialog.getByText('Actor ID: internal-payment-id')).not.toBeVisible();
    await dialog.getByRole('button', { name: 'Payment management', exact: true }).click();
    await dialog.getByRole('button', { name: 'Record Payment Status', exact: true }).click();
    const payment = page.getByRole('dialog', { name: 'Confirm payment', exact: true });
    await expect(payment).toBeVisible();
    await expect(payment.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
    await payment.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });
}
