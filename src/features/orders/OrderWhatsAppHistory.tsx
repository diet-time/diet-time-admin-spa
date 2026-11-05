import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, AccordionSummary, AccordionDetails, Alert, Button, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { orderWhatsAppApi } from '@/api/orderWhatsAppApi';
import { formatOrderDate } from './orderPresentation';

export function OrderWhatsAppHistory({ orderId }: { orderId: string }) {
  const [expanded, setExpanded] = useState(false);
  const history = useQuery({ queryKey: ['orderWhatsApp', orderId], queryFn: () => orderWhatsAppApi.history(orderId),
    enabled: expanded, refetchInterval: expanded ? 30000 : false });
  return <Accordion expanded={expanded} onChange={(_, value) => setExpanded(value)} disableGutters elevation={0}
    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&::before': { display: 'none' } }}>
    <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography component="h3" variant="subtitle2" fontWeight={700}>WhatsApp notification history</Typography></AccordionSummary>
    <AccordionDetails>
      <Typography variant="caption" color="text.secondary">Times shown in Qatar time. Message delivery does not change order or payment status.</Typography>
      {history.isPending && <Typography role="status">Loading WhatsApp history...</Typography>}
      {history.isError && <Alert severity="error">Unable to load WhatsApp history. <Button onClick={() => void history.refetch()}>Retry history</Button></Alert>}
      {history.data?.length === 0 && <Typography>No WhatsApp notifications recorded.</Typography>}
      <Stack spacing={2} mt={2}>{history.data?.map(item => <Stack key={item.id} spacing={0.5} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Typography fontWeight={600}>{item.notificationType.replaceAll('_', ' ')}</Typography>
          <Chip size="small" label={(item.providerStatus ?? item.status).replaceAll('_', ' ')}
            color={item.status === 'FAILED' || item.status === 'UNKNOWN' ? 'error' : item.status === 'DELIVERED' || item.status === 'READ' ? 'success' : 'default'} />
        </Stack>
        <Typography variant="body2">Recipient: {item.recipientPhone || 'Not resolved yet'}</Typography>
        <Typography variant="caption">Created: {formatOrderDate(item.createdAt, true)} | Attempts: {item.attemptCount}</Typography>
        {item.deliveredAt && <Typography variant="caption">Delivered: {formatOrderDate(item.deliveredAt, true)}</Typography>}
        {item.readAt && <Typography variant="caption">Read: {formatOrderDate(item.readAt, true)}</Typography>}
        {item.errorMessage && <Alert severity={item.status === 'UNKNOWN' ? 'warning' : 'info'} sx={{ overflowWrap: 'anywhere' }}>{item.errorMessage}</Alert>}
        {item.status === 'UNKNOWN' && <Typography variant="caption">Check the Twilio message log before attempting another send.</Typography>}
      </Stack>)}</Stack>
    </AccordionDetails>
  </Accordion>;
}
