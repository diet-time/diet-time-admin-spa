import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import type { ScreenPermission } from '@/api/apiTypes';
import { Sidebar } from './Sidebar';

vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const orderPermission: ScreenPermission = { screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 45, isActive: true, canRead: true, canWrite: true };

describe('Orders approval menu permissions', () => {
  it('shows the existing Orders route after the permission catalogue is restored', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([orderPermission]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Sidebar open collapsed={false} onClose={() => {}} onToggle={() => {}} /></MemoryRouter>
    </QueryClientProvider>);
    expect(await screen.findByRole('link', { name: 'Daily Orders' })).toHaveAttribute('href', '/orders/daily');
  });
});
