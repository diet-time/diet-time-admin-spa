import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { DateDetailsDrawer } from './DateDetailsDrawer';
import type { DeliveryDateDetail, DeliveryPreparationSummary } from '../types';
import { useAuthStore } from '@/app/store/authStore';
import { CalendarDayCell } from './CalendarDayCell';

vi.mock('@/api/deliveryCalendarApi', () => ({ deliveryCalendarApi: { detail: vi.fn(), preparationSummary: vi.fn(), fulfill: vi.fn(), month: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

function CalendarPreview() {
  const query = useQuery({ queryKey: ['delivery-calendar', '2026-11'], queryFn: () => deliveryCalendarApi.month('2026-11', { planId: '', status: '', hasOverride: '', closure: '' }) });
  return query.data?.map(day => <CalendarDayCell day={day} onSelect={vi.fn()} key={day.date} />);
}

it('refreshes the scheduled list and preparation counts after fulfillment, keeping other days scheduled', async () => {
  useAuthStore.getState().setSession({ id: 'staff', name: 'Staff', email: 'staff@example.test', roles: ['Admin'] });
  const date = '2026-11-01';
  let completed = false;
  vi.mocked(deliveryCalendarApi.month).mockImplementation(async () => [{ date, operationalStatus: completed ? 'PARTIALLY_FULFILLED' : 'SCHEDULED', totalDeliveries: 2, totalCustomers: 1, totalMealItems: 4, overrideCount: 0, totalServiceDays: 2, pendingCount: completed ? 1 : 2, fulfilledCount: completed ? 1 : 0 }]);
  vi.mocked(deliveryCalendarApi.detail).mockImplementation(async (): Promise<DeliveryDateDetail> => ({
    day: { date, operationalStatus: 'SCHEDULED', totalDeliveries: 2, totalCustomers: 1, totalMealItems: 4, overrideCount: 0 },
    totalMealItems: 4, production: [], overrides: [],
    deliveries: [
      { id: 'order-1', serviceDayId: 'day-1', orderNumber: 'ORD-1', customerName: 'Sara', planName: 'Balanced', mealCount: 2, deliverySlot: 'Morning', status: 'CONFIRMED', fulfillmentStatus: completed ? 'DELIVERED' : 'SCHEDULED', fulfilledAt: completed ? '2026-11-01T09:00:00Z' : undefined },
      { id: 'order-2', serviceDayId: 'day-2', orderNumber: 'ORD-2', customerName: 'Ali', planName: 'Balanced', mealCount: 2, deliverySlot: 'Morning', status: 'CONFIRMED', fulfillmentStatus: 'SCHEDULED', fulfillmentMethod: 'TAKEAWAY' },
    ],
  }));
  vi.mocked(deliveryCalendarApi.preparationSummary).mockImplementation(async (): Promise<DeliveryPreparationSummary> => ({
    date, status: 'Preliminary', isPreliminary: true, totalScheduledCount: 2, deliveredCount: completed ? 1 : 0, collectedCount: 0, remainingCount: completed ? 1 : 2,
    orderCount: 2, customerCount: 1, mealItemCount: 0, mealTypes: [], planBreakdown: [],
  }));
  vi.mocked(deliveryCalendarApi.fulfill).mockImplementation(async () => { completed = true; return { serviceDayId: 'day-1', status: 'DELIVERED', fulfilledAt: '2026-11-01T09:00:00Z' }; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CalendarPreview /><DateDetailsDrawer date={date} onClose={vi.fn()} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('tab', { name: 'Preparation Summary' }));
  expect(within(screen.getByRole('region', { name: 'Pending count' })).getByText('2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Scheduled orders' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mark as Delivered' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Delivery' }));
  await waitFor(() => expect(deliveryCalendarApi.detail).toHaveBeenCalledTimes(2));
  expect(within(screen.getByRole('table', { name: 'Scheduled orders' })).getByText('Delivered')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mark as Collected' })).toBeInTheDocument();
  expect(await screen.findByText('Partially Fulfilled')).toBeInTheDocument();
  expect(screen.getByText('ORD-1 marked as delivered.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delivered' }));
  expect(within(screen.getByRole('table', { name: 'Scheduled orders' })).queryByText('ORD-2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Preparation Summary' }));
  expect(within(screen.getByRole('region', { name: 'Pending count' })).getByText('1')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Fulfilled count' })).getByText('1')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Total Scheduled count' })).getByText('2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Scheduled orders' }));
  expect(screen.getByRole('button', { name: 'Delivered' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('table', { name: 'Scheduled orders' })).queryByText('ORD-2')).not.toBeInTheDocument();
});

it('refreshes expired deadlines while open, preserves the filter and stops polling on unmount', async () => {
  const date = '2026-11-02';
  let expired = false;
  vi.mocked(deliveryCalendarApi.detail).mockImplementation(async () => ({
    day: { date, operationalStatus: expired ? 'OVERDUE' : 'SCHEDULED', totalDeliveries: 1, totalCustomers: 1, totalMealItems: 1, overrideCount: 0, totalServiceDays: 1, pendingCount: expired ? 0 : 1, overdueCount: expired ? 1 : 0, fulfilledCount: 0 },
    deliveries: [{ id: 'order', serviceDayId: 'day', orderNumber: 'ORD', customerName: 'Sara', planName: 'Plan', mealCount: 1, deliverySlot: 'Morning', status: 'CONFIRMED', fulfillmentStatus: 'SCHEDULED', isOverdue: expired }],
    totalMealItems: 1, production: [], overrides: [],
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><DateDetailsDrawer date={date} onClose={vi.fn()} /></QueryClientProvider>);
  await screen.findByRole('table', { name: 'Scheduled orders' });
  fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
  expect(within(screen.getByRole('region', { name: 'Pending count' })).getByText('1')).toBeInTheDocument();
  vi.useFakeTimers();
  try {
    // Query interval is recreated after a data update so this test owns its timer origin.
    await act(async () => { client.setQueryData(['delivery-calendar-detail', date], await deliveryCalendarApi.detail(date)); });
    expired = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_100); });
    expect(within(screen.getByRole('region', { name: 'Overdue count' })).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pending' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No service days match this filter.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Overdue' }));
    const table = screen.getByRole('table', { name: 'Scheduled orders' });
    expect(within(table).getByText('Overdue').parentElement).toHaveClass('MuiChip-colorError');
    expect(within(table).getByText('Sara').closest('tr')).toHaveStyle({ backgroundColor: '#FFF3F3' });
    view.unmount();
    const count = vi.mocked(deliveryCalendarApi.detail).mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(deliveryCalendarApi.detail).toHaveBeenCalledTimes(count);
  } finally { vi.useRealTimers(); client.clear(); }
});
