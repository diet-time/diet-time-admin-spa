import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { plansApi } from '@/api/plansApi';
import { packageOptionsApi, subscriptionPricingApi } from '@/api/subscriptionConfigurationApi';
import { SubscriptionPlanPricingPage } from './SubscriptionPlanPricingPage';

vi.mock('@/api/plansApi', () => ({ plansApi: { list: vi.fn() } }));
vi.mock('@/api/subscriptionConfigurationApi', () => ({
  packageOptionsApi: { list: vi.fn() }, subscriptionPricingApi: { list: vi.fn(), durations: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('@mui/icons-material', () => ({ Add: () => null, EditOutlined: () => null, ToggleOffOutlined: () => null,
  ToggleOnOutlined: () => null, ErrorOutline: () => null, InboxOutlined: () => null }));
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
  expect(await screen.findByText(/13 configured price combinations/)).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(14);
  expect(screen.getAllByText('3 meals + 1 snacks per day')).toHaveLength(13);
  expect(screen.getAllByText('One Week · 6 delivery days')).toHaveLength(13);
  expect(subscriptionPricingApi.create).not.toHaveBeenCalled();
});

it('saves the selected plan ID, duration code, package ID and explicit price', async () => {
  const user = userEvent.setup(); mount();
  await screen.findByText(/13 configured price combinations/);
  await user.click(screen.getByRole('button', { name: 'Add Price' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('combobox', { name: /Meal Plan/ }));
  await user.click(screen.getByRole('option', { name: /Version 3.*Published.*live-id/ }));
  await user.click(dialog.getByRole('combobox', { name: /Duration/ }));
  await user.click(screen.getByRole('option', { name: 'One Week' }));
  await user.click(dialog.getByRole('combobox', { name: /Package Option/ }));
  await user.click(screen.getByRole('option', { name: 'Three meals' }));
  await user.type(dialog.getByRole('spinbutton', { name: /Price/ }), '715');
  await user.click(dialog.getByRole('button', { name: 'Save Price' }));
  await waitFor(() => expect(subscriptionPricingApi.create).toHaveBeenCalledWith({
    mealPlanId: 'live-id', durationId: 'WEEK', packageOptionId: 'package-id', price: 715, currency: 'QAR', isActive: true,
  }));
});
