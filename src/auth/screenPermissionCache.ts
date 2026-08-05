import type { ScreenPermission } from '@/api/apiTypes';

let loaded = false;
let screens: ScreenPermission[] = [];

export const setCachedScreenPermissions = (value: ScreenPermission[]) => { screens = value; loaded = true; };
export const clearCachedScreenPermissions = () => { screens = []; loaded = false; };
export const canWriteFromPath = (pathname: string) => {
  if (!loaded) return true;
  return screens
    .filter(screen => screen.routeUrl && (pathname === screen.routeUrl || (screen.routeUrl !== '/' && pathname.startsWith(`${screen.routeUrl}/`))))
    .sort((a, b) => (b.routeUrl?.length ?? 0) - (a.routeUrl?.length ?? 0))[0]?.canWrite ?? false;
};
