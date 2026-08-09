import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlanPrice } from '@/api/planPricingApi';
import type { PlanSummary } from '@/api/apiTypes';
import { PackageCell, PricingDialog } from './PlanPricingPage';
import { buildPriceTranslations, priceDisplayName, pricingSaveError } from './planPricingTranslations';

const plan: PlanSummary = { id: 'plan-1', code: 'BALANCED', nameEn: 'Balanced Living', planType: 'Standard', durationDays: 30, customizable: true, published: true, active: true, updatedAt: '2026-01-01T00:00:00Z' };
const packageLookup = [{ id: 'week', code: 'WEEK', nameEn: '1 Week', nameAr: 'أسبوع واحد', durationDays: 6, displayOrder: 2 }];
const existingPrice: PlanPrice = {
  id: 'price-1',
  mealPlanTemplateId: 'plan-1',
  mealPlanCode: 'BALANCED',
  mealPlanName: 'Balanced Living',
  mealPlanPricePackageId: 'week',
  packageCode: 'WEEK',
  packageNameEn: '1 Week',
  packageNameAr: 'أسبوع واحد',
  durationDays: 6,
  mealsPerDay: 3,
  snacksPerDay: 1,
  currencyCode: 'QAR',
  amount: 780,
  effectiveFrom: '2026-08-08T00:00:00Z',
  effectiveUntil: null,
  isActive: true,
  status: 'ACTIVE',
  canDelete: false,
  translations: [
    { languageCode: 'en', name: 'Three Meals – One Week', description: 'Three meals daily.' },
    { languageCode: 'ar', name: 'ثلاث وجبات – أسبوع واحد', description: 'ثلاث وجبات يومياً.' },
  ],
};

const dialogProps = {
  plans: [plan],
  currencies: ['QAR'],
  packages: packageLookup,
  packagesLoading: false,
  packagesError: false,
  pending: false,
  onClose: vi.fn(),
  onRetryPackages: vi.fn(),
  onCreatePackage: vi.fn(),
};

const completeNewPricingFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('combobox', { name: /Meal plan template/ }));
  await user.click(await screen.findByRole('option', { name: 'Balanced Living (BALANCED)' }));
  await user.click(screen.getByRole('combobox', { name: /Price Package/ }));
  await user.click(await screen.findByRole('option', { name: /1 Week.*6 service days/ }));
  await user.type(screen.getByRole('spinbutton', { name: /Meals per day/ }), '3');
  await user.type(screen.getByRole('spinbutton', { name: /Amount/ }), '780');
};

describe('pricing package integration', () => {
  it('removes manual duration, shows service days, and submits the selected package ID', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="add" plans={[plan]} currencies={['QAR']} packages={packageLookup} packagesLoading={false} packagesError={false} pending={false} onClose={vi.fn()} onSave={onSave} onRetryPackages={vi.fn()} onCreatePackage={vi.fn()} />);

    expect(screen.queryByLabelText('Duration in days')).not.toBeInTheDocument();
    expect(screen.getByText(/Pricing periods cannot overlap/)).toBeInTheDocument();
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

  it('creates pricing with English and Arabic price translations', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="add" {...dialogProps} onSave={onSave} />);
    await completeNewPricingFields(user);
    fireEvent.change(screen.getByLabelText('English Name'), { target: { value: 'Three Meals – One Week' } });
    fireEvent.change(screen.getByLabelText('English Description'), { target: { value: 'Three meals daily.' } });
    await user.click(screen.getByRole('tab', { name: 'العربية' }));
    fireEvent.change(screen.getByLabelText('Arabic Name'), { target: { value: 'ثلاث وجبات – أسبوع واحد' } });
    fireEvent.change(screen.getByLabelText('Arabic Description'), { target: { value: 'ثلاث وجبات يومياً.' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      translations: [
        { languageCode: 'en', name: 'Three Meals – One Week', description: 'Three meals daily.' },
        { languageCode: 'ar', name: 'ثلاث وجبات – أسبوع واحد', description: 'ثلاث وجبات يومياً.' },
      ],
    }));
  });

  it('supports an English-only translation', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="add" {...dialogProps} onSave={onSave} />);
    await completeNewPricingFields(user);
    fireEvent.change(screen.getByLabelText('English Name'), { target: { value: 'English only' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0]?.[0].translations).toEqual([{ languageCode: 'en', name: 'English only', description: null }]);
  });

  it('loads and edits the correct existing translations', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="edit" price={existingPrice} {...dialogProps} onSave={onSave} />);
    expect(screen.getByLabelText('English Name')).toHaveValue('Three Meals – One Week');
    await user.clear(screen.getByLabelText('English Description'));
    fireEvent.change(screen.getByLabelText('English Description'), { target: { value: 'Updated description' } });
    await user.click(screen.getByRole('tab', { name: 'العربية' }));
    expect(screen.getByLabelText('Arabic Name')).toHaveValue('ثلاث وجبات – أسبوع واحد');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0]?.[0].translations).toEqual([
      { languageCode: 'en', name: 'Three Meals – One Week', description: 'Updated description' },
      { languageCode: 'ar', name: 'ثلاث وجبات – أسبوع واحد', description: 'ثلاث وجبات يومياً.' },
    ]);
  });

  it('omits unchanged translations when only pricing fields are edited', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="edit" price={existingPrice} {...dialogProps} onSave={onSave} />);
    await user.clear(screen.getByRole('spinbutton', { name: /Amount/ }));
    await user.type(screen.getByRole('spinbutton', { name: /Amount/ }), '800');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0]?.[0]).not.toHaveProperty('translations');
  });

  it('requires confirmation before deleting all translations', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PricingDialog mode="edit" price={existingPrice} {...dialogProps} onSave={onSave} />);
    await user.clear(screen.getByLabelText('English Name'));
    await user.clear(screen.getByLabelText('English Description'));
    await user.click(screen.getByRole('tab', { name: 'العربية' }));
    await user.clear(screen.getByLabelText('Arabic Name'));
    await user.clear(screen.getByLabelText('Arabic Description'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Remove all price translations?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove all translations' }));
    expect(onSave.mock.calls[0]?.[0].translations).toEqual([]);
  });

  it('uses RTL Arabic inputs and prevents duplicate language records', async () => {
    const user = userEvent.setup();
    render(<PricingDialog mode="add" {...dialogProps} onSave={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'العربية' }));
    expect(screen.getByLabelText('Arabic Name')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByLabelText('Arabic Description')).toHaveAttribute('dir', 'rtl');
    const translations = buildPriceTranslations({ englishName: 'English', englishDescription: '', arabicName: 'العربية', arabicDescription: '' });
    expect(new Set(translations.map((item) => item.languageCode)).size).toBe(translations.length);
    expect(translations.map((item) => item.languageCode)).toEqual(['en', 'ar']);
  });

  it('validates translation names and descriptions at their maximum lengths', async () => {
    const user = userEvent.setup();
    render(<PricingDialog mode="add" {...dialogProps} onSave={vi.fn()} />);
    await completeNewPricingFields(user);
    fireEvent.change(screen.getByLabelText('English Name'), { target: { value: 'n'.repeat(151) } });
    fireEvent.change(screen.getByLabelText('English Description'), { target: { value: 'd'.repeat(501) } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Name must be 150 characters or fewer.')).toBeInTheDocument();
    expect(screen.getByText('Description must be 500 characters or fewer.')).toBeInTheDocument();
  });

  it('falls back from English price name to package and then meal-plan name', () => {
    expect(priceDisplayName(existingPrice)).toBe('Three Meals – One Week');
    expect(priceDisplayName({ ...existingPrice, translations: [] })).toBe('1 Week');
    expect(priceDisplayName({ ...existingPrice, translations: [], packageNameEn: null })).toBe('Balanced Living');
  });

  it('maps API translation validation errors to the correct visible inputs', async () => {
    const user = userEvent.setup();
    const body = {
      mealPlanTemplateId: 'plan-1', mealPlanPricePackageId: 'week', mealsPerDay: 3, snacksPerDay: 1,
      currencyCode: 'QAR', amount: 780, effectiveFrom: '2026-08-08T00:00:00Z', effectiveUntil: null, isActive: true,
      translations: existingPrice.translations,
    };
    const requiredError = { isAxiosError: true, response: { data: { errors: [{ code: 'required', field: 'translations[1].name', message: 'Arabic name is required.' }] } } };
    const mappedError = pricingSaveError(requiredError, body);
    expect(mappedError.fields).toEqual({ arabicName: 'Arabic name is required.' });
    expect(pricingSaveError({ isAxiosError: true, response: { data: { errors: [{ code: 'max_length', field: 'translations[0].description', message: 'Maximum length is 500.' }] } } }, body).fields)
      .toEqual({ englishDescription: 'Maximum length is 500.' });
    expect(pricingSaveError({ isAxiosError: true, response: { data: { errors: [{ code: 'duplicate_language', field: 'translations[1].languageCode', message: 'Duplicate language.' }] } } }, body).fields)
      .toEqual({ arabicName: 'Duplicate language.' });
    expect(pricingSaveError({ isAxiosError: true, response: { data: { errors: [{ code: 'invalid_language', message: 'Only en and ar are allowed.' }] } } }, body).fields)
      .toEqual({ englishName: 'Only en and ar are allowed.', arabicName: 'Only en and ar are allowed.' });

    render(<PricingDialog mode="edit" price={existingPrice} {...dialogProps} apiError={mappedError} onSave={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'العربية' }));
    expect(screen.getByText('Arabic name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Arabic Name')).toHaveAttribute('aria-invalid', 'true');
  });
});
