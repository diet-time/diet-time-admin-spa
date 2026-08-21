import { describe, expect, it } from 'vitest';
import type { ScreenPermission } from '@/api/apiTypes';
import { canReadPath, permissionForPath } from './screenPermissionRoutes';

const permission = (routeUrl: string, canRead = true, canWrite = true): ScreenPermission => ({
  screenId: routeUrl,
  groupCode: 'MEAL_PLANS',
  groupName: 'Meal Plans',
  screenCode: routeUrl,
  screenName: routeUrl,
  routeUrl,
  displayOrder: 1,
  isActive: true,
  canRead,
  canWrite,
});

describe('meal subscription screen permissions', () => {
  it('uses the existing meal plans permission for new screens', () => {
    const screens = [permission('/meal-plans')];
    expect(canReadPath(screens, '/admin/package-options')).toBe(true);
    expect(canReadPath(screens, '/admin/plan-pricing')).toBe(true);
    expect(canReadPath(screens, '/admin/weekly-menu')).toBe(true);
    expect(canReadPath(screens, '/admin/meal-plans/plan-1/weekly-menu')).toBe(true);
  });

  it('prefers a dedicated permission when one exists', () => {
    const screens = [permission('/meal-plans'), permission('/admin/package-options', false, false)];
    expect(permissionForPath(screens, '/admin/package-options')?.routeUrl).toBe('/admin/package-options');
    expect(canReadPath(screens, '/admin/package-options')).toBe(false);
  });

  it('matches parameterized weekly menu routes', () => {
    const screens = [permission('/admin/meal-plans/:mealPlanId/weekly-menu')];
    expect(canReadPath(screens, '/admin/meal-plans/abc-123/weekly-menu')).toBe(true);
  });
});
