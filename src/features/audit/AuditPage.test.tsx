import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { auditApi } from '@/api/auditApi';
import { AuditPage } from './AuditPage';
vi.mock('@/api/auditApi', () => ({ auditApi: { list: vi.fn() } }));
const page = { items: [{ id: 'audit-1', entityType: 'StaffOrders', entityId: 'order-1', action: 'Approve', changedBy: 'Biju', userId: 'user-1', changedAt: '2026-10-30T22:00:00Z', source: 'REACT_ADMIN', outcome: 'SUCCEEDED', statusCode: 200, httpMethod: 'POST', endpoint: 'api/admin/orders/{orderId}/approve', correlationId: 'trace-1', targets: [{type:'orderId',id:'order-1'}] }], page: 1, pageSize: 25, totalCount: 1, totalPages: 1 };
const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuditPage /></QueryClientProvider>);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(auditApi.list).mockResolvedValue(page); });
describe('Audit history', () => {
  it('shows the user, action, client, result and affected record without editing controls', async () => {
    renderPage();
    expect(await screen.findByText('Biju')).toBeInTheDocument();
    expect(screen.getByText('React Admin')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('SUCCEEDED · 200')).toBeInTheDocument();
    expect(screen.getByText('orderId: order-1')).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-10-30T22:00:00Z').toLocaleString('en-QA', {timeZone:'Asia/Qatar'}))).toBeInTheDocument();
    expect(screen.queryByRole('button', {name:/delete|edit/i})).not.toBeInTheDocument();
  });
  it('applies user and Qatar-date filters together rather than logging every keystroke', async () => {
    renderPage(); await screen.findByText('Biju');
    fireEvent.change(screen.getByLabelText('User name or ID'), {target:{value:'Biju'}});
    fireEvent.change(screen.getByLabelText('From'), {target:{value:'2026-10-31'}});
    fireEvent.change(screen.getByLabelText('Until'), {target:{value:'2026-10-31'}});
    expect(auditApi.list).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name:'Apply filters'}));
    await waitFor(() => expect(auditApi.list).toHaveBeenLastCalledWith(expect.objectContaining({user:'Biju',from:'2026-10-31',until:'2026-10-31',page:1}),expect.anything()));
  });
  it('shows retryable errors instead of an empty history', async () => {
    vi.mocked(auditApi.list).mockRejectedValue(new Error('Unavailable'));
    renderPage();
    expect(await screen.findByText(/Unable to load audit history/)).toBeInTheDocument();
    expect(screen.queryByText('No audit records found')).not.toBeInTheDocument();
  });
});
