import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Alert, Box, Button, Chip, Divider, Drawer, IconButton, Stack, TextField, Typography } from '@mui/material';
import { packageRequestsApi, type PackageRequest } from '@/api/packageRequestsApi';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { toast } from '@/app/store/toastStore';
import { formatOrderDate } from './orderPresentation';

const errorText = (error: unknown) => {
  const value = error as { response?: { data?: { detail?: string } }; message?: string };
  return value.response?.data?.detail ?? value.message ?? 'Unable to review the request.';
};

export function PackageRequestReview({ value, onClose }: { value: PackageRequest; onClose: () => void }) {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const cache = useQueryClient();
  const pause = value.request.type === 'PAUSE';
  const canWrite = canWriteFromPath('/orders');
  const mutation = useMutation({
    mutationFn: () => packageRequestsApi.review(value.request.id, decision === 'approve', reason),
    onSuccess: async () => {
      toast.success(`${pause ? 'Pause' : 'Resume'} request ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['packageRequests'] }),
        cache.invalidateQueries({ queryKey: ['staffOrders'] }),
        cache.invalidateQueries({ queryKey: ['dashboard', 'operations'] }),
      ]);
      onClose();
    },
  });
  const close = () => { if (!mutation.isPending) onClose(); };
  return <Drawer anchor="right" open onClose={close} slotProps={{ paper: {
    role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'package-request-title',
    sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%', display: 'flex', overflow: 'hidden' },
  } }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" p={2.5} gap={1}>
      <Box><Typography id="package-request-title" component="h2" variant="h3">Review {pause ? 'pause' : 'resume'} request</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{value.orderNumber}</Typography></Box>
      <IconButton aria-label="Close request details" disabled={mutation.isPending} onClick={close}><CloseRounded /></IconButton>
    </Stack>
    <Divider />
    <Stack spacing={2.5} p={2.5} sx={{ flex: 1, overflowY: 'auto', overflowWrap: 'anywhere' }}>
      <Chip label="Awaiting review" color="warning" size="small" sx={{ alignSelf: 'flex-start' }} />
      <Box><Typography fontWeight={750}>{value.customerName}</Typography><Typography variant="body2" color="text.secondary">{value.planName}</Typography></Box>
      <Box><Typography variant="overline">Requested schedule</Typography>
        {value.request.pauseStartDate && <Typography variant="body2">Pause from: {formatOrderDate(value.request.pauseStartDate)}</Typography>}
        <Typography variant="body2">Resume on: {formatOrderDate(value.request.resumeDate)}</Typography>
        <Typography variant="body2">Proposed package end: {formatOrderDate(value.request.projectedEndDate)}</Typography>
      </Box>
      <Box><Typography fontWeight={700} variant="body2">Customer reason</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{value.request.reason || 'No reason provided'}</Typography></Box>
      <Typography variant="caption" color="text.secondary">Submitted {formatOrderDate(value.request.createdAt, true)} · Qatar time</Typography>
      <Alert severity="info">The current package and deliveries stay unchanged until approval. Approval rechecks delivery cutoffs and committed deliveries before updating the schedule.</Alert>
      {!canWrite && <Alert severity="info">Orders write permission is required to review this request.</Alert>}
      {decision && <Stack spacing={2}>
        <Typography fontWeight={700}>{decision === 'approve' ? 'Confirm approval' : 'Reject request'}</Typography>
        <TextField label={decision === 'approve' ? 'Review notes (optional)' : 'Reason (required)'} value={reason}
          onChange={event => setReason(event.target.value)} disabled={mutation.isPending} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500 } }} />
        {mutation.isError && <Alert severity="error">{errorText(mutation.error)} Review the dates before trying again.</Alert>}
      </Stack>}
    </Stack>
    <Divider />
    <Stack direction="row" gap={1} p={2.5} justifyContent="flex-end" flexWrap="wrap">
      {canWrite && (decision ? <>
        <Button disabled={mutation.isPending} onClick={() => { setDecision(null); mutation.reset(); }}>Back</Button>
        <Button variant="contained" color={decision === 'reject' ? 'error' : 'primary'}
          disabled={mutation.isPending || (decision === 'reject' && !reason.trim())}
          onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : decision === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</Button>
      </> : <>
        <Button color="error" variant="outlined" onClick={() => { setReason(''); setDecision('reject'); }}>Reject</Button>
        <Button variant="contained" onClick={() => { setReason(''); setDecision('approve'); }}>Approve {pause ? 'pause' : 'resume'}</Button>
      </>)}
      {!canWrite && <Button onClick={close}>Close</Button>}
    </Stack>
  </Drawer>;
}
