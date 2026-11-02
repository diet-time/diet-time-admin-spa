import type { ChipProps } from '@mui/material';

export const orderStatusColor = (value: string): ChipProps['color'] => {
  if (['CONFIRMED', 'ACTIVE', 'PAID'].includes(value)) return 'success';
  if (['PENDING_APPROVAL', 'PENDING', 'ON_HOLD', 'UNPAID', 'REFUND_PENDING', 'PAUSED'].includes(value)) return 'warning';
  if (['REJECTED', 'CANCELLED', 'FAILED'].includes(value)) return 'error';
  if (['COMPLETED', 'REFUNDED'].includes(value)) return 'info';
  return 'default';
};
export function formatOrderDate(value?: string, includeTime = false): string {
  if (!value) return 'Not recorded';
  // Date-only values have no browser timezone; keep them on the stored day.
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar', day: 'numeric', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date);
}
