import { expect, test, type Page } from '@playwright/test';

test.setTimeout(90_000);
const account = { id: 'test-admin', name: 'Test Admin', email: 'admin@example.test', roles: ['Admin'] };
async function backend(page: Page) {
  const state = { refreshToken: '', revision: 0, unavailable: false };
  const issue = () => {
    state.refreshToken = `test-refresh-${++state.revision}`;
    return { accessToken: `test-access-${state.revision}`, accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshToken: state.refreshToken, refreshTokenExpiresAt: '2099-01-02T00:00:00Z', user: account };
  };
  const cookie = () => `diet_time_refresh=${state.refreshToken}; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=86400`;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { data: issue() }, headers: { 'Set-Cookie': cookie() } });
    if (path.endsWith('/auth/refresh')) {
      if (state.unavailable) return route.fulfill({ status: 503, json: { detail: 'Temporarily unavailable' } });
      const headers = await route.request().allHeaders();
      if (!state.refreshToken || !headers.cookie?.includes(`diet_time_refresh=${state.refreshToken}`)) return route.fulfill({ status: 401, json: { detail: 'Invalid session' } });
      return route.fulfill({ json: { data: issue() }, headers: { 'Set-Cookie': cookie() } });
    }
    if (path.endsWith('/auth/logout')) {
      state.refreshToken = '';
      return route.fulfill({ status: 204, headers: { 'Set-Cookie': 'diet_time_refresh=; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=0' } });
    }
    if (path.endsWith('/access-control/me/screens')) return route.fulfill({ json: { data: ['/', '/orders/daily'].map((routeUrl, index) => ({ screenId: `screen-${index}`, screenCode: `SCREEN_${index}`, screenName: 'Screen', groupCode: 'OPERATIONS', groupName: 'Operations', routeUrl, displayOrder: index, isActive: true, canRead: true, canWrite: true })) } });
    if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { data: { unreadCount: 0 } } });
    if (path.endsWith('/admin/dashboard/operations')) return route.fulfill({ json: { date: '2026-11-02', today: { scheduledDeliveries: 0, customers: 0, mealsToPrepare: 0, completedDeliveries: null }, nextSevenDays: [], todayDeliveries: [], needsAttention: { ordersRequiringReview: 0 }, upcomingPlanActivity: { starting: [], ending: [] } } });
    if (path.endsWith('/admin/orders')) return route.fulfill({ json: { items: [], totalCount: 0 } });
    return route.fulfill({ json: { data: [] } });
  });
  return state;
}
async function signIn(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true, level: 2 })).toBeVisible({ timeout: 30_000 });
}

test('browser reload restores a Strict HttpOnly cookie, rotates it and keeps the selected page', async ({ page }) => {
  const state = await backend(page);
  await signIn(page);
  await page.goto('/orders/daily?serviceDate=2026-11-02', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Daily Orders', exact: true })).toBeVisible();
  const prior = state.revision;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Daily Orders', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/daily\?serviceDate=2026-11-02$/);
  expect(state.revision).toBe(prior + 1);
  expect(await page.evaluate(() => document.cookie)).not.toContain('diet_time_refresh');
  const storedKeys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
  expect(storedKeys.filter(key => /token|auth|session/i.test(key))).toEqual([]);
});
test('temporary restoration failures can be retried on the same protected page', async ({ page }) => {
  const state = await backend(page);
  await signIn(page);
  state.unavailable = true;
  await page.goto('/orders/daily?serviceDate=2026-11-02', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Retry connection' })).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/daily\?serviceDate=2026-11-02$/);
  await expect(page.getByRole('heading', { name: 'Daily Orders', exact: true })).toHaveCount(0);
  state.unavailable = false;
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByRole('heading', { name: 'Daily Orders', exact: true })).toBeVisible();
});
test('an expired or revoked refresh session still requires login', async ({ page }) => {
  const state = await backend(page);
  await signIn(page);
  state.refreshToken = '';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
