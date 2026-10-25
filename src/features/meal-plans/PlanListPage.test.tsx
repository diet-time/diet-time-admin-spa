import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { plansApi } from '@/api/plansApi';
import { queryClient } from '@/app/queryClient';
import { PlanListPage } from './PlanListPage';

vi.mock('@/api/plansApi', () => ({ plansApi: { list: vi.fn(), get: vi.fn() } }));
vi.mock('@mui/icons-material', () => ({
  EditOutlined: () => null, MenuBookOutlined: () => null, PaidOutlined: () => null,
  VisibilityOutlined: () => null, ErrorOutline: () => null, InboxOutlined: () => null,
}));
afterEach(() => { cleanup(); queryClient.clear(); vi.resetAllMocks(); });

it('lets admin open the live published version separately from its newer draft, regardless of name', async () => {
  const user = userEvent.setup();
  const common = { code: 'PLAN', nameEn: 'Balanced menu', planType: 'STANDARD', durationDays: 24,
    customizable: true, active: true, updatedAt: '2026-10-25', imageUrl: '/image.png' };
  vi.mocked(plansApi.list).mockResolvedValue({ items: [
    { ...common, id: 'draft-id', versionNumber: 4, published: false },
    { ...common, id: 'live-id', versionNumber: 3, published: true },
  ], page: 1, pageSize: 100, totalCount: 2, totalPages: 1 });
  render(<QueryClientProvider client={queryClient}><MemoryRouter><PlanListPage /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByRole('heading', { name: 'Balanced menu' })).toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Template version' }));
  await user.click(screen.getByRole('option', { name: /Version 3.*Published.*live-id/ }));
  expect(screen.getByRole('link', { name: 'View Menu' })).toHaveAttribute('href', '/meal-plans/live-id/edit?view=menu');
  expect(screen.getByText('Version 3 · live-id')).toBeInTheDocument();
});
