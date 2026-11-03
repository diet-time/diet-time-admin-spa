import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardCustomerInsights } from '@/api/apiTypes';
import { CustomerInsightsCard } from './CustomerInsightsCard';

const data: DashboardCustomerInsights = {
  throughDate: '2026-11-03', newCustomersFrom: '2026-10-05', customersWithBookings: 12,
  repeatCustomers: 3, newCustomers: 4, bookedOrders: 20, repeatCustomerRate: 25,
  topCustomers: [
    { customerId: 'one', customerName: 'Aisha Ali', bookedOrders: 5, latestBookingAt: '2026-11-03T06:00:00Z' },
    { customerId: 'two', customerName: 'Biju Menon', bookedOrders: 1, latestBookingAt: '2026-11-02T06:00:00Z' },
  ],
};

describe('Customer insights', () => {
  it('shows ranked order counts and clearly defined customer metrics', () => {
    render(<CustomerInsightsCard data={data} />);
    const ranked = screen.getByRole('list', { name: 'Customers ranked by booked orders' });
    expect(within(ranked).getAllByRole('listitem')).toHaveLength(2);
    expect(within(ranked).getByText('5 orders')).toBeInTheDocument();
    expect(within(ranked).getByText('1 order')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Aisha Ali: 5 booked orders' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Biju Menon: 1 booked orders' })).toHaveAttribute('aria-valuenow', '20');
    expect(within(screen.getByRole('region', { name: 'Repeat customers' })).getByText('3')).toBeInTheDocument();
    expect(screen.getByText('25% have booked more than once')).toBeInTheDocument();
    expect(screen.getByText('First booking in the last 30 days')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View customers' })).not.toBeInTheDocument();
  });
  it('navigates through permitted existing customer actions', () => {
    const onCustomer = vi.fn(); const onCustomers = vi.fn();
    render(<CustomerInsightsCard data={data} onCustomer={onCustomer} onCustomers={onCustomers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aisha Ali' }));
    expect(onCustomer).toHaveBeenCalledWith('one');
    fireEvent.click(screen.getByRole('button', { name: 'View customers' }));
    expect(onCustomers).toHaveBeenCalledOnce();
  });
  it('distinguishes empty bookings from unavailable analytics', () => {
    const { rerender } = render(<CustomerInsightsCard data={{ ...data, customersWithBookings: 0, repeatCustomers: 0, newCustomers: 0, bookedOrders: 0, repeatCustomerRate: null, topCustomers: [] }} />);
    expect(screen.getByText('No customer bookings yet')).toBeInTheDocument();
    expect(screen.getByText('No bookings yet')).toBeInTheDocument();
    rerender(<CustomerInsightsCard />);
    expect(screen.getByText('Customer insights are not available.')).toBeInTheDocument();
    expect(screen.queryByText('No customer bookings yet')).not.toBeInTheDocument();
  });
});
