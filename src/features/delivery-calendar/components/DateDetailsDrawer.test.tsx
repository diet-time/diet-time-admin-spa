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
  it('flags incomplete defaults and labels the report preliminary instead of saying no preparation', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, isPreliminary: true,
      status: 'NeedsReview', mealTypes: [], mealItemCount: 0,
      operationalExceptions: ['Order ORD-1: not enough eligible snacks.'] }} />);
    expect(screen.getByText(/Preliminary — only finalized dishes/)).toBeInTheDocument();
    expect(screen.getByText('Order ORD-1: not enough eligible snacks.')).toBeInTheDocument();
    expect(screen.getByText('No finalized dishes yet')).toBeInTheDocument();
    expect(screen.queryByText('No preparation required')).not.toBeInTheDocument();
  });

  it('shows customer and automatic finalization sources with actual dishes and dietary requirements', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, status: 'Finalized', selections: [
      { serviceDayId: 'day-1', orderReference: 'ORD-1', customerReference: 'customer-1', customerName: 'Biju Manayagath', deliveryAddress: 'Must not show a delivery address for takeaway', finalizationStatus: 'CUSTOMER_CONFIRMED',
        fulfillmentMethod: 'TAKEAWAY', takeawayBranchName: 'Diet Time – Izghawa Branch', takeawayBranchAddress: 'Configured branch address', selectionSources: ['CUSTOMER'], dishes: [{ mealName: 'Grilled salmon', category: 'meal', quantity: 2 }], dietaryRestrictions: ['DAIRY_FREE'] },
      { serviceDayId: 'day-2', orderReference: 'ORD-2', customerReference: 'customer-2', customerName: 'Sara Ali', deliveryAddress: 'Building 10, Street 20, Zone 30, Doha', finalizationStatus: 'AUTO_FINALIZED',
        selectionSources: ['DEFAULT'], dishes: [{ mealName: 'Berry yogurt', category: 'snack', quantity: 1 }], dietaryRestrictions: [] },
    ] }} />);
    expect(screen.getByText(/ORD-1 · CUSTOMER CONFIRMED/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-2 · AUTO FINALIZED/)).toBeInTheDocument();
    expect(screen.getByText('2 × Grilled salmon (meal)')).toBeInTheDocument();
    expect(screen.getByText('1 × Berry yogurt (snack)')).toBeInTheDocument();
    expect(screen.getByText('Takeaway · Diet Time – Izghawa Branch · Configured branch address')).toBeInTheDocument();
    expect(screen.getByText('Home Delivery · Building 10, Street 20, Zone 30, Doha')).toBeInTheDocument();
    expect(screen.getByText('Biju Manayagath · Customer')).toBeInTheDocument();
    expect(screen.getByText('Sara Ali · Default')).toBeInTheDocument();
    expect(screen.queryByText(/customer-1|customer-2|Must not show a delivery address/)).not.toBeInTheDocument();
    expect(screen.getByText('Dietary requirements: Dairy Free')).toBeInTheDocument();
  });

  it('uses authoritative translated dietary labels and explicit missing-data fallbacks', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, selections: [
      { serviceDayId: 'day', orderReference: 'ORD-3', customerReference: 'opaque-profile-id', finalizationStatus: 'UNFINALIZED',
        selectionSources: [], dishes: [], dietaryRestrictions: ['HIGH_PROTEIN', 'ALLERGEN: EGGS'],
        dietaryRestrictionLabels: ['High Protein', 'Allergen: Hen eggs'] },
    ] }} />);
    expect(screen.getByText('Name not recorded')).toBeInTheDocument();
    expect(screen.getByText('Home Delivery · Address not recorded')).toBeInTheDocument();
    expect(screen.getByText('Dietary requirements: High Protein, Allergen: Hen eggs')).toBeInTheDocument();
    expect(screen.queryByText(/opaque-profile-id|HIGH_PROTEIN|ALLERGEN:/)).not.toBeInTheDocument();
  });

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
