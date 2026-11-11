import { AdminPanelSettingsOutlined, CalendarMonthOutlined, DashboardOutlined, DinnerDiningOutlined, MenuBookOutlined, PeopleOutline, ReceiptLongOutlined, StorageOutlined } from '@mui/icons-material';
import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  path: string;
  section: 'workspace' | 'catalog' | 'setup';
  icon: ReactNode;
  children?: Array<{ label: string; path: string }>;
}

export const navigationItems: NavItem[] = [
  { key: 'dashboard', path: '/', section: 'workspace', icon: <DashboardOutlined /> },
  { key: 'orders', path: '/orders', section: 'workspace', icon: <ReceiptLongOutlined /> },
  { key: 'customers', path: '/customers', section: 'workspace', icon: <PeopleOutline /> },
  { key: 'deliveryCalendar', path: '/operations/delivery-calendar', section: 'workspace', icon: <CalendarMonthOutlined /> },
  { key: 'meals', path: '/meals', section: 'catalog', icon: <DinnerDiningOutlined /> },
  { key: 'mealPlans', path: '/meal-plans', section: 'catalog', icon: <MenuBookOutlined /> },
  { key: 'masterData', path: '/master-data', section: 'setup', icon: <StorageOutlined />, children: [
    { label: 'categories', path: '/categories' },
    { label: 'ingredients', path: '/ingredients' },
    { label: 'allergens', path: '/allergens' },
    { label: 'mealTypes', path: '/meal-types' },
    { label: 'packageOptions', path: '/admin/package-options' },
    { label: 'durations', path: '/admin/durations' },
    { label: 'planPricing', path: '/admin/plan-pricing' },
    { label: 'pricing', path: '/pricing' },
    { label: 'media', path: '/media' },
    { label: 'holidaysClosures', path: '/operations/closures' },
  ] },
  { key: 'administration', path: '/administration', section: 'setup', icon: <AdminPanelSettingsOutlined />, children: [
    { label: 'settings', path: '/settings' },
    { label: 'users', path: '/users' },
    { label: 'roles', path: '/roles' },
    { label: 'audit', path: '/audit' },
  ] },
];

const matchesPath = (pathname: string, path: string) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

// Legacy order URLs share the same workspace navigation item.
export function navigationForPath(pathname: string) {
  if (pathname === '/meal-plans/pricing') pathname = '/admin/plan-pricing';
  return navigationItems.flatMap(item => item.children
    ? item.children.map(child => ({ ...child, group: item.key }))
    : [{ label: item.key, path: item.path, group: undefined as string | undefined }])
    .filter(item => matchesPath(pathname, item.path))
    .sort((left, right) => right.path.length - left.path.length)[0];
}
