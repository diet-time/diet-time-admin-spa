import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';
import '@/i18n';

describe('Breadcrumbs', () => {
  it('names the unified Orders workspace', () => {
    render(<MemoryRouter initialEntries={['/orders']}><Breadcrumbs /></MemoryRouter>);
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.queryByText('Order Approvals')).not.toBeInTheDocument();
  });
  it('names Orders as a direct workspace destination', () => {
    render(<MemoryRouter initialEntries={['/orders/daily']}><Breadcrumbs /></MemoryRouter>);
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.queryByText('Daily Orders')).not.toBeInTheDocument();
  });
  it('replaces meal-plan record IDs with a friendly edit label', () => {
    const path = '/meal-plans/5fd7d007-47d6-4ce9-8779-42450f4d29a9/edit';
    render(<MemoryRouter initialEntries={[path]}><Breadcrumbs /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Meal Plan Templates' })).toHaveAttribute('href', '/meal-plans');
    expect(screen.getByText('Edit Plan')).toBeInTheDocument();
    expect(screen.queryByText(/5fd7d007/i)).not.toBeInTheDocument();
  });

  it('groups duration administration under Master Data', () => {
    render(<MemoryRouter initialEntries={['/admin/durations']}><Breadcrumbs /></MemoryRouter>);
    expect(screen.getByText('Master Data')).toBeInTheDocument();
    expect(screen.getByText('Durations')).toBeInTheDocument();
  });
});
