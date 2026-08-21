import type { ScreenPermission } from '@/api/apiTypes';

const legacyPermissionRoutes = (pathname: string) => {
  if (pathname === '/admin/package-options') return ['/meal-plans'];
  if (pathname === '/admin/durations') return ['/meal-plans/pricing', '/meal-plans'];
  if (pathname === '/admin/plan-pricing') return ['/meal-plans/pricing', '/meal-plans'];
  return [];
};

const routeMatches = (routeUrl: string, pathname: string) => {
  if (routeUrl === '/') return pathname === '/';
  const pattern = routeUrl
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${pattern}(?:/.*)?$`).test(pathname);
};

const bestMatch = (screens: ScreenPermission[], pathname: string) => screens
  .filter((screen) => screen.routeUrl && routeMatches(screen.routeUrl, pathname))
  .sort((left, right) => (right.routeUrl?.length ?? 0) - (left.routeUrl?.length ?? 0))[0];

export const permissionForPath = (screens: ScreenPermission[], pathname: string) => {
  const dedicated = bestMatch(screens, pathname);
  if (dedicated) return dedicated;
  for (const legacyRoute of legacyPermissionRoutes(pathname)) {
    const fallback = bestMatch(screens, legacyRoute);
    if (fallback) return fallback;
  }
  return undefined;
};

export const canReadPath = (screens: ScreenPermission[], pathname: string) =>
  permissionForPath(screens, pathname)?.canRead ?? false;
