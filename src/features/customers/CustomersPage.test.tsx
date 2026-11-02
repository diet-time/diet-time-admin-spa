import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { customersApi, type AdminCustomer } from '@/api/customersApi';
import { accessControlApi } from '@/api/accessControlApi';
import { useAuthStore } from '@/app/store/authStore';
import type { StaffOrder } from '@/api/staffOrdersApi';
import { CustomersPage } from './CustomersPage';

vi.mock('@/api/customersApi', () => ({ customersApi: { list: vi.fn(), get: vi.fn(), orders: vi.fn() } }));
vi.mock('@/api/accessControlApi', () => ({ accessControlApi: { myScreens: vi.fn() } }));
const customer: AdminCustomer = { id: 'customer-1', name: 'Sara Ali', phone: '+97455555555', email: 'sara@example.test', registeredAt: '2026-10-01T08:00:00Z', isActive: true, preferredLanguage: 'en', totalOrders: 7, bookedPlans: 4, activePlans: 1, pausedPlans: 1, pendingOrders: 1, cancelledOrders: 1, rejectedOrders: 1, latestOrderAt: '2026-11-02T08:00:00Z' };
const order: StaffOrder = { customerName: 'Sara Ali', history: [], order: { id: 'order-1', orderNumber: 'ORD-001', status: 'CONFIRMED', paymentStatus: 'PAID', placedAt: '2026-11-02T08:00:00Z', plan: { name: 'Balanced plan', durationName: '12 days' }, mealCount: 2, snackCount: 1, fulfillmentMethod: 'TAKEAWAY', delivery: { startDate: '2026-11-03', endDate: '2026-11-16', days: [1, 2, 3, 4, 6, 7], serviceDates: [] }, pricing: { totalAmount: 700, currencyCode: 'QAR' }, review: { rowVersion: 1, requiresPrepayment: false, awaitingPayment: false, canFulfill: true } } };
function show(url = '/customers') { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><Routes><Route path="/customers" element={<CustomersPage />} /><Route path="/orders" element={<p>Existing order details</p>} /></Routes></MemoryRouter></QueryClientProvider>); }
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession({ id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] });
  vi.mocked(customersApi.list).mockResolvedValue({ items: [customer], totalCount: 21, pageNumber: 1, pageSize: 20 });
  vi.mocked(customersApi.get).mockResolvedValue(customer);
  vi.mocked(customersApi.orders).mockResolvedValue({ items: [order], totalCount: 1, pageNumber: 1, pageSize: 20 });
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([{ screenId: 'orders', groupCode: 'OPERATIONS', groupName: 'Operations', screenCode: 'ORDERS', screenName: 'Orders', routeUrl: '/orders', displayOrder: 1, isActive: true, canRead: true, canWrite: true }]);
});
it('does not render cached customer data or issue customer requests for non-Admin staff', () => {
  useAuthStore.getState().setSession({ id: 'viewer', name: 'Viewer', email: 'viewer@example.test', roles: ['Viewer'] });
  show();
  expect(screen.getByRole('alert')).toHaveTextContent('Customer directory is available to Admin staff');
  expect(customersApi.list).not.toHaveBeenCalled();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
it('shows contact details and separate booked, active, paused and pending counts', async () => {
  show(); const table = await screen.findByRole('table', { name: 'Customer directory' });
  await within(table).findByText('Sara Ali');
  expect(within(table).getByText('sara@example.test')).toBeInTheDocument();
  expect(within(table).getByText('+97455555555')).toBeInTheDocument();
  expect(within(table).getByText('4')).toBeInTheDocument();
  expect(within(table).getByText('1 active')).toBeInTheDocument();
  expect(within(table).getByText('1 paused')).toBeInTheDocument();
});
it('sends name/contact search and page selection to the server', async () => {
  show(); await screen.findByText('Sara Ali');
  fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: 'Sara' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(customersApi.list).toHaveBeenCalledWith('Sara', 1, expect.anything()));
  fireEvent.click(await screen.findByRole('button', { name: 'Go to page 2' }));
  await waitFor(() => expect(customersApi.list).toHaveBeenCalledWith('Sara', 2, expect.anything()));
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  await waitFor(() => expect(customersApi.list).toHaveBeenLastCalledWith('', 1, expect.anything()));
});
it('opens customer history and reuses the existing order details screen', async () => {
  show(); fireEvent.click(await screen.findByRole('button', { name: 'View customer Sara Ali' }));
  const drawer = await screen.findByRole('dialog', { name: 'Customer details' });
  expect(await within(drawer).findByText('Balanced plan')).toBeInTheDocument();
  expect(within(drawer).getByText('7 total orders')).toBeInTheDocument();
  expect(customersApi.orders).toHaveBeenCalledWith('customer-1', 1, expect.anything());
  fireEvent.click(within(drawer).getByRole('button', { name: 'View order' }));
  expect(await screen.findByText('Existing order details')).toBeInTheDocument();
});
it('supports customers with no bookings and missing contact data', async () => {
  vi.mocked(customersApi.get).mockResolvedValue({ ...customer, phone: undefined, email: undefined, totalOrders: 0, bookedPlans: 0 });
  vi.mocked(customersApi.orders).mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  show('/customers?customerId=customer-1');
  const drawer = await screen.findByRole('dialog', { name: 'Customer details' });
  expect(await within(drawer).findByText('This customer has no orders yet.')).toBeInTheDocument();
  expect(within(drawer).getByText('Phone not recorded')).toBeInTheDocument();
  expect(within(drawer).getByText('Email not recorded')).toBeInTheDocument();
});
it('paginates the selected customer history independently of the customer list', async () => {
  vi.mocked(customersApi.orders).mockResolvedValue({ items: [order], totalCount: 21, pageNumber: 1, pageSize: 20 });
  show('/customers?customerId=customer-1');
  const drawer = await screen.findByRole('dialog', { name: 'Customer details' });
  fireEvent.click(await within(drawer).findByRole('button', { name: 'Go to page 2' }));
  await waitFor(() => expect(customersApi.orders).toHaveBeenCalledWith('customer-1', 2, expect.anything()));
  expect(customersApi.list).toHaveBeenCalledTimes(1);
});
it('hides order navigation when the Orders screen cannot be read', async () => {
  vi.mocked(accessControlApi.myScreens).mockResolvedValue([]);
  show('/customers?customerId=customer-1');
  await screen.findByText('Balanced plan');
  expect(screen.queryByRole('button', { name: 'View order' })).not.toBeInTheDocument();
});
it('keeps errors retryable and does not invent empty customer data', async () => {
  vi.mocked(customersApi.list).mockRejectedValue(new Error('network'));
  show(); expect(await screen.findByRole('alert')).toHaveTextContent('Unable to refresh customers');
  expect(screen.queryByText('No customer profiles yet.')).not.toBeInTheDocument();
  vi.mocked(customersApi.list).mockResolvedValue({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No customer profiles yet.')).toBeInTheDocument();
});
