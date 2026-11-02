import { useRef, useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { useAuthStore } from '@/app/store/authStore';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { isFutureServiceDate } from '../fulfillment';

export function FulfillmentControl({ serviceDayId, fulfillmentMethod, fulfillmentStatus, fulfilledAt, date, customerName, orderNumber, isOverdue, staffDisplayName, onSuccess }: {
  serviceDayId?: string; fulfillmentMethod?: string; fulfillmentStatus: string; fulfilledAt?: string; date: string;
  customerName?: string; orderNumber?: string; isOverdue?: boolean; staffDisplayName?: string; onSuccess?: (message: string) => void;
}) {
  const client = useQueryClient();
  const roles = useAuthStore(state => state.user?.roles);
  const canConfirm = !!roles?.includes('Admin') && canWriteFromPath(window.location.pathname);
  const future = isFutureServiceDate(date);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ status: string; fulfilledAt?: string; staffDisplayName?: string }>();
  const submitting = useRef(false);
  const status = result?.status ?? fulfillmentStatus;
  const timestamp = result?.fulfilledAt ?? fulfilledAt;
  const target = fulfillmentMethod === 'TAKEAWAY' ? 'COLLECTED' : 'DELIVERED';
  const label = target === 'COLLECTED' ? 'Collected' : 'Delivered';
  const confirmation = target === 'COLLECTED' ? 'Confirm Collection' : 'Confirm Delivery';

  const complete = async () => {
    if (submitting.current || !serviceDayId || !canConfirm || isFutureServiceDate(date)) return;
    submitting.current = true;
    setPending(true);
    setError(undefined);
    try {
      setResult(await deliveryCalendarApi.fulfill(serviceDayId, target));
      setConfirming(false);
      onSuccess?.(`${orderNumber ?? 'Service day'} marked as ${label.toLowerCase()}.`);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['delivery-calendar-detail', date] }),
        client.invalidateQueries({ queryKey: ['delivery-preparation-summary', date] }),
        client.invalidateQueries({ queryKey: ['delivery-calendar'] }),
      ]);
    } catch (failure) {
      setError(isAxiosError(failure) ? failure.response?.data?.detail ?? 'Unable to update fulfillment. Please try again.' : 'Unable to update fulfillment. Please try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  if (status === 'DELIVERED' || status === 'COLLECTED') return <Stack spacing={0.5} alignItems="flex-start">
    <Chip size="small" color="success" label={status === 'DELIVERED' ? 'Delivered' : 'Collected'} />
    {timestamp && <Typography variant="caption">{new Date(timestamp).toLocaleString('en-QA', { timeZone: 'Asia/Qatar' })} (Qatar)</Typography>}
    {(result?.staffDisplayName ?? staffDisplayName) && <Typography variant="caption">{result?.staffDisplayName ?? staffDisplayName}</Typography>}
  </Stack>;
  if (!serviceDayId) return <Typography variant="caption">Service day needs review</Typography>;
  if (status !== 'SCHEDULED') return <Chip size="small" label={status.replaceAll('_', ' ')} />;
  return <>
    <Stack spacing={0.5} alignItems="flex-start"><Chip size="small" label={isOverdue ? 'Overdue' : 'Scheduled'} color={isOverdue ? 'error' : 'default'} />
      {canConfirm && !future && <Button size="small" disabled={pending} onClick={() => { setError(undefined); setConfirming(true); }}>Mark as {label}</Button>}
      {canConfirm && future && <Typography variant="caption" color="text.secondary">Available on the service date</Typography>}
    </Stack>
    <Dialog open={confirming} onClose={() => { if (!pending) setConfirming(false); }} aria-labelledby={`fulfillment-${serviceDayId}`}>
      <DialogTitle id={`fulfillment-${serviceDayId}`}>Mark as {label}?</DialogTitle>
      <DialogContent>
        <Typography fontWeight={700}>{customerName ?? 'Name not recorded'}</Typography>
        <Typography variant="body2">{orderNumber} · {date} · {target === 'COLLECTED' ? 'Takeaway' : 'Home Delivery'}</Typography>
        <DialogContentText sx={{ mt: 1 }}>{target === 'COLLECTED' ? 'Confirm that this order was collected by the customer?' : 'Confirm that this order was delivered to the customer?'}</DialogContentText>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions><Button disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button><Button variant="contained" disabled={pending} onClick={() => void complete()}>{pending ? 'Saving…' : confirmation}</Button></DialogActions>
    </Dialog>
  </>;
}
