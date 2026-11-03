import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`meal filtering and bilingual export work at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); const path = url.pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { data: { accessToken: 'test-access', accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshToken: 'test-refresh', refreshTokenExpiresAt: '2099-01-02T00:00:00Z', user: { id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] } } } });
      if (path.endsWith('/access-control/me/screens')) return route.fulfill({ json: { data: ['/', '/meals', '/customers'].map((routeUrl, i) => ({ screenId: `screen-${i}`, groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: `SCREEN_${i}`, screenName: 'Screen', routeUrl, displayOrder: i, isActive: true, canRead: true, canWrite: false })) } });
      if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { data: { unreadCount: 0 } } });
      if (path.endsWith('/master-data/export')) return route.fulfill({ contentType: 'text/csv; charset=utf-8', body: Buffer.from('\uFEFF"English","Arabic"\r\n"Chicken","دجاج"\r\n') });
      if (path.endsWith('/admin/meals')) {
        const meals = [{ id: 'meal-1', sku: 'ACTIVE-MEAL', name: 'Active meal', status: 'ACTIVE' }, { id: 'meal-2', sku: 'INACTIVE-MEAL', name: 'Inactive meal', status: 'INACTIVE' }];
        const items = meals.filter(meal => !url.searchParams.get('status') || meal.status === url.searchParams.get('status')?.toUpperCase());
        return route.fulfill({ json: { data: items.map(meal => ({ ...meal, nameAr: 'وجبة', versionNumber: 1, updatedAt: '2026-11-03T07:00:00Z', isAvailable: true })), meta: { page: 1, pageSize: 25, totalCount: items.length, totalPages: 1 } } });
      }
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto('/meals');
    await expect(page.getByText('Active meal', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Inactive', exact: true }).click();
    await expect(page.getByText('Active meal', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Inactive meal', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/status=Inactive/);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export all master data' }).click();
    const download = await downloadEvent;
    await download.saveAs(testInfo.outputPath('translations.csv'));
    const text = await readFile(testInfo.outputPath('translations.csv'), 'utf8');
    expect(text).toContain('دجاج'); expect(text.charCodeAt(0)).toBe(0xFEFF);
    expect(download.suggestedFilename()).toBe('diet-time-master-data-translations.csv');
  });
}
