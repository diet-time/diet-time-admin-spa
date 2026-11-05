import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderWhatsAppHistory } from './OrderWhatsAppHistory';
import { orderWhatsAppApi } from '@/api/orderWhatsAppApi';
vi.mock('@/api/orderWhatsAppApi', () => ({ orderWhatsAppApi: { history: vi.fn() } }));
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><OrderWhatsAppHistory orderId="order" /></QueryClientProvider>); }
beforeEach(() => vi.clearAllMocks());
describe('Order WhatsApp history', () => {
  it('loads within order details on expansion and displays delivery and troubleshooting information', async () => {
    vi.mocked(orderWhatsAppApi.history).mockResolvedValue([{ id: 'notice', notificationType: 'ORDER_APPROVED', recipientPhone: '+97455555555', status: 'READ', providerStatus: 'read', attemptCount: 1, createdAt: '2026-11-05T10:00:00Z', deliveredAt: '2026-11-05T10:00:05Z', readAt: '2026-11-05T10:01:00Z' }]);
    mount(); expect(orderWhatsAppApi.history).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp notification history' }));
    expect(await screen.findByText('ORDER APPROVED')).toBeVisible();
    expect(screen.getByText('read')).toBeVisible(); expect(screen.getByText('Recipient: +97455555555')).toBeVisible();
    expect(orderWhatsAppApi.history).toHaveBeenCalledWith('order');
  });
  it('reports missing configuration without hiding the order', async () => {
    vi.mocked(orderWhatsAppApi.history).mockResolvedValue([{ id: 'notice', notificationType: 'ORDER_RECEIVED', status: 'WAITING_CONFIGURATION', attemptCount: 0, errorMessage: 'Template not configured', createdAt: '2026-11-05T10:00:00Z' }]);
    mount(); fireEvent.click(screen.getByRole('button', { name: 'WhatsApp notification history' }));
    expect(await screen.findByText('Template not configured')).toBeVisible();
    expect(screen.getByText('WAITING CONFIGURATION')).toBeVisible();
  });
  it('provides retry after a history load failure', async () => {
    vi.mocked(orderWhatsAppApi.history).mockRejectedValueOnce(new Error('Network')).mockResolvedValueOnce([]);
    mount(); fireEvent.click(screen.getByRole('button', { name: 'WhatsApp notification history' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry history' }));
    expect(await screen.findByText('No WhatsApp notifications recorded.')).toBeVisible();
  });
});
