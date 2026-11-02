import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { dashboardApi } from '@/api/dashboardApi';
import { accessControlApi } from '@/api/accessControlApi';
import type { OperationsDashboard, ScreenPermission } from '@/api/apiTypes';
import { DashboardPage } from './DashboardPage';

vi.mock('@/features/orders/PendingOrdersPanel', () => ({ PendingOrdersPanel: () => <section aria-label="Pending confirmation orders">Pending confirmation orders</section> }));

vi.mock('@/api/dashboardApi', () => ({ dashboardApi: { operations: vi.fn() } }));
vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));

const dashboard: OperationsDashboard = {
  date: '2026-10-31', today: { scheduledDeliveries: 0, customers: 0, mealsToPrepare: 0, completedDeliveries: null },
  nextDeliveryDay: null, nextSevenDays: [], todayDeliveries: [],
  needsAttention: { ordersRequiringReview: 3, missingDeliveryAddresses: 0, plansEndingSoon: 0, customersWithoutUpcomingDelivery: 0, deliveryConflicts: 0 },
  upcomingPlanActivity: { starting: [], ending: [] },
};
const permission: ScreenPermission = { screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 45, isActive: true, canRead: true, canWrite: true };
const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <MemoryRouter><Routes><Route path="/" element={<DashboardPage />} /><Route path="/orders" element={<p>Existing order approval screen</p>} /></Routes></MemoryRouter>
</QueryClientProvider>);

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 600, 190));
  vi.clearAllMocks();
  vi.mocked(dashboardApi.operations).mockResolvedValue(dashboard);
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission]);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const populated: OperationsDashboard = {
  ...dashboard, date: '2026-11-02',
  insights: {
    activeSubscriptions: 4, pendingConfirmations: 3, expiringSubscriptions: 2,
    fulfillment: { total: 4, pending: 1, overdue: 1, delivered: 1, collected: 1, fulfilled: 2, fulfillmentRate: 50, homeDelivery: 3, takeaway: 1, mealItems: 12 },
    workload: Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-${String(i + 2).padStart(2, '0')}`, dayName: 'Day', scheduledDeliveries: i === 4 ? 0 : 4, meals: i === 4 ? 0 : 12, customers: i === 4 ? 0 : 4, hasDeliveries: i !== 4 })),
    popularPackages: [{ name: '2 meals + 1 snack / day', subscriptions: 2 }, { name: '3 meals / day', subscriptions: 2 }],
    deliverySlots: [{ name: 'Morning', startTime: '07:00:00', endTime: '11:00:00', scheduled: 3, fulfilled: 1, overdue: 1 }],
    scheduledOrders: [
      { id: 'order-1', serviceDayId: 'day-1', orderNumber: 'ORD-1', customerName: 'Aisha Ali', planName: 'Balance', mealCount: 3, fulfillmentMethod: 'HOME_DELIVERY', fulfillmentStatus: 'DELIVERED', isOverdue: false, status: 'ACTIVE', deliverySlot: 'Morning' },
      { id: 'order-2', serviceDayId: 'day-2', orderNumber: 'ORD-2', customerName: 'Omar Hassan', planName: 'Balance', mealCount: 3, fulfillmentMethod: 'TAKEAWAY', fulfillmentStatus: 'COLLECTED', isOverdue: false, status: 'CONFIRMED', deliverySlot: '' },
      { id: 'order-3', serviceDayId: 'day-3', orderNumber: 'ORD-3', customerName: 'Sara Ali', planName: 'Balance', mealCount: 3, fulfillmentMethod: 'HOME_DELIVERY', fulfillmentStatus: 'SCHEDULED', isOverdue: false, status: 'CONFIRMED', deliverySlot: 'Morning' },
      { id: 'order-4', serviceDayId: 'day-4', orderNumber: 'ORD-4', customerName: 'Khalid Ali', planName: 'Balance', mealCount: 3, fulfillmentMethod: 'HOME_DELIVERY', fulfillmentStatus: 'SCHEDULED', isOverdue: true, status: 'CONFIRMED', deliverySlot: 'Morning' },
    ],
  },
};

describe('Business dashboard insights', () => {
  it('shows operational cards, charts and renewal opportunities without revenue', async () => {
    vi.mocked(dashboardApi.operations).mockResolvedValue(populated);
    renderPage();
    const rate = await screen.findByRole('region', { name: 'Fulfillment rate' });
    expect(within(rate).getByText('50%')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Active subscriptions' })).getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Orders by day' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Scheduled orders over the next seven days' })).toBeInTheDocument();
    expect(screen.queryByText('Meal items (left scale)')).not.toBeInTheDocument();
    expect(screen.queryByText('Orders (right scale)')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fulfillment status' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Meal demand & orders' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Popular packages' })).toBeInTheDocument();
    expect(screen.getByText('2 plans ending in the next 7 days')).toBeInTheDocument();
    expect(screen.queryByText(/revenue|QAR|last week/i)).not.toBeInTheDocument();
  });
  it('uses service-day fulfillment badges and actual configured slot progress', async () => {
    vi.mocked(dashboardApi.operations).mockResolvedValue(populated);
    renderPage();
    const table = await screen.findByRole('table', { name: 'Scheduled dashboard orders' });
    expect(within(table).getByText('Delivered').parentElement).toHaveClass('MuiChip-colorSuccess');
    expect(within(table).getByText('Collected').parentElement).toHaveClass('MuiChip-colorSuccess');
    expect(within(table).getByText('Overdue').parentElement).toHaveClass('MuiChip-colorError');
    expect(within(table).getByText('Scheduled').parentElement).toHaveClass('MuiChip-colorDefault');
    expect(screen.getByText('1 / 3 fulfilled')).toBeInTheDocument();
    expect(screen.getByText('07:00 – 11:00 · Qatar')).toBeInTheDocument();
    expect(screen.queryByText(/50 orders|84%/)).not.toBeInTheDocument();
  });
  it('does not infer fulfillment or active-subscription numbers from approval statuses on older API data', async () => {
    renderPage();
    const rate = await screen.findByRole('region', { name: 'Fulfillment rate' });
    expect(within(rate).getByText('—')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Active subscriptions' })).getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Fulfillment data is not available')).toBeInTheDocument();
  });
  it('requests a new business date without navigation or a page reload', async () => {
    renderPage(); await screen.findByText('Orders requiring review');
    fireEvent.change(screen.getByLabelText('Service date'), { target: { value: '2026-11-05' } });
    await waitFor(() => expect(dashboardApi.operations).toHaveBeenCalledWith('2026-11-05', expect.anything()));
  });
  it('keeps the last dashboard visible when a background refresh fails', async () => {
    vi.mocked(dashboardApi.operations).mockResolvedValueOnce(populated).mockRejectedValue(new Error('network'));
    renderPage(); await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
    expect(await screen.findByText('Unable to refresh. Showing the last loaded overview.')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

describe('Pending orders on the operations dashboard', () => {
  it('opens the existing approval queue even when no deliveries are scheduled', async () => {
    renderPage();
    expect(await screen.findByText('No deliveries scheduled')).toBeInTheDocument();
    expect(screen.getByText('Orders requiring review')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Review pending orders' }));
    expect(await screen.findByText('Existing order approval screen')).toBeInTheDocument();
  });
  it('does not offer the approval link without Orders read permission', async () => {
    vi.mocked(accessControlApi.myScreens).mockResolvedValue([{ ...permission, canRead: false }]);
    renderPage();
    await screen.findByText('Orders requiring review');
    expect(screen.queryByRole('button', { name: 'Review pending orders' })).not.toBeInTheDocument();
  });
});
