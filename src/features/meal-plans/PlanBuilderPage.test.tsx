import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { plansApi, type PlanDetail } from '@/api/plansApi';
import { masterDataApi } from '@/api/masterDataApi';
import { mealsApi } from '@/api/mealsApi';
import { queryClient } from '@/app/queryClient';
import '@/i18n';
import { PlanBuilderPage } from './PlanBuilderPage';

vi.mock('@/api/plansApi', () => ({ plansApi: { get: vi.fn(), validateMenu: vi.fn(), update: vi.fn() } }));
vi.mock('@/api/masterDataApi', () => ({ masterDataApi: { list: vi.fn() } }));
vi.mock('@/api/mealsApi', () => ({ mealsApi: { list: vi.fn() } }));
vi.mock('@mui/icons-material', () => ({
  Add: () => null, Close: () => null, CloudUploadOutlined: () => null,
  ContentCopy: () => null, DeleteOutline: () => null, DragIndicator: () => null,
  ErrorOutline: () => null, InboxOutlined: () => null,
}));

const meal4Id = '1b8520ba-f071-4bed-b1c8-920ccff0dbb8';
const makePlan = (): PlanDetail => ({
  id: 'published', versionGroupId: 'group', versionNumber: 3, isLatest: true, cycleWeeks: 4,
  code: 'BALANCE', planType: 'STANDARD', durationDays: 24, isCustomizable: true,
  isPublished: true, isActive: true, translations: [{ languageCode: 'en', name: 'Balance' }],
  days: [1, 2].map((weekNumber) => ({
    id: `day-${weekNumber}`, templateId: 'published', menuWeekday: 'THURSDAY', weekNumber,
    displayOrder: 6, isActive: true, slotCount: 1,
    slots: [{ id: `slot-${weekNumber}`, mealTypeId: meal4Id, mealTypeName: 'Meal 4', displayOrder: 4,
      minimumSelection: 1, maximumSelection: 1, isRequired: true, isActive: true, options: [] }],
  })),
});

const mount = (query = '?week=2') => render(<QueryClientProvider client={queryClient}>
  <MemoryRouter initialEntries={[`/meal-plans/published/edit${query}`]}><Routes>
    <Route path="/meal-plans/:planId/edit" element={<PlanBuilderPage />} />
  </Routes></MemoryRouter>
</QueryClientProvider>);

describe('saved menu slots', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
    vi.mocked(plansApi.get).mockResolvedValue(makePlan());
    vi.mocked(plansApi.validateMenu).mockResolvedValue({ templateId: 'published', versionGroupId: 'group', versionNumber: 3, isLatest: true, isPublished: true, weeks: [] });
    vi.mocked(masterDataApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 1 });
    vi.mocked(mealsApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });
  });
  afterEach(() => { cleanup(); queryClient.clear(); });

  it('shows package capacity warnings for every saved week', async () => {
    vi.mocked(plansApi.validateMenu).mockResolvedValue({ templateId: 'published', versionGroupId: 'group', versionNumber: 3, isLatest: true, isPublished: true,
      weeks: [{ weekNumber: 1, isComplete: false, errors: [{ weekNumber: 1, code: 'INSUFFICIENT_PACKAGE_OPTIONS', message: 'Week 1 needs 5 distinct regular dishes and 1 snack.' }] }] });
    mount();
    expect(await screen.findByText('Package capacity:')).toBeInTheDocument();
    expect(screen.getByText(/Week 1 needs 5 distinct regular dishes and 1 snack/)).toBeInTheDocument();
  });

  it('renders persisted Meal 4 in the assigned week even without lookup data or options', async () => {
    mount();
    expect(await screen.findByText('Meal 4')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Week 2/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Active slot')).toBeChecked();
    expect(screen.getByText('No selectable meals yet')).toBeInTheDocument();
    expect(screen.getByText(/Template published.*Version 3.*Published/)).toBeInTheDocument();
  });

  it('saves removals across weeks and rehydrates from the saved version', async () => {
    const user = userEvent.setup();
    const saved = makePlan();
    saved.id = 'draft'; saved.versionNumber = 4; saved.isPublished = false;
    for (const day of saved.days) { day.templateId = 'draft'; day.slots[0]!.isActive = false; }
    vi.mocked(plansApi.update).mockResolvedValue({ id: 'draft', createdDraft: true });
    vi.mocked(plansApi.get).mockImplementation(async (id) => id === 'draft' ? saved : makePlan());
    mount();
    await screen.findByText('Meal 4');
    await user.click(screen.getByRole('button', { name: 'Remove slot from menu' }));
    await user.click(screen.getByRole('tab', { name: /Week 1/ }));
    await user.click(screen.getByRole('button', { name: 'Remove slot from menu' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(plansApi.update).toHaveBeenCalled());
    const input = vi.mocked(plansApi.update).mock.calls[0]![1];
    expect(input.weekNumber).toBeUndefined();
    expect(input.days).toHaveLength(2);
    expect(input.days?.every((day) => day.slots[0]!.isActive === false)).toBe(true);
    expect(await screen.findByText(/Template draft.*Version 4.*Draft/)).toBeInTheDocument();
    expect(screen.getByLabelText('Active slot')).not.toBeChecked();
  });

  it('shows inactive slots and prevents saving a historical version', async () => {
    const historical = makePlan(); historical.isLatest = false; historical.days[1]!.slots[0]!.isActive = false;
    vi.mocked(plansApi.get).mockResolvedValue(historical);
    mount();
    expect(await screen.findByText('Meal 4')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Active slot')).toBeDisabled();
  });
});
