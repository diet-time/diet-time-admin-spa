import type { ScreenPermission } from '@/api/apiTypes';
import { permissionForPath } from './screenPermissionRoutes';

let loaded = false;
let screens: ScreenPermission[] = [];

export const setCachedScreenPermissions = (value: ScreenPermission[]) => { screens = value; loaded = true; };
export const clearCachedScreenPermissions = () => { screens = []; loaded = false; };
export const canWriteFromPath = (pathname: string) => {
  if (!loaded) return true;
  return permissionForPath(screens, pathname)?.canWrite ?? false;
};
