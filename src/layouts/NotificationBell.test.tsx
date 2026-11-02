import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/app/store/authStore';
import { notificationsApi, type StaffNotification } from '@/api/notificationsApi';
import { NotificationBell } from './NotificationBell';

vi.mock('@/api/notificationsApi', () => ({ notificationsApi: { list: vi.fn(), unreadCount: vi.fn(), read: vi.fn(), readAll: vi.fn() } }));
const item: StaffNotification = { id: 'notification', eventType: 'ORDER_RECEIVED', title: 'New order — Pending Confirmation', message: 'An order awaits confirmation.', orderId: 'order', orderNumber: 'ORD-1', createdAt: '2026-11-01T09:00:00Z', targetUrl: '/orders?orderId=order' };
function Location() { const location = useLocation(); return <div data-testid="location">{location.pathname + location.search}</div>; }
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter><NotificationBell /><Location /></MemoryRouter></QueryClientProvider>) };
}
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({ id: 'staff', name: 'Admin', email: 'admin@test', roles: ['Admin'] });
  vi.mocked(notificationsApi.unreadCount).mockResolvedValue(1);
  vi.mocked(notificationsApi.list).mockResolvedValue({ items: [item], page: 1, pageSize: 20, totalCount: 1 });
  vi.mocked(notificationsApi.read).mockResolvedValue(undefined);
  vi.mocked(notificationsApi.readAll).mockResolvedValue(undefined);
});
it('caps the red badge at 99+ and loads the compact inbox on demand', async () => {
  vi.mocked(notificationsApi.unreadCount).mockResolvedValue(120);
  show(); expect(notificationsApi.list).not.toHaveBeenCalled();
  expect(await screen.findByText('99+')).toHaveClass('MuiBadge-colorError');
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(await screen.findByRole('article')).toHaveTextContent('ORD-1');
  expect(screen.getByText(/Qatar/)).toHaveTextContent('12:00:00');
  expect(screen.getByLabelText('Unread')).toBeInTheDocument();
});
it('shows the ordering customer with a clear event status, rather than the signed-in profile', async () => {
  vi.mocked(notificationsApi.list).mockResolvedValue({ items: [{ ...item, eventType: 'ORDER_APPROVED', title: 'Order confirmed', customerName: 'Sara Ali', message: 'Order ORD-1 for Sara Ali has been confirmed.' }], page: 1, pageSize: 20, totalCount: 1 });
  show(); fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  const row = await screen.findByRole('article', { name: 'Order confirmed' });
  expect(within(row).getByText('Sara Ali')).toBeInTheDocument();
  expect(within(row).getByText('Confirmed')).toBeInTheDocument();
  expect(row).not.toHaveTextContent('Admin');
});
it('refreshes only notification queries from the panel refresh button', async () => {
  const view = show(); const invalidate = vi.spyOn(view.client, 'invalidateQueries');
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  await screen.findByRole('article');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh notifications' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Refresh notifications' }));
  expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ['admin-notifications', 'staff', 'admin'] });
  view.client.clear();
});
it('marks a single item read and refreshes its badge and highlight', async () => {
  let read = false;
  vi.mocked(notificationsApi.read).mockImplementation(async () => { read = true; });
  vi.mocked(notificationsApi.unreadCount).mockImplementation(async () => read ? 0 : 1);
  vi.mocked(notificationsApi.list).mockImplementation(async () => ({ items: [{ ...item, readAt: read ? '2026-11-01T10:00Z' : undefined }], page: 1, pageSize: 20, totalCount: 1 }));
  show(); const bell = screen.getByRole('button', { name: 'Notifications' }); fireEvent.click(bell);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as Read' }));
  await waitFor(() => expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument());
  expect(notificationsApi.read).toHaveBeenCalledWith(item.id);
  expect(bell.querySelector('.MuiBadge-badge')).toHaveClass('MuiBadge-invisible');
});
it('marks all read and keeps errors retryable', async () => {
  vi.mocked(notificationsApi.readAll).mockRejectedValueOnce(new Error('network'));
  show(); fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mark All as Read' })).toBeEnabled());
  fireEvent.click(await screen.findByRole('button', { name: 'Mark All as Read' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to mark');
  fireEvent.click(screen.getByRole('button', { name: 'Mark All as Read' }));
  await waitFor(() => expect(notificationsApi.readAll).toHaveBeenCalledTimes(2));
});
it.each(['/orders?orderId=order', '/operations/delivery-calendar?date=2026-11-01&serviceDayId=day'])('opens existing screen %s after recording read state', async targetUrl => {
  vi.mocked(notificationsApi.list).mockResolvedValue({ items: [{ ...item, targetUrl }], page: 1, pageSize: 20, totalCount: 1 });
  show(); fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  const article = await screen.findByRole('article');
  fireEvent.click(within(article).getByRole('button', { name: /New order/ }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(targetUrl));
  expect(notificationsApi.read).toHaveBeenCalledWith(item.id);
});
it('shows the empty state and hides zero-count badges', async () => {
  vi.mocked(notificationsApi.unreadCount).mockResolvedValue(0);
  vi.mocked(notificationsApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
  show(); fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mark All as Read' })).toBeDisabled();
});
it('does not query notifications for unauthorized roles', () => {
  useAuthStore.getState().setSession({ id: 'other', name: 'Other', email: 'other@test', roles: ['Viewer'] });
  show(); expect(notificationsApi.unreadCount).not.toHaveBeenCalled(); expect(notificationsApi.list).not.toHaveBeenCalled();
});
it('does not expose the cached Admin inbox after Admin access is removed', async () => {
  show(); fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  await screen.findByRole('article', { name: item.title });
  act(() => useAuthStore.getState().setSession({ id: 'staff', name: 'Staff', email: 'staff@test', roles: ['Viewer'] }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(await screen.findByText('Order notifications are available to Admin staff.')).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: item.title })).not.toBeInTheDocument();
  expect(notificationsApi.list).toHaveBeenCalledTimes(1);
});
it('polls every 45 seconds and stops after unmount', async () => {
  const view = show(); await screen.findByText('1');
  vi.useFakeTimers();
  try {
    // Change data to update the observer while fake timers own the next interval.
    await act(async () => { view.client.setQueryData(['admin-notifications', 'staff', 'admin', 'count'], 2); });
    await act(async () => { await vi.advanceTimersByTimeAsync(45_100); });
    expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(2);
    view.unmount(); const count = vi.mocked(notificationsApi.unreadCount).mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(count);
  } finally { vi.useRealTimers(); view.client.clear(); }
});
