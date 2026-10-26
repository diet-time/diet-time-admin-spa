import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { plansApi } from '@/api/plansApi';
import { packageOptionsApi, subscriptionPricingApi, type MealPlanPrice } from '@/api/subscriptionConfigurationApi';
import { SubscriptionPlanPricingPage } from './SubscriptionPlanPricingPage';

vi.mock('@/api/plansApi', () => ({ plansApi: { list: vi.fn() } }));
vi.mock('@/api/subscriptionConfigurationApi', () => ({
  packageOptionsApi: { list: vi.fn() }, subscriptionPricingApi: { list: vi.fn(), durations: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn() },
}));
vi.mock('@mui/icons-material', () => ({ Add: () => null, EditOutlined: () => null, ToggleOffOutlined: () => null,
  ToggleOnOutlined: () => null, InfoOutlined: () => null, ErrorOutline: () => null, InboxOutlined: () => null }));
const paged = <T,>(items: T[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 });
beforeEach(() => {
  queryClient.clear(); vi.resetAllMocks();
  const common = { code: 'BALANCE', nameEn: 'Complete Balance', planType: 'STANDARD', durationDays: 24,
    customizable: true, active: true, updatedAt: '' };
  vi.mocked(plansApi.list).mockResolvedValue(paged([
    { ...common, id: 'live-id', published: true, versionNumber: 3 },
    { ...common, id: 'draft-id', published: false, versionNumber: 4 },
  ]));
  vi.mocked(subscriptionPricingApi.durations).mockResolvedValue([{ id: 'WEEK', name: 'One Week', durationDays: 6 }]);
  vi.mocked(packageOptionsApi.list).mockResolvedValue(paged([{ id: 'package-id', name: 'Three meals', mealCount: 3, snackCount: 1, displayOrder: 1, isActive: true }]));
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged(Array.from({ length: 13 }, (_, index) => ({
    id: `price-${index}`, mealPlanId: 'live-id', mealPlanName: 'Complete Balance', durationId: 'WEEK',
    durationName: 'One Week', packageOptionId: `package-${index}`, packageOptionName: `Package ${index}`,
    mealCount: 3, snackCount: 1, price: 700 + index, currency: 'QAR', isActive: true, serviceDays: 6, isAvailable: true,
  }))));
  vi.mocked(subscriptionPricingApi.create).mockResolvedValue({ id: 'new-price' });
});
afterEach(() => { cleanup(); queryClient.clear(); });
const mount = () => render(<QueryClientProvider client={queryClient}><SubscriptionPlanPricingPage /></QueryClientProvider>);

it('shows all 13 configured combinations with counts and delivery days without creating prices', async () => {
  mount();
  expect(await screen.findByText('13 prices')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(14);
  expect(screen.queryByText('live-id')).not.toBeInTheDocument();
  expect(screen.queryByText('3 meals + 1 snacks per day')).not.toBeInTheDocument();
  expect(screen.getAllByText('One Week')).toHaveLength(13);
  expect(subscriptionPricingApi.create).not.toHaveBeenCalled();
});

it('saves the selected plan ID, duration code, package ID and explicit price', async () => {
  const user = userEvent.setup(); mount();
  await screen.findByText('13 prices');
  await user.click(screen.getByRole('button', { name: 'Add Price' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('combobox', { name: /Meal Plan/ }));
  await user.click(screen.getByRole('option', { name: /Version 3.*Published/ }));
  await user.click(dialog.getByRole('combobox', { name: /Duration/ }));
  await user.click(screen.getByRole('option', { name: 'One Week' }));
  await user.click(dialog.getByRole('combobox', { name: /Package Option/ }));
  await user.click(screen.getByRole('option', { name: 'Three meals' }));
  await user.type(dialog.getByRole('spinbutton', { name: /Regular Price/ }), '715');
  await user.click(dialog.getByRole('button', { name: 'Save Price' }));
  await waitFor(() => expect(subscriptionPricingApi.create).toHaveBeenCalledWith({
    mealPlanId: 'live-id', durationId: 'WEEK', packageOptionId: 'package-id', price: 715, discountedPrice: null, currency: 'QAR', isActive: true,
  }));
});

const legacyPrice: MealPlanPrice = {
  id: 'legacy-price', mealPlanId: 'old-version', mealPlanName: 'Complete Balance',
  durationId: '', durationName: 'Missing duration mapping', packageOptionId: '', packageOptionName: 'Missing package mapping',
  price: 120, currency: 'QAR', isActive: true, isAvailable: false,
};

it('deactivates a price with missing mappings and refreshes the list without a full update', async () => {
  const user = userEvent.setup();
  vi.mocked(subscriptionPricingApi.list).mockResolvedValueOnce(paged([legacyPrice]))
    .mockResolvedValue(paged([{ ...legacyPrice, isActive: false }]));
  let finish!: () => void;
  vi.mocked(subscriptionPricingApi.setStatus).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  mount();
  await user.click(await screen.findByRole('button', { name: 'Deactivate Missing package mapping price' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
  expect(subscriptionPricingApi.setStatus).toHaveBeenCalledWith('legacy-price', false);
  expect(subscriptionPricingApi.update).not.toHaveBeenCalled();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Saving…' })).toBeDisabled();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await act(async () => finish());
  expect(await screen.findByRole('button', { name: 'Activate Missing package mapping price' })).toBeInTheDocument();
  expect(subscriptionPricingApi.list).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/not currently offered/)).not.toBeInTheDocument();
});

it('also allows a status-only edit to deactivate a price with missing mappings', async () => {
  const user = userEvent.setup();
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged([legacyPrice]));
  vi.mocked(subscriptionPricingApi.setStatus).mockResolvedValue(undefined);
  mount();
  await user.click(await screen.findByRole('button', { name: 'Edit Missing package mapping price' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByLabelText('Active'));
  await user.click(dialog.getByRole('button', { name: 'Save Price' }));
  await waitFor(() => expect(subscriptionPricingApi.setStatus).toHaveBeenCalledWith('legacy-price', false));
  expect(subscriptionPricingApi.update).not.toHaveBeenCalled();
});

it('shows the actual API error in the status dialog and clears it when reopened', async () => {
  const user = userEvent.setup();
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged([legacyPrice]));
  vi.mocked(subscriptionPricingApi.setStatus).mockRejectedValue({ isAxiosError: true, response: {
    status: 403, data: { errors: [{ message: 'You do not have permission to change prices.' }] },
  } });
  mount();
  await user.click(await screen.findByRole('button', { name: 'Deactivate Missing package mapping price' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('You do not have permission to change prices.');
  expect(screen.queryByText(/It may duplicate/)).not.toBeInTheDocument();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  await user.click(await screen.findByRole('button', { name: 'Deactivate Missing package mapping price' }));
  expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument();
});

it('summarizes availability once and shows mapping details on demand', async () => {
  const user = userEvent.setup();
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged([
    legacyPrice, { ...legacyPrice, id: 'inactive-price', packageOptionName: 'Inactive package', isActive: false },
  ]));
  mount();
  expect(await screen.findByText(/1 active price is not currently offered/)).toBeInTheDocument();
  expect(screen.queryByText('Unavailable to customers')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Availability details for Inactive package' })).not.toBeInTheDocument();
  await user.hover(screen.getByRole('button', { name: 'Availability details for Missing package mapping' }));
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Choose a package option in Edit Price');
});

const discountedFixture: MealPlanPrice = {
  id: 'discount-price', mealPlanId: 'live-id', mealPlanName: 'Complete Balance', durationId: 'WEEK',
  durationName: 'One Week', packageOptionId: 'package-id', packageOptionName: 'Three meals',
  price: 999, discountedPrice: 799, effectivePrice: 799, discountAmount: 200, discountPercentage: 20.02,
  currency: 'QAR', isActive: true, serviceDays: 6, isAvailable: true,
};

it('shows the effective listing price and saves an updated discount without altering regular price', async () => {
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged([discountedFixture]));
  const user = userEvent.setup(); mount();
  await user.click(await screen.findByRole('button', { name: 'Edit Three meals price' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByRole('spinbutton', { name: /Regular Price/ })).toHaveValue(999);
  const input = dialog.getByRole('spinbutton', { name: /Discounted Price/ });
  await user.clear(input); await user.type(input, '699');
  expect(dialog.getByText(/Customer Saves/)).toHaveTextContent('300');
  await user.click(dialog.getByRole('button', { name: 'Save Price' }));
  await waitFor(() => expect(subscriptionPricingApi.update).toHaveBeenCalledWith('discount-price', expect.objectContaining({ price: 999, discountedPrice: 699 })));
});

it('clears an existing discount by explicitly submitting null', async () => {
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged([discountedFixture]));
  const user = userEvent.setup(); mount();
  await user.click(await screen.findByRole('button', { name: 'Edit Three meals price' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.clear(dialog.getByRole('spinbutton', { name: /Discounted Price/ }));
  await user.click(dialog.getByRole('button', { name: 'Save Price' }));
  await waitFor(() => expect(subscriptionPricingApi.update).toHaveBeenCalledWith('discount-price', expect.objectContaining({ price: 999, discountedPrice: null })));
});

it('blocks a discount equal to the regular price with a clear error', async () => {
  vi.mocked(subscriptionPricingApi.list).mockResolvedValue(paged([discountedFixture]));
  const user = userEvent.setup(); mount();
  await user.click(await screen.findByRole('button', { name: 'Edit Three meals price' }));
  const dialog = within(screen.getByRole('dialog'));
  const input = dialog.getByRole('spinbutton', { name: /Discounted Price/ });
  await user.clear(input); await user.type(input, '999');
  await user.click(dialog.getByRole('button', { name: 'Save Price' }));
  expect(dialog.getByText('Discounted price must be lower than regular price.')).toBeInTheDocument();
  expect(subscriptionPricingApi.update).not.toHaveBeenCalled();
});
