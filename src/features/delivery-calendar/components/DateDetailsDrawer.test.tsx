import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { PreparationSummary } from './DateDetailsDrawer';
import type { DeliveryPreparationSummary } from '../types';

vi.mock('@/api/deliveryCalendarApi', () => ({
  deliveryCalendarApi: { preparationReport: vi.fn() },
}));

const summary: DeliveryPreparationSummary = {
  date: '2026-08-16',
  status: 'SCHEDULED',
  orderCount: 1,
  customerCount: 1,
  mealItemCount: 2,
  mealTypes: [{
    mealTypeId: 'lunch',
    mealTypeName: 'Lunch',
    quantity: 2,
    items: [{ menuItemId: 'meal-1', menuItemName: 'Chicken with Rice', quantity: 2 }],
  }],
  planBreakdown: [{ mealPlanId: 'plan-1', mealPlanName: 'Balanced', orderCount: 1 }],
};

describe('PreparationSummary report download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preparation-report') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('downloads the report for the selected delivery date and restores the button', async () => {
    let finishDownload!: (report: { blob: Blob; filename: string }) => void;
    vi.mocked(deliveryCalendarApi.preparationReport).mockReturnValue(new Promise(resolve => { finishDownload = resolve; }));
    render(<PreparationSummary date="2026-08-16" summary={summary} />);

    const button = screen.getByRole('button', { name: 'Download PDF' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(deliveryCalendarApi.preparationReport).toHaveBeenCalledWith('2026-08-16');

    finishDownload({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'Kitchen-Preparation-2026-08-16.pdf' });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText('Preparation report downloaded.')).toBeInTheDocument();
  });

  it('keeps the download available for an empty preparation day', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, mealTypes: [], planBreakdown: [], mealItemCount: 0 }} />);

    expect(screen.getByText('No preparation required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  it('shows the existing error message and re-enables the button when the request fails', async () => {
    vi.mocked(deliveryCalendarApi.preparationReport).mockRejectedValue(new Error('Network error'));
    render(<PreparationSummary date="2026-08-16" summary={summary} />);

    const button = screen.getByRole('button', { name: 'Download PDF' });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText('Unable to download preparation report.')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Chicken with Rice')).toBeInTheDocument();
  });
});
