import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { createDietTimeTheme } from '@/theme/theme';
import { accessControlApi } from '@/api/accessControlApi';
import type { ScreenPermission } from '@/api/apiTypes';
import { Sidebar } from './Sidebar';

vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => ({ orders: 'Orders', dailyOrders: 'Daily Orders', customers: 'Customers' }[key] ?? key) }) }));
const orderPermission: ScreenPermission = { screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 45, isActive: true, canRead: true, canWrite: true };

describe('Orders approval menu permissions', () => {
  it.each([true, false])('respects the customer directory read permission (%s)', async canRead => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([orderPermission, { ...orderPermission, screenId: 'customers', screenCode: 'CUSTOMERS', routeUrl: '/customers', canRead }]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Sidebar open collapsed={false} onClose={() => {}} onToggle={() => {}} /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.queryByRole('link', { name: 'meals' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect((await screen.findByRole('link', { name: 'Daily Orders' }))).toHaveAttribute('href', '/orders/daily');
    expect(screen.queryByRole('link', { name: 'Customers' }) !== null).toBe(canRead);
  });
  it('shows the existing Orders route after the permission catalogue is restored', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([orderPermission]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Sidebar open collapsed={false} onClose={() => {}} onToggle={() => {}} /></MemoryRouter>
    </QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Orders' }));
    expect(await screen.findByRole('link', { name: 'Daily Orders' })).toHaveAttribute('href', '/orders/daily');
  });
  it.each(['/customers', '/orders/daily', '/orders'])('opens the group on %s and allows it to be collapsed', async path => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([orderPermission, { ...orderPermission, screenId: 'customers', routeUrl: '/customers' }]);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[path]}><Sidebar open collapsed={false} onClose={() => {}} onToggle={() => {}} /></MemoryRouter></QueryClientProvider>);
    const group = await screen.findByRole('button', { name: 'Orders' });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(group).toHaveClass('Mui-selected');
    expect(await screen.findByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers');
    fireEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Customers' })).not.toBeInTheDocument());
  });
  it('hides the group when neither child is permitted', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([]);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Sidebar open collapsed={false} onClose={() => {}} onToggle={() => {}} /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Orders' })).not.toBeInTheDocument());
  });
});

describe('Compact navigation', () => {
  const masterPermission: ScreenPermission = { ...orderPermission, screenId: 'categories', routeUrl: '/categories' };
  const renderSidebar = (path = '/', collapsed = false) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ThemeProvider theme={createDietTimeTheme('ltr')}>
        <MemoryRouter initialEntries={[path]}><Sidebar open collapsed={collapsed} onClose={() => {}} onToggle={() => {}} /></MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  it('groups permitted master screens and keeps one section open at a time', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([orderPermission, masterPermission, { ...masterPermission, screenId: 'ingredients', routeUrl: '/ingredients', canRead: false }]);
    renderSidebar('/orders/daily');
    const master = await screen.findByRole('button', { name: 'masterData' });
    expect(screen.queryByRole('link', { name: 'categories' })).not.toBeInTheDocument();
    fireEvent.click(master);
    expect(await screen.findByRole('link', { name: 'categories' })).toHaveAttribute('href', '/categories');
    expect(screen.queryByRole('link', { name: 'ingredients' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-expanded', 'false');
    expect(master).toHaveAttribute('aria-expanded', 'true');
  });

  it.each(['/categories/123/edit', '/admin/durations'])('opens Master Data on direct navigation to %s', async path => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([masterPermission, { ...masterPermission, screenId: 'durations', routeUrl: '/admin/durations' }]);
    renderSidebar(path);
    const master = await screen.findByRole('button', { name: 'masterData' });
    expect(master).toHaveAttribute('aria-expanded', 'true');
    expect(master).toHaveClass('Mui-selected');
    expect(await screen.findByRole('link', { name: path.startsWith('/categories') ? 'categories' : 'durations' })).toHaveClass('Mui-selected');
  });

  it('keeps mobile labels and child links visible when desktop collapse is saved', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([masterPermission]);
    renderSidebar('/categories', true);
    expect(await screen.findByRole('link', { name: 'categories' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'masterData' })).toHaveTextContent('masterData');
  });

  it('provides permitted child links in the collapsed desktop flyout', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({ matches: query.includes('min-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
    try {
      vi.mocked(accessControlApi.myScreens).mockResolvedValue([masterPermission]);
      renderSidebar('/', true);
      const master = await screen.findByRole('button', { name: 'masterData' });
      expect(master).not.toHaveTextContent('masterData');
      fireEvent.click(master);
      const menu = await screen.findByRole('menu', { name: 'masterData' });
      expect(within(menu).getByRole('menuitem', { name: 'categories' })).toHaveAttribute('href', '/categories');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'categories' }));
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

it('places Dashboard before the Orders group', async () => {
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([orderPermission, { ...orderPermission, screenId: 'home', routeUrl: '/' }]);
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Sidebar open collapsed={false} onClose={() => {}} onToggle={() => {}} /></MemoryRouter></QueryClientProvider>);
  const home = await screen.findByRole('link', { name: 'dashboard' });
  const orders = await screen.findByRole('button', { name: 'Orders' });
  expect(home.compareDocumentPosition(orders) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
