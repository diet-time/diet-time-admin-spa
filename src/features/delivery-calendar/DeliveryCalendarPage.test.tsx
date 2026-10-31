import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { staffOrdersApi } from '@/api/staffOrdersApi';
import type { ScreenPermission } from '@/api/apiTypes';
import { DeliveryCalendarPage } from './DeliveryCalendarPage';

vi.mock('./components/DateDetailsDrawer', () => ({ DateDetailsDrawer: () => null }));
vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));
vi.mock('@/api/deliveryCalendarApi', () => ({ deliveryCalendarApi: { month: vi.fn(), plans: vi.fn() } }));
vi.mock('@/api/staffOrdersApi', () => ({ staffOrdersApi: { list: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const permission: ScreenPermission = { screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 45, isActive: true, canRead: true, canWrite: true };
const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <MemoryRouter initialEntries={['/operations/delivery-calendar?date=2030-01-01']}><DeliveryCalendarPage /></MemoryRouter>
</QueryClientProvider>);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission]);
  vi.mocked(deliveryCalendarApi.month).mockResolvedValue([]);
  vi.mocked(deliveryCalendarApi.plans).mockResolvedValue([]);
  vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: [], totalCount: 0 });
});
describe('Pending confirmations above the delivery calendar', () => {
  it('keeps the pending queue independent of the selected calendar month', async () => {
    renderPage();
    expect(await screen.findByText('0 awaiting approval')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Next month' }));
    await waitFor(() => expect(deliveryCalendarApi.month).toHaveBeenCalledWith('2030-02', expect.anything(), expect.anything()));
    expect(screen.getByRole('region', { name: 'Pending confirmation orders' })).toBeInTheDocument();
    expect(staffOrdersApi.list).toHaveBeenCalledTimes(1);
    expect(staffOrdersApi.list).toHaveBeenCalledWith('PENDING_APPROVAL', 1);
  });
  it('still displays the pending queue when delivery-calendar data fails to load', async () => {
    vi.mocked(deliveryCalendarApi.month).mockRejectedValue(new Error('Unavailable'));
    renderPage();
    expect(await screen.findByText('Unable to load order data for the delivery calendar.')).toBeInTheDocument();
    expect(await screen.findByText('0 awaiting approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all pending orders' })).toBeInTheDocument();
  });
});
