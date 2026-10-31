import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { staffOrdersApi, type StaffOrder } from '@/api/staffOrdersApi';
import type { ScreenPermission } from '@/api/apiTypes';
import { PendingOrdersPanel } from './PendingOrdersPanel';
import { OrdersPage } from './OrdersPage';

vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));
vi.mock('@/api/staffOrdersApi', async (original) => ({ ...await original<typeof import('@/api/staffOrdersApi')>(), staffOrdersApi: { list: vi.fn(), get: vi.fn(), action: vi.fn() } }));
const permission: ScreenPermission = { screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 45, isActive: true, canRead: true, canWrite: true };
const row: StaffOrder = {
  customerName: 'Test customer', history: [], order: {
    id: 'pending-1', orderNumber: 'ORD-100', status: 'PENDING_APPROVAL', paymentStatus: 'UNPAID',
    placedAt: '2026-10-31T10:00:00Z', plan: { name: 'Balanced Plan', durationName: '12 Days' },
    mealCount: 2, snackCount: 1, fulfillmentMethod: 'TAKEAWAY', takeawayBranch: { name: 'Test Branch' },
    delivery: { startDate: '2026-11-01', endDate: '2026-11-14', days: [1,2,3,4,6,7], serviceDates: [] },
    pricing: { totalAmount: 750, currencyCode: 'QAR' },
    review: { rowVersion: 3, requiresPrepayment: false, awaitingPayment: false, canFulfill: false },
  },
};
function renderPanel() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/?date=2030-01-01']}><Routes>
    <Route path="/" element={<PendingOrdersPanel serviceDate="2026-11-01" />} />
    <Route path="/orders" element={<OrdersPage />} /><Route path="/orders/daily" element={<OrdersPage daily />} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return cache;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission]);
  vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: [row], totalCount: 1 });
  vi.mocked(staffOrdersApi.get).mockResolvedValue(row);
});
afterEach(() => vi.useRealTimers());

describe('Visible pending confirmation queue', () => {
  it('opens the separate daily orders screen for the selected meal service date', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Daily orders' }));
    expect(await screen.findByRole('heading', { name: 'Daily Orders' })).toBeInTheDocument();
    expect(screen.getByLabelText('Meal service date')).toHaveValue('2026-11-01');
    expect(staffOrdersApi.list).toHaveBeenCalledWith('', 1, '2026-11-01');
  });

  it('shows only a count and opens the pending list for approval inside', async () => {
    renderPanel();
    const count = await screen.findByText('1 awaiting approval');
    const panel = screen.getByRole('region', { name: 'Pending confirmation orders' });
    expect(count).toBeInTheDocument();
    expect(within(panel).queryByText(/ORD-100|Test customer|Balanced Plan|Test Branch|UNPAID/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Review order/ })).not.toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'View all pending orders' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(staffOrdersApi.action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(staffOrdersApi.action).not.toHaveBeenCalled();
  });
  it('shows the total pending count without rendering any order previews', async () => {
    vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: Array.from({length: 10}, (_, i) => ({ ...row, order: { ...row.order, id: `order-${i}`, orderNumber: `ORD-${i}` } })), totalCount: 25 });
    renderPanel();
    expect(await screen.findByText('25 awaiting approval')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText(/Test customer|Balanced Plan/)).not.toBeInTheDocument();
  });
  it('does not display the orange banner when there are no pending orders', async () => {
    vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: [], totalCount: 0 });
    const cache = renderPanel();
    await waitFor(() => expect(cache.getQueryState(['staffOrders', 'PENDING_APPROVAL', 1])?.status).toBe('success'));
    expect(screen.queryByRole('region', { name: 'Pending confirmation orders' })).not.toBeInTheDocument();
    expect(screen.queryByText('0 awaiting approval')).not.toBeInTheDocument();
  });
  it('does not flash the orange banner while the pending count is loading', async () => {
    vi.mocked(staffOrdersApi.list).mockReturnValue(new Promise(() => {}));
    renderPanel();
    await waitFor(() => expect(staffOrdersApi.list).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Pending confirmation orders' })).not.toBeInTheDocument();
  });
  it('refreshes automatically and removes orders that have left the pending queue', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderPanel();
    await screen.findByText('1 awaiting approval');
    vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: [], totalCount: 0 });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Pending confirmation orders' })).not.toBeInTheDocument());
    expect(screen.queryByText('No orders are awaiting confirmation.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review order ORD-100' })).not.toBeInTheDocument();
  });
  it('uses the existing workflow query invalidation to update the queue immediately', async () => {
    const cache = renderPanel();
    await screen.findByText('1 awaiting approval');
    vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: [], totalCount: 0 });
    await act(async () => { await cache.invalidateQueries({ queryKey: ['staffOrders'] }); });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Pending confirmation orders' })).not.toBeInTheDocument());
  });
  it('shows a retryable load error instead of claiming there are no pending orders', async () => {
    vi.mocked(staffOrdersApi.list).mockRejectedValue(new Error('Unavailable'));
    renderPanel();
    expect(await screen.findByText(/Unable to load pending confirmations/)).toBeInTheDocument();
    expect(screen.queryByText('No orders are awaiting confirmation.')).not.toBeInTheDocument();
    vi.mocked(staffOrdersApi.list).mockResolvedValue({ items: [row], totalCount: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Retry pending orders' }));
    expect(await screen.findByText('1 awaiting approval')).toBeInTheDocument();
  });
  it('does not display the banner or fetch orders without Orders permission', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([]);
    const cache = renderPanel();
    await waitFor(() => expect(cache.getQueryState(['access-control', 'me', 'screens'])?.status).toBe('success'));
    expect(screen.queryByRole('region', { name: 'Pending confirmation orders' })).not.toBeInTheDocument();
    expect(staffOrdersApi.list).not.toHaveBeenCalled();
  });
});
