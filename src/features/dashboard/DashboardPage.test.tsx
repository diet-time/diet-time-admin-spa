import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  vi.clearAllMocks();
  vi.mocked(dashboardApi.operations).mockResolvedValue(dashboard);
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([permission]);
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
