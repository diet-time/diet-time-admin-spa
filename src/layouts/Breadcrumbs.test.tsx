import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('replaces meal-plan record IDs with a friendly edit label', () => {
    const path = '/meal-plans/5fd7d007-47d6-4ce9-8779-42450f4d29a9/edit';
    render(<MemoryRouter initialEntries={[path]}><Breadcrumbs /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Meal Plans' })).toHaveAttribute('href', '/meal-plans');
    expect(screen.getByText('Edit Plan')).toBeInTheDocument();
    expect(screen.queryByText(/5fd7d007/i)).not.toBeInTheDocument();
  });

  it('groups duration administration under Meal Plans', () => {
    render(<MemoryRouter initialEntries={['/admin/durations']}><Breadcrumbs /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Meal Plans' })).toHaveAttribute('href', '/meal-plans');
    expect(screen.getByText('Durations')).toBeInTheDocument();
  });
});
