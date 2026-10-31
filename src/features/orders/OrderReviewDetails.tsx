import type { ReactNode } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Divider,
  Paper, Stack, Typography, type ChipProps,
} from '@mui/material';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { orderStatusLabel, type StaffOrder } from '@/api/staffOrdersApi';

const paymentLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const statusColor = (value: string): ChipProps['color'] => {
  if (['CONFIRMED', 'ACTIVE', 'PAID'].includes(value)) return 'success';
  if (['PENDING_APPROVAL', 'PENDING', 'ON_HOLD', 'UNPAID', 'REFUND_PENDING', 'PAUSED'].includes(value)) return 'warning';
  if (['REJECTED', 'FAILED'].includes(value)) return 'error';
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
function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <Paper component="section" variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0, height: '100%', boxShadow: 'none' }}>
    <Stack direction="row" alignItems="center" spacing={1} mb={1.5} color="primary.main">
      {icon}<Typography component="h3" variant="subtitle2" fontWeight={700}>{title}</Typography>
    </Stack>{children}
  </Paper>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Box minWidth={0}><Typography variant="caption" color="text.secondary" display="block" mb={0.25}>{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{children}</Typography></Box>;
}
export function OrderReviewDetails({ value }: { value: StaffOrder }) {
  const { order, history = [] } = value;
  const takeaway = order.fulfillmentMethod === 'TAKEAWAY';
  const address = order.delivery.address;
  const structuredAddress = [address?.addressName, address?.buildingNo && `Building ${address.buildingNo}`,
    address?.streetNo && `Street ${address.streetNo}`, address?.zoneNo && `Zone ${address.zoneNo}`, address?.area].filter(Boolean).join(' · ');
  const serviceDates = [...new Set(order.delivery.serviceDates ?? [])].sort();
  const activity = [...history].sort((a, b) => (Date.parse(b.changedAt) || 0) - (Date.parse(a.changedAt) || 0));
  const note = order.review.rejectionReason ?? order.review.holdReason ?? order.review.fulfillmentBlockedReason;
  let total: string;
  try { total = new Intl.NumberFormat('en-QA', { style: 'currency', currency: order.pricing.currencyCode }).format(order.pricing.totalAmount); }
  catch { total = `${order.pricing.currencyCode} ${order.pricing.totalAmount.toFixed(2)}`; }
  return <Stack spacing={2}>
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: '#f3f7f1', boxShadow: 'none' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box minWidth={0}>
          <Typography component="h3" variant="h6" fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{order.plan.name}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{order.mealCount} {order.mealCount === 1 ? 'Meal' : 'Meals'} + {order.snackCount} {order.snackCount === 1 ? 'Snack' : 'Snacks'} · {order.plan.durationName}</Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} mt={1.5}>
            <Chip size="small" color={statusColor(order.status)} label={orderStatusLabel(order.status)} />
            <Chip size="small" variant="outlined" color={statusColor(order.paymentStatus)} label={`Payment: ${paymentLabel(order.paymentStatus)}`} />
          </Stack>
        </Box>
        <Box sx={{ textAlign: { xs: 'start', sm: 'end' }, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">Total amount</Typography>
          <Typography variant="h5" fontWeight={750}>{total}</Typography>
        </Box>
      </Stack>
    </Paper>
    {order.review.awaitingPayment && <Alert severity="warning">Confirmed, awaiting required prepayment. Fulfillment is not authorized.</Alert>}
    {note && <Alert severity="info" sx={{ overflowWrap: 'anywhere' }}>{note}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      <Section title="Customer" icon={<PersonOutlineRounded fontSize="small" />}>
        <Stack spacing={1.5}><Field label="Name">{value.customerName || 'Name not recorded'}</Field><Field label="Phone">{value.customerPhone || 'Phone not recorded'}</Field></Stack>
      </Section>
      <Section title={takeaway ? 'Takeaway' : 'Home Delivery'} icon={takeaway ? <StorefrontOutlined fontSize="small" /> : <LocalShippingOutlined fontSize="small" />}>
        {takeaway ? <Stack spacing={1.5}>
          <Field label="Collection branch">{order.takeawayBranch?.name || 'Branch not recorded'}</Field>
          {order.takeawayBranch?.address && <Field label="Branch address">{order.takeawayBranch.address}</Field>}
        </Stack> : <Stack spacing={1.5}>
          <Field label="Delivery address">{address?.formattedAddress || structuredAddress || 'Address not recorded'}</Field>
          {address?.formattedAddress && structuredAddress && address.formattedAddress !== structuredAddress && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{structuredAddress}</Typography>}
          <Field label="Delivery time">{order.delivery.timeSlot?.name || 'Time slot not recorded'}</Field>
        </Stack>}
      </Section>
    </Box>
    <Section title="Service schedule" icon={<CalendarMonthOutlined fontSize="small" />}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        <Field label="Start date">{formatOrderDate(order.delivery.startDate)}</Field><Field label="End date">{formatOrderDate(order.delivery.endDate)}</Field>
      </Box>
      {serviceDates.length ? <Accordion disableGutters elevation={0} sx={{ mt: 1.5, '&::before': { display: 'none' }, bgcolor: 'transparent' }}>
        <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: 0, minHeight: 42, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}>
          <Typography variant="body2" fontWeight={600}>Service dates</Typography><Chip size="small" label={`${serviceDates.length} scheduled`} />
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pb: 0 }}>
          <Box component="ul" aria-label="Scheduled service dates" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1, p: 0, m: 0, listStyle: 'none' }}>
            {serviceDates.map(date => <Box component="li" key={date} sx={{ px: 1.25, py: 1, bgcolor: '#f5f7f4', borderRadius: 1 }}><Typography variant="body2">{formatOrderDate(date)}</Typography></Box>)}
          </Box>
        </AccordionDetails>
      </Accordion> : <Typography variant="body2" color="text.secondary" mt={1.5}>No service dates recorded.</Typography>}
    </Section>
    <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&::before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}>
        <HistoryRounded fontSize="small" color="primary" /><Typography component="h3" variant="subtitle2" fontWeight={700}>Activity history</Typography><Chip size="small" label={activity.length} />
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>Times shown in Qatar time</Typography>
        {!activity.length && <Typography variant="body2" color="text.secondary">No activity recorded.</Typography>}
        <Stack spacing={2} divider={<Divider />}>
          {activity.map(entry => {
            const paymentChanged = entry.paymentStatus && entry.previousPaymentStatus !== entry.paymentStatus;
            const statusChanged = entry.previousStatus && entry.previousStatus !== entry.status;
            return <Box key={entry.id} sx={{ pl: 1.5, borderLeft: '3px solid', borderColor: paymentChanged ? 'success.light' : 'primary.light', minWidth: 0 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5}>
                <Typography variant="body2" fontWeight={700}>{statusChanged ? `${orderStatusLabel(entry.previousStatus!)} → ${orderStatusLabel(entry.status)}` : paymentChanged ? 'Payment updated' : orderStatusLabel(entry.status)}</Typography>
                <Typography component="time" dateTime={entry.changedAt} variant="caption" color="text.secondary">{formatOrderDate(entry.changedAt, true)}</Typography>
              </Stack>
              {entry.paymentStatus && <Typography variant="body2" color="text.secondary" mt={0.5}>Payment: {paymentChanged && entry.previousPaymentStatus ? `${paymentLabel(entry.previousPaymentStatus)} → ` : ''}{paymentLabel(entry.paymentStatus)}</Typography>}
              {entry.reason && <Typography variant="body2" mt={0.5} sx={{ overflowWrap: 'anywhere' }}>{entry.reason}</Typography>}
              <Box component="details" sx={{ mt: 1, color: 'text.secondary', fontSize: 12 }}>
                <Box component="summary" sx={{ cursor: 'pointer', width: 'fit-content' }}>Internal audit details</Box>
                <Typography variant="caption" display="block" sx={{ overflowWrap: 'anywhere' }}>Actor ID: {entry.changedBy || 'Legacy record'}</Typography>
                <Typography variant="caption" display="block" sx={{ overflowWrap: 'anywhere' }}>History ID: {entry.id}</Typography>
              </Box>
            </Box>;
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  </Stack>;
}
