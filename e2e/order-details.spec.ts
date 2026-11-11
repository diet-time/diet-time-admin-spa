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
    if (new URL(route.request().url()).pathname.endsWith('/package-requests')) return route.fulfill({ json: { items: [], totalCount: 0 } });
        const url=new URL(route.request().url());
    const booking=url.searchParams.get('status')==='PENDING_APPROVAL'
      ? {...order,customerName:'New Customer',order:{...order.order,id:'pending-demo',orderNumber:'ORD-DEMO-0044',status:'PENDING_APPROVAL',paymentStatus:'PENDING'}} : order;
    return route.fulfill({ json: url.pathname.endsWith('/review-demo') ? order : { items: [booking], totalCount: 1 } });
  });
  await page.route('**/admin/notifications/unread-count', route => route.fulfill({ json: { data: { unreadCount: 0 } } }));
});
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`daily orders keeps filters and status readable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/orders/daily?serviceDate=2026-11-09&status=CONFIRMED', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Orders', exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: '9 Nov 2026', exact: true })).toBeVisible();
    await expect(page.getByText('Confirmed · Qatar time', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Serving today', exact: true })).toHaveAttribute('aria-selected','true');
    if (viewport.width >= 900) {
      const navigation = page.getByRole('navigation', { name: 'Main navigation' });
      await expect(navigation.getByRole('link', { name: 'Orders', exact: true })).toBeVisible();
      await expect(navigation.getByRole('link', { name: 'Orders', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(navigation.getByRole('link', { name: 'Order Approvals', exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'pagination navigation' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (viewport.width < 900) {
      await expect(page.getByRole('article', { name: `Order ${order.order.orderNumber}` })).toBeVisible();
      await expect(page.getByRole('table', { name: 'Customer orders' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('table', { name: 'Customer orders' })).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`daily-orders-${viewport.width}.png`), fullPage: true });
    await page.getByRole('tab', { name: /Needs attention/ }).click();
    await expect(page.getByRole('heading', { name: 'Requests awaiting review', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Orders', exact: true, level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: '9 Nov 2026', exact: true })).toBeVisible();
  });
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

for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
 test(`pause requests share the grid and review drawer at ${viewport.width}px`,async({page},testInfo)=>{
  await page.setViewportSize(viewport);
  let reviewed=false;
  const pause={orderId:order.order.id,orderNumber:order.order.orderNumber,customerName:order.customerName,planName:order.order.plan.name,
   request:{id:'pause-demo',type:'PAUSE',status:'PENDING_APPROVAL',pauseStartDate:'2026-11-16',resumeDate:'2026-11-20',projectedEndDate:'2026-11-25',reason:'Travelling for work',createdAt:'2026-11-11T08:00:00Z'}};
  await page.route('**/admin/orders/package-requests**',async route=>{
   if(route.request().method()==='POST'){
    expect(route.request().postDataJSON()).toEqual({approve:true,reason:'Schedule checked'});
    reviewed=true;return route.fulfill({json:{status:'APPROVED'}});
   }
   return route.fulfill({json:{items:reviewed?[]:[pause],totalCount:reviewed?0:1}});
  });
  await page.goto('/orders');
  const grid=page.getByRole('region',{name:'Filtered customer orders'});
  await expect(grid.getByRole('button',{name:'Review pause',exact:true})).toBeVisible();
  await expect(grid.getByRole('button',{name:'Review',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`orders-attention-${viewport.width}.png`),fullPage:true});
  await page.getByRole('tab',{name:'All orders',exact:true}).click();
  await grid.getByRole('button',{name:'Pause requested',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Review pause request',exact:true});
  await expect(drawer.getByText('Travelling for work')).toBeVisible();
  await expect(drawer.getByText('Proposed package end: 25 Nov 2026')).toBeVisible();
  const approve=drawer.getByRole('button',{name:'Approve pause',exact:true});
  const bounds=await approve.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
  expect(await drawer.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await drawer.screenshot({path:testInfo.outputPath(`pause-review-${viewport.width}.png`)});
  await approve.click();expect(reviewed).toBe(false);
  await drawer.getByLabel('Review notes (optional)').fill('Schedule checked');
  await drawer.getByRole('button',{name:'Confirm approval',exact:true}).click();
  await expect(drawer).not.toBeVisible();
  await expect(grid.getByRole('button',{name:'Pause requested',exact:true})).toHaveCount(0);
  await expect(page.getByRole('tab',{name:'All orders',exact:true})).toHaveAttribute('aria-selected','true');
 });
}
