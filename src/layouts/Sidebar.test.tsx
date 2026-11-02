import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
