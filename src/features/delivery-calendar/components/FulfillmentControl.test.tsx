import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { FulfillmentControl } from './FulfillmentControl';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('@/api/deliveryCalendarApi', () => ({ deliveryCalendarApi: { fulfill: vi.fn() } }));
const date = '2026-11-01';
function show(method = 'HOME_DELIVERY', status = 'SCHEDULED') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(<QueryClientProvider client={client}><FulfillmentControl serviceDayId="day-1" date={date} fulfillmentMethod={method} fulfillmentStatus={status} fulfilledAt={status === 'SCHEDULED' ? undefined : '2026-11-01T09:00:00Z'} /></QueryClientProvider>);
  return invalidate;
}
describe('service-day fulfillment', () => {
  beforeEach(() => { vi.clearAllMocks(); useAuthStore.getState().setSession({ id: 'staff', name: 'Staff', email: 'staff@example.test', roles: ['Admin'] }); });
  it.each([['HOME_DELIVERY', 'Delivered', 'DELIVERED'], ['TAKEAWAY', 'Collected', 'COLLECTED']])('confirms %s and prevents duplicate clicks', async (method, label, status) => {
    let finish!: (result: { serviceDayId: string; status: string; fulfilledAt: string }) => void;
    vi.mocked(deliveryCalendarApi.fulfill).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const invalidate = show(method);
    fireEvent.click(screen.getByRole('button', { name: `Mark as ${label}` }));
    expect(deliveryCalendarApi.fulfill).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deliveryCalendarApi.fulfill).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: `Mark as ${label}` }));
    const confirm = screen.getByRole('button', { name: status === 'COLLECTED' ? 'Confirm Collection' : 'Confirm Delivery' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(deliveryCalendarApi.fulfill).toHaveBeenCalledExactlyOnceWith('day-1', status);
    expect(confirm).toBeDisabled();
    finish({ serviceDayId: 'day-1', status, fulfilledAt: '2026-11-01T09:00:00Z' });
    await waitFor(() => expect(screen.getByText(label)).toHaveClass('MuiChip-label'));
    expect(screen.queryByRole('button', { name: `Mark as ${label}` })).not.toBeInTheDocument();
    expect(screen.getByText(/Qatar/)).toBeInTheDocument();
    expect(screen.getByText(/Qatar/)).toHaveTextContent('12:00:00');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['delivery-calendar-detail', date] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['delivery-preparation-summary', date] });
  });
  it.each(['DELIVERED', 'COLLECTED'])('shows a green badge for %s', status => {
    show(status === 'COLLECTED' ? 'TAKEAWAY' : 'HOME_DELIVERY', status);
    expect(screen.getByText(status === 'DELIVERED' ? 'Delivered' : 'Collected').parentElement).toHaveClass('MuiChip-colorSuccess');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('allows retry after an error', async () => {
    vi.mocked(deliveryCalendarApi.fulfill).mockRejectedValue(new Error('network'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Delivered' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delivery' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to update'));
    expect(screen.getByRole('button', { name: 'Confirm Delivery' })).toBeEnabled();
  });
  it.each(['Admin'])('allows %s to confirm with customer, order, date and mode details', role => {
    useAuthStore.getState().setSession({ id: 'staff', name: 'Staff', email: 'staff@example.test', roles: [role] });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><FulfillmentControl serviceDayId="day" date={date} fulfillmentStatus="SCHEDULED" customerName="Sara" orderNumber="ORD-123" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Delivered' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sara');
    expect(screen.getByRole('dialog')).toHaveTextContent('ORD-123');
    expect(screen.getByRole('dialog')).toHaveTextContent(date);
    expect(screen.getByRole('dialog')).toHaveTextContent('Home Delivery');
  });
  it.each(['Customer', 'Viewer', 'Operations', 'Meal Manager'])('hides confirmation from %s', role => {
    useAuthStore.getState().setSession({ id: 'user', name: 'User', email: 'user@example.test', roles: [role] });
    show();
    expect(screen.getByText('Scheduled').parentElement).toHaveClass('MuiChip-colorDefault');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
