import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { TodayOrderPulse } from './TodayOrderPulse';
import type { DeliveryCalendarDay, OperationalStatus } from '../types';

const day = (date: string, status: OperationalStatus, counts: Partial<DeliveryCalendarDay> = {}): DeliveryCalendarDay => ({ date, operationalStatus: status, totalDeliveries: 5, totalCustomers: 3, totalMealItems: 10, overrideCount: 0, totalServiceDays: 5, ...counts });
describe('calendar fulfillment visualization', () => {
  it('shows today\'s overdue status in red', () => {
    render(<TodayOrderPulse day={day('2026-11-02', 'OVERDUE', { overdueCount: 1 })} onSelect={vi.fn()} />);
    expect(screen.getByText('overdue').parentElement).toHaveClass('MuiChip-colorError');
  });
  it('keeps weekday layout, date selection, counts and no-deliveries cells', () => {
    const onSelect = vi.fn();
    render(<CalendarMonthGrid view="month" onSelect={onSelect} days={[
      day('2026-11-02', 'OVERDUE', { overdueCount: 2, fulfilledCount: 3 }),
      day('2026-11-03', 'SCHEDULED', { pendingCount: 5 }),
      day('2026-11-04', 'FULFILLED', { fulfilledCount: 5 }),
      day('2026-11-05', 'PARTIALLY_FULFILLED', { fulfilledCount: 3, pendingCount: 2 }),
      day('2026-11-06', 'NO_DELIVERIES', { totalDeliveries: 0, totalCustomers: 0, totalServiceDays: 0 }),
    ]} />);
    expect(screen.getByText('MONDAY')).toBeInTheDocument();
    expect(screen.getByText('SUNDAY')).toBeInTheDocument();
    const overdue = screen.getByRole('button', { name: 'Open deliveries for Monday, 2 November 2026' });
    expect(within(overdue).getByText('2 Overdue')).toBeInTheDocument();
    expect(within(overdue).getByText('3 Fulfilled')).toBeInTheDocument();
    expect(overdue).toHaveStyle({ backgroundColor: '#FFF3F3' });
    const fulfilled = screen.getByRole('button', { name: 'Open deliveries for Wednesday, 4 November 2026' });
    expect(within(fulfilled).getByText('5 Fulfilled')).toBeInTheDocument();
    expect(fulfilled).toHaveStyle({ backgroundColor: '#F1F8F3' });
    expect(screen.getByText('Partially Fulfilled')).toBeInTheDocument();
    expect(screen.getByText('5 Scheduled')).toBeInTheDocument();
    expect(screen.getByText('No Deliveries')).toBeInTheDocument();
    fireEvent.click(overdue); expect(onSelect).toHaveBeenCalledWith('2026-11-02');
  });
});
