import { renderWithToasts as render } from '@/test/renderWithToasts';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText(/Preliminary — quantities include confirmed or automatically assigned, locked meal selections only/)).toBeInTheDocument();
    expect(screen.getByText('Order ORD-1: not enough eligible snacks.')).toBeInTheDocument();
    expect(screen.getByText('No locked meal selections yet')).toBeInTheDocument();
    expect(screen.queryByText('No preparation required')).not.toBeInTheDocument();
  });

  it('shows customer and automatic finalization sources with actual dishes and dietary requirements', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, status: 'Finalized', selections: [
      { serviceDayId: 'day-1', orderReference: 'ORD-1', customerReference: 'customer-1', customerName: 'Biju Manayagath', deliveryAddress: 'Must not show a delivery address for takeaway', finalizationStatus: 'CUSTOMER_CONFIRMED',
        fulfillmentMethod: 'TAKEAWAY', takeawayBranchName: 'Diet Time – Izghawa Branch', takeawayBranchAddress: 'Configured branch address', selectionSources: ['CUSTOMER'], dishes: [{ mealName: 'Grilled salmon', category: 'meal', quantity: 2 }], dietaryRestrictions: ['DAIRY_FREE'] },
      { serviceDayId: 'day-2', orderReference: 'ORD-2', customerReference: 'customer-2', customerName: 'Sara Ali', deliveryAddress: 'Building 10, Street 20, Zone 30, Doha', finalizationStatus: 'AUTO_FINALIZED',
        selectionSources: ['DEFAULT'], dishes: [{ mealName: 'Berry yogurt', category: 'snack', quantity: 1 }], dietaryRestrictions: [] },
    ] }} />);
    expect(screen.getByText(/ORD-1 · Customer confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-2 · Automatically assigned/)).toBeInTheDocument();
    const customer = screen.getByRole('button', { name: /Biju Manayagath/ });
    expect(customer).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(customer);
    expect(customer).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('2 × Grilled salmon')).toBeVisible();
    expect(screen.getByText('Uncategorized Meal')).toBeInTheDocument();
    expect(screen.getByText('1 × Berry yogurt')).toBeInTheDocument();
    expect(screen.getByText('Takeaway · Diet Time – Izghawa Branch · Configured branch address')).toBeInTheDocument();
    expect(screen.getByText('Home Delivery · Building 10, Street 20, Zone 30, Doha')).toBeInTheDocument();
    expect(screen.getByText('Biju Manayagath')).toBeInTheDocument();
    expect(screen.getByText('Customer Selected')).toBeInTheDocument();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument();
    expect(screen.getByText('Automatically Assigned')).toBeInTheDocument();
    expect(screen.queryByText(/customer-1|customer-2|Must not show a delivery address/)).not.toBeInTheDocument();
    expect(screen.getByText('Food Preferences: Dairy Free')).toBeInTheDocument();
  });

  it('uses authoritative translated dietary labels and explicit missing-data fallbacks', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, selections: [
      { serviceDayId: 'day', orderReference: 'ORD-3', customerReference: 'opaque-profile-id', finalizationStatus: 'UNFINALIZED',
        selectionSources: [], dishes: [], dietaryRestrictions: ['HIGH_PROTEIN', 'ALLERGEN: EGGS'],
        dietaryRestrictionLabels: ['High Protein', 'Allergen: Hen eggs'] },
    ] }} />);
    expect(screen.getByText('Name not recorded')).toBeInTheDocument();
    expect(screen.getByText('Home Delivery · Address not recorded')).toBeInTheDocument();
    expect(screen.getByText('Food Preferences: High Protein')).toBeInTheDocument();
    expect(screen.getByText('Allergens: Hen eggs')).toBeInTheDocument();
    expect(screen.queryByText(/opaque-profile-id|HIGH_PROTEIN|ALLERGEN:/)).not.toBeInTheDocument();
  });

  it('sorts configured categories, reconciles portions, and keeps critical allergens visible when collapsed', () => {
    render(<PreparationSummary date="2026-08-16" summary={{ ...summary, mealItemCount: 4,
      mealTypes: [
        { mealTypeId: 'lunch', mealTypeName: 'Late Lunch', mealCategoryDisplayOrder: 20, mealClassification: 'meal', quantity: 2, items: [{ menuItemId: 'shared', menuItemName: 'Shared dish', quantity: 2 }] },
        { mealTypeId: 'breakfast', mealTypeName: 'Early Breakfast', mealCategoryDisplayOrder: 10, mealClassification: 'meal', quantity: 1, items: [{ menuItemId: 'shared', menuItemName: 'Shared dish', quantity: 1 }] },
        { mealTypeId: 'snack', mealTypeName: 'PM Snack', mealCategoryDisplayOrder: 30, mealClassification: 'snack', quantity: 1, items: [{ menuItemId: 'snack', menuItemName: 'Yogurt', quantity: 1 }] },
      ], selections: [{ serviceDayId: 'day', orderReference: 'ORD-SHARED', customerReference: 'customer', customerName: 'Sara', mealPlanName: 'Balanced', finalizationStatus: 'AUTO_FINALIZED', selectionSources: ['DEFAULT'],
        foodPreferences: ['Seafood', 'seafood'], allergens: ['Celery', 'celery', 'Eggs (including traces)'], dietaryRestrictions: ['ALLERGEN: obsolete'],
        dishes: [{ mealName: 'Shared dish', category: 'meal', quantity: 1, mealCategoryId: 'breakfast', mealCategoryName: 'Early Breakfast', mealCategoryDisplayOrder: 10 }, { mealName: 'Shared dish', category: 'meal', quantity: 2, mealCategoryId: 'lunch', mealCategoryName: 'Late Lunch', mealCategoryDisplayOrder: 20 }, { mealName: 'Yogurt', category: 'snack', quantity: 1, mealCategoryName: 'PM Snack', mealCategoryDisplayOrder: 30 }] }],
    }} />);
    expect(screen.getByText('Allergens: Celery, Eggs (including traces)')).toBeVisible();
    expect(screen.queryByText(/obsolete/)).not.toBeInTheDocument();
    const customer = screen.getByRole('button', { name: /Sara/ });
    expect(customer).toHaveAttribute('aria-expanded', 'false');
    const menuTables = screen.getAllByRole('table');
    expect(menuTables.map(table => table.getAttribute('aria-label'))).toEqual(['Early Breakfast menu items', 'Late Lunch menu items', 'PM Snack menu items']);
    expect(screen.getByLabelText('Preparation overview')).toHaveTextContent('Meal portions3Snack portions1Total portions4');
    fireEvent.click(customer);
    expect(screen.getByText('Food Preferences: Seafood')).toBeVisible();
    expect(screen.getByText('1 × Shared dish')).toBeVisible();
    expect(screen.getByText('2 × Shared dish')).toBeVisible();
    expect(screen.getAllByText(/^Allergens:/)).toHaveLength(1);
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
    expect(screen.getByText('Unable to download preparation report. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Chicken with Rice')).toBeInTheDocument();
  });
});
