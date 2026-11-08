import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { createDietTimeTheme } from '@/theme/theme';
import { accessControlApi } from '@/api/accessControlApi';
import type { ScreenPermission } from '@/api/apiTypes';
import { Sidebar } from './Sidebar';
import '@/i18n';

vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));
const permission = (routeUrl: string, canRead = true): ScreenPermission => ({ screenId: routeUrl,
  groupCode: 'ADMIN', groupName: 'Admin', screenCode: routeUrl, screenName: routeUrl,
  routeUrl, displayOrder: 1, isActive: true, canRead, canWrite: true });
const renderSidebar = (path = '/', collapsed = false) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ThemeProvider theme={createDietTimeTheme('ltr')}>
      <MemoryRouter initialEntries={[path]}><Sidebar open collapsed={collapsed} onClose={() => {}} onToggle={() => {}} /></MemoryRouter>
    </ThemeProvider>
  </QueryClientProvider>,
);

describe('Task-based navigation', () => {
  it.each([true, false])('keeps Orders and approvals directly accessible and filters Customers (%s)', async canRead => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission('/orders'), permission('/customers', canRead)]);
    renderSidebar('/orders/daily');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Meals' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders/daily');
    expect(screen.getByRole('link', { name: 'Order Approvals' })).toHaveAttribute('href', '/orders');
    expect(screen.queryByRole('link', { name: 'Customers' }) !== null).toBe(canRead);
    expect(screen.queryByRole('button', { name: 'Orders' })).not.toBeInTheDocument();
  });

  it.each(['/orders/daily', '/orders'])('selects only the correct order screen on %s', async path => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission('/orders')]);
    renderSidebar(path);
    const current = await screen.findByRole('link', { name: path === '/orders' ? 'Order Approvals' : 'Orders' });
    const other = screen.getByRole('link', { name: path === '/orders' ? 'Orders' : 'Order Approvals' });
    expect(current).toHaveClass('Mui-selected');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(other).not.toHaveClass('Mui-selected');
    expect(other).not.toHaveAttribute('aria-current');
  });

  it('respects an explicit permission denial for the Orders subroute', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission('/orders'), permission('/orders/daily', false)]);
    renderSidebar();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Order Approvals' })).toBeInTheDocument();
  });

  it('puts routine tasks first and keeps Delivery Calendar out of a group', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue(['/', '/orders', '/customers', '/operations/delivery-calendar', '/meals', '/meal-plans'].map(path => permission(path)));
    renderSidebar();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Administration' })).not.toBeInTheDocument());
    expect(within(screen.getByRole('navigation')).getAllByRole('link').map(link => link.textContent)).toEqual([
      'Dashboard', 'Orders', 'Order Approvals', 'Customers', 'Delivery Calendar', 'Meals', 'Meal Plan Templates',
    ]);
  });

  it('hides inaccessible sections entirely', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([]);
    renderSidebar();
    await waitFor(() => expect(within(screen.getByRole('navigation')).queryByRole('link')).not.toBeInTheDocument());
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Master Data' })).not.toBeInTheDocument();
  });
});

describe('Setup navigation', () => {
  it('opens only one setup group and filters individual master data links', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission('/categories'), permission('/ingredients', false), permission('/users')]);
    renderSidebar('/users');
    const master = await screen.findByRole('button', { name: 'Master Data' });
    fireEvent.click(master);
    expect(await screen.findByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.queryByRole('link', { name: 'Ingredients' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Administration' })).toHaveAttribute('aria-expanded', 'false');
    expect(master).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([
    ['/categories/123/edit', '/categories', 'Master Data', 'Categories'],
    ['/admin/durations', '/admin/durations', 'Master Data', 'Durations'],
    ['/operations/closures', '/operations/closures', 'Master Data', 'Holidays & Closures'],
    ['/audit', '/audit', 'Administration', 'Audit History'],
  ])('opens the correct setup section for %s', async (path, permittedPath, group, label) => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission(permittedPath)]);
    renderSidebar(path);
    expect(await screen.findByRole('button', { name: group })).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  });

  it('shows mobile labels even when desktop collapse is saved', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission('/orders'), permission('/categories')]);
    renderSidebar('/categories', true);
    expect(await screen.findByRole('link', { name: 'Categories' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveTextContent('Orders');
  });

  it('keeps direct links and setup flyouts usable on collapsed desktop', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({ matches: query.includes('min-width'), media: query,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
    try {
      vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission('/orders'), permission('/categories')]);
      renderSidebar('/', true);
      expect(await screen.findByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders/daily');
      fireEvent.click(await screen.findByRole('button', { name: 'Master Data' }));
      const menu = await screen.findByRole('menu', { name: 'Master Data' });
      expect(within(menu).getByRole('menuitem', { name: 'Categories' })).toHaveAttribute('href', '/categories');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Categories' }));
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    } finally { vi.unstubAllGlobals(); }
  });
});
