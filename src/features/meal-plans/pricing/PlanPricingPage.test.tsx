import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlanPrice } from '@/api/planPricingApi';
import type { PlanSummary } from '@/api/apiTypes';
import { PackageCell, PricingDialog } from './PlanPricingPage';

const plan: PlanSummary = { id: 'plan-1', code: 'BALANCED', nameEn: 'Balanced Living', planType: 'Standard', durationDays: 30, customizable: true, published: true, active: true, updatedAt: '2026-01-01T00:00:00Z' };
const packageLookup = [{ id: 'week', code: 'WEEK', nameEn: '1 Week', nameAr: 'أسبوع واحد', durationDays: 6, displayOrder: 2 }];

describe('pricing package integration', () => {
  it('removes manual duration, shows service days, and submits the selected package ID', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="add" plans={[plan]} currencies={['QAR']} packages={packageLookup} packagesLoading={false} packagesError={false} pending={false} onClose={vi.fn()} onSave={onSave} onRetryPackages={vi.fn()} onCreatePackage={vi.fn()} />);

    expect(screen.queryByLabelText('Duration in days')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /Meal plan template/ }));
    await user.click(await screen.findByRole('option', { name: 'Balanced Living (BALANCED)' }));
    await user.click(screen.getByRole('combobox', { name: /Price Package/ }));
    await user.click(await screen.findByRole('option', { name: '1 Week — 6 service days' }));
    expect(screen.getByText('Service days: 6')).toBeInTheDocument();
    await user.type(screen.getByRole('spinbutton', { name: /Meals per day/ }), '3');
    await user.type(screen.getByRole('spinbutton', { name: /Amount/ }), '500');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mealPlanTemplateId: 'plan-1', mealPlanPricePackageId: 'week', mealsPerDay: 3 }));
    expect(onSave.mock.calls[0]?.[0]).not.toHaveProperty('durationDays');
  });

  it('shows empty lookup guidance with a create-package action', async () => {
    const onCreatePackage = vi.fn();
    const user = userEvent.setup();
    render(<PricingDialog mode="add" plans={[plan]} currencies={['QAR']} packages={[]} packagesLoading={false} packagesError={false} pending={false} onClose={vi.fn()} onSave={vi.fn()} onRetryPackages={vi.fn()} onCreatePackage={onCreatePackage} />);
    expect(screen.getByText('No active price packages are configured.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create Price Package' }));
    expect(onCreatePackage).toHaveBeenCalled();
  });

  it('shows lookup errors with retry', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<PricingDialog mode="add" plans={[plan]} currencies={['QAR']} packages={[]} packagesLoading={false} packagesError pending={false} onClose={vi.fn()} onSave={vi.fn()} onRetryPackages={retry} onCreatePackage={vi.fn()} />);
    expect(screen.getByText('Unable to load price packages.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });

  it('renders legacy pricing without guessing a package', () => {
    const legacy = { durationDays: 6, mealPlanPricePackageId: null, packageNameEn: null } as PlanPrice;
    render(<PackageCell price={legacy} />);
    expect(screen.getByText('Legacy — 6 days')).toBeInTheDocument();
  });
});
