import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mealPlanPricePackagesApi, type MealPlanPricePackage } from '@/api/planPricingApi';
import { queryClient } from '@/app/queryClient';
import { PricePackagesTab } from './PricePackagesTab';

const packages: MealPlanPricePackage[] = [
  { id: 'day', code: 'DAY', nameEn: '1 Day', nameAr: 'يوم واحد', durationDays: 1, displayOrder: 1, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
  { id: 'week', code: 'WEEK', nameEn: '1 Week', nameAr: 'أسبوع واحد', durationDays: 6, displayOrder: 2, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-07-02T00:00:00Z', usageCount: 1 },
];

const renderTab = () => render(<QueryClientProvider client={queryClient}><PricePackagesTab /></QueryClientProvider>);

describe('PricePackagesTab', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
    vi.spyOn(mealPlanPricePackagesApi, 'list').mockResolvedValue({ items: packages, page: 1, pageSize: 25, totalCount: 2, totalPages: 1 });
    vi.spyOn(mealPlanPricePackagesApi, 'create').mockResolvedValue({ id: 'month' });
    vi.spyOn(mealPlanPricePackagesApi, 'update').mockResolvedValue(undefined);
    vi.spyOn(mealPlanPricePackagesApi, 'setStatus').mockResolvedValue(undefined);
  });

  it('loads the tab and preserves API package ordering', async () => {
    renderTab();
    expect(await screen.findByRole('heading', { name: 'Price Packages' })).toBeInTheDocument();
    const rows = await screen.findAllByRole('row');
    expect(within(rows[1]!).getByText('DAY')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('WEEK')).toBeInTheDocument();
  });

  it('sends search and active status filters to the package API', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('WEEK');
    await user.type(screen.getByPlaceholderText('Search package code or name'), 'week');
    await user.click(screen.getByLabelText('Status'));
    await user.click(await screen.findByRole('option', { name: 'Inactive' }));
    await waitFor(() => expect(mealPlanPricePackagesApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'week', isActive: false }), expect.any(AbortSignal)));
  });

  it('validates required package fields and accepts Arabic input in create requests', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('WEEK');
    await user.click(screen.getByRole('button', { name: 'Add Package' }));
    await user.click(screen.getByRole('button', { name: 'Save Package' }));
    expect(screen.getByText('Package code is required.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Package Code/), 'month');
    await user.type(screen.getByLabelText(/English Name/), '1 Month');
    await user.type(screen.getByLabelText(/Arabic Name/), 'شهر واحد');
    await user.type(screen.getByLabelText(/Service Days/), '24');
    await user.clear(screen.getByLabelText(/Display Order/));
    await user.type(screen.getByLabelText(/Display Order/), '4');
    await user.click(screen.getByRole('button', { name: 'Save Package' }));

    await waitFor(() => expect(mealPlanPricePackagesApi.create).toHaveBeenCalledWith({ code: 'MONTH', nameEn: '1 Month', nameAr: 'شهر واحد', durationDays: 24, displayOrder: 4, isActive: true }));
  });

  it('disables service days when an existing package is referenced', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('WEEK');
    await user.click(screen.getByRole('button', { name: 'Edit 1 Week' }));
    expect(screen.getByLabelText(/Service Days/)).toBeDisabled();
    expect(screen.getByText(/cannot be changed because this package is already used/)).toBeInTheDocument();
  });

  it('activates or deactivates packages after confirmation', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByText('WEEK');
    await user.click(screen.getByRole('button', { name: 'Deactivate 1 Week' }));
    expect(screen.getByRole('heading', { name: 'Deactivate “1 Week”?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Deactivate$/ }));
    await waitFor(() => expect(mealPlanPricePackagesApi.setStatus).toHaveBeenCalledWith('week', false));
  });
});
