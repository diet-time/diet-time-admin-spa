import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StaffOrder } from '@/api/staffOrdersApi';
import { formatOrderDate, OrderReviewDetails } from './OrderReviewDetails';

const value: StaffOrder = {
  customerName: 'Test Customer', customerPhone: '+97455555555', history: [
    { id: 'history-old', previousStatus: 'CONFIRMED', status: 'ACTIVE', changedAt: '2026-10-31T05:54:55Z', changedBy: 'internal-staff-guid', reason: 'Approved schedule' },
    { id: 'history-paid', previousStatus: 'ACTIVE', status: 'ACTIVE', previousPaymentStatus: 'PENDING', paymentStatus: 'PAID', changedAt: '2026-10-31T05:55:07Z', changedBy: 'internal-payment-guid', reason: 'Payment verified' },
  ],
  order: {
    id: 'internal-order-guid', orderNumber: 'ORD-20261030-000043', status: 'ACTIVE', paymentStatus: 'PAID', placedAt: '2026-10-30T12:00:00Z',
    plan: { name: 'Complete Balance', durationName: '2 Weeks' }, mealCount: 2, snackCount: 1, fulfillmentMethod: 'HOME_DELIVERY',
    delivery: { startDate: '2026-10-31', endDate: '2026-11-12', days: [1, 2, 3, 4, 6, 7],
      serviceDates: ['2026-10-31', '2026-11-01', '2026-11-02'],
      address: { area: 'Doha', formattedAddress: 'Pinned location, Qatar', buildingNo: '15', streetNo: '960', zoneNo: '91' }, timeSlot: { name: 'Morning' } },
    pricing: { currencyCode: 'QAR', totalAmount: 999 }, review: { rowVersion: 5, requiresPrepayment: false, awaitingPayment: false, canFulfill: true },
  },
};
describe('Staff order detail presentation', () => {
  it('groups customer, delivery, package and payment details with clear headings', () => {
    render(<OrderReviewDetails value={value} />);
    expect(screen.getByRole('heading', { name: 'Complete Balance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home Delivery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Service schedule' })).toBeInTheDocument();
    expect(screen.getByText('Test Customer')).toBeInTheDocument();
    expect(screen.getByText('+97455555555')).toBeInTheDocument();
    expect(screen.getByText('Pinned location, Qatar')).toBeInTheDocument();
    expect(screen.getByText(/Building 15 · Street 960 · Zone 91 · Doha/)).toBeInTheDocument();
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('2 Meals + 1 Snack · 2 Weeks')).toBeInTheDocument();
    expect(screen.getByText('Payment: Paid')).toBeInTheDocument();
    expect(screen.getByText(/QAR\s*999\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/Service dates: 2026-/)).not.toBeInTheDocument();
  });
  it('expands readable service dates instead of showing a long date string', async () => {
    render(<OrderReviewDetails value={value} />);
    expect(screen.queryByRole('list', { name: 'Scheduled service dates' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Service dates/ }));
    const dates = await screen.findByRole('list', { name: 'Scheduled service dates' });
    expect(within(dates).getAllByRole('listitem')).toHaveLength(3);
    expect(within(dates).getByText('1 Nov 2026')).toBeInTheDocument();
  });
  it('shows readable Qatar history with payment changes and keeps raw audit IDs collapsed', async () => {
    const original = value.history.map(entry => entry.id);
    render(<OrderReviewDetails value={value} />);
    fireEvent.click(screen.getByRole('button', { name: /Activity history/ }));
    expect(await screen.findByText('Payment updated')).toBeVisible();
    expect(screen.getByText('Payment: Pending → Paid')).toBeVisible();
    expect(screen.getByText('Payment verified')).toBeVisible();
    expect(screen.getByText('31 Oct 2026, 08:55')).toBeVisible();
    expect(screen.getByText('Actor ID: internal-payment-guid')).not.toBeVisible();
    expect(screen.getByText('History ID: history-paid')).not.toBeVisible();
    fireEvent.click(screen.getAllByText('Internal audit details')[0]!);
    await waitFor(() => expect(screen.getByText('Actor ID: internal-payment-guid')).toBeVisible());
    expect(value.history.map(entry => entry.id)).toEqual(original);
  });
  it('shows only branch collection information for takeaway even if a legacy address remains', () => {
    render(<OrderReviewDetails value={{ ...value, order: { ...value.order, fulfillmentMethod: 'TAKEAWAY', takeawayBranch: { name: 'Diet Time – Azizia Branch', address: 'Azizia, Doha' } } }} />);
    expect(screen.getByRole('heading', { name: 'Takeaway' })).toBeInTheDocument();
    expect(screen.getByText('Diet Time – Azizia Branch')).toBeInTheDocument();
    expect(screen.getByText('Azizia, Doha')).toBeInTheDocument();
    expect(screen.queryByText('Delivery address')).not.toBeInTheDocument();
    expect(screen.queryByText('Pinned location, Qatar')).not.toBeInTheDocument();
    expect(screen.queryByText('Morning')).not.toBeInTheDocument();
  });
  it('preserves prepayment and hold/rejection explanations', () => {
    render(<OrderReviewDetails value={{ ...value, order: { ...value.order, review: { ...value.order.review, awaitingPayment: true, holdReason: 'Please verify the requested start date.' } } }} />);
    expect(screen.getByText(/Confirmed, awaiting required prepayment/)).toBeInTheDocument();
    expect(screen.getByText('Please verify the requested start date.')).toBeInTheDocument();
  });
  it('handles missing legacy details without invalid dates or placeholder IDs', () => {
    render(<OrderReviewDetails value={{ ...value, customerPhone: undefined, history: [], order: { ...value.order, fulfillmentMethod: 'TAKEAWAY', takeawayBranch: undefined, delivery: { ...value.order.delivery, startDate: '', endDate: '', serviceDates: [] } } }} />);
    expect(screen.getByText('Phone not recorded')).toBeInTheDocument();
    expect(screen.getByText('Branch not recorded')).toBeInTheDocument();
    expect(screen.getByText('No service dates recorded.')).toBeInTheDocument();
    expect(formatOrderDate('invalid')).toBe('Not recorded');
    expect(formatOrderDate('2026-11-01')).toBe('1 Nov 2026');
  });
});
