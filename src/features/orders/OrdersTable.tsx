import { ArrowForwardRounded, Inventory2Outlined, LocalShippingOutlined, ReceiptLongOutlined, StorefrontOutlined } from '@mui/icons-material';
import { Box, Button, Card, Chip, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { approvalFilterStatus, approvalStatusLabel, type StaffOrder } from '@/api/staffOrdersApi';
import { formatOrderDate, orderStatusColor } from './orderPresentation';

export function OrdersTable({ rows, total, loading, daily, onReview }: {
  rows: StaffOrder[]; total: number; loading: boolean; daily: boolean; onReview: (row: StaffOrder) => void;
}) {
  return <Card sx={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(23,53,45,.04)' }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} px={2.5} py={2} borderBottom="1px solid" borderColor="divider">
      <Stack direction="row" gap={1.25} alignItems="center">
        <Box sx={{ p: 1, display: 'flex', borderRadius: '10px', bgcolor: '#EAF4ED', color: 'primary.main' }}><ReceiptLongOutlined fontSize="small" /></Box>
        <Box><Typography component="h3" variant="subtitle1" fontWeight={800}>Customer orders</Typography><Typography variant="caption" color="text.secondary">Review bookings, service schedules and payment records</Typography></Box>
      </Stack>
      <Chip variant="outlined" size="small" label={`${total} ${total === 1 ? 'order' : 'orders'}`} sx={{ fontWeight: 700, bgcolor: '#F6F9F6' }} />
    </Stack>
    <TableContainer><Table size="small" aria-label="Orders awaiting staff review" sx={{ minWidth: 1050, '& th': { bgcolor: '#F6F8F6', color: 'text.secondary', fontSize: 11, fontWeight: 750, py: 1.5, whiteSpace: 'nowrap' }, '& td': { py: 2, borderColor: '#EEF2EF', verticalAlign: 'middle' }, '& tbody tr:last-child td': { borderBottom: 0 } }}>
      <TableHead><TableRow>{['Order / created (Qatar)', 'Customer', 'Plan / package', 'Service dates', 'Fulfillment', 'Total', 'Payment', 'Approval', ''].map(heading => <TableCell key={heading}>{heading}</TableCell>)}</TableRow></TableHead>
      <TableBody>{rows.map(row => {
        const { order } = row;
        const takeaway = order.fulfillmentMethod === 'TAKEAWAY';
        const address = order.delivery.address;
        const location = takeaway ? order.takeawayBranch?.name ?? 'Branch not recorded' : address?.formattedAddress || [address?.addressName, address?.area].filter(Boolean).join(', ') || 'Address not recorded';
        const payment = order.paymentStatus.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
        return <TableRow key={order.id} hover sx={{ '&:hover': { bgcolor: '#FAFCFA' } }}>
          <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="body2" fontWeight={750}>{order.orderNumber}</Typography><Typography variant="caption" color="text.secondary">{formatOrderDate(order.placedAt, true)}</Typography></TableCell>
          <TableCell><Typography variant="body2" fontWeight={700}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{row.customerPhone ?? 'Phone unavailable'}</Typography></TableCell>
          <TableCell sx={{ minWidth: 170 }}><Typography variant="body2" fontWeight={650}>{order.plan.name}</Typography><Typography variant="caption" color="text.secondary">{order.mealCount} meals + {order.snackCount} snacks · {order.plan.durationName}</Typography></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="body2">{formatOrderDate(order.delivery.startDate)}</Typography><Typography variant="caption" color="text.secondary">to {formatOrderDate(order.delivery.endDate)}</Typography></TableCell>
          <TableCell sx={{ maxWidth: 230, minWidth: 150 }}><Stack direction="row" alignItems="center" gap={0.75} mb={0.25} color="primary.main">{takeaway ? <StorefrontOutlined sx={{ fontSize: 16 }} /> : <LocalShippingOutlined sx={{ fontSize: 16 }} />}<Typography variant="body2" fontWeight={650}>{takeaway ? 'Takeaway' : 'Home Delivery'}</Typography></Stack><Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: 'anywhere' }}>{location}</Typography>{!takeaway && order.delivery.timeSlot?.name && <Typography variant="caption" color="text.secondary">{order.delivery.timeSlot.name}</Typography>}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="body2" fontWeight={750}>{order.pricing.currencyCode} {order.pricing.totalAmount.toLocaleString('en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
          <TableCell><Chip size="small" variant="outlined" label={payment} color={orderStatusColor(order.paymentStatus)} sx={{ fontSize: 11, fontWeight: 650 }} /></TableCell>
          <TableCell><Chip size="small" label={approvalStatusLabel(order.status)} color={orderStatusColor(approvalFilterStatus(order.status) || order.status)} sx={{ fontSize: 11, fontWeight: 650 }} /></TableCell>
          <TableCell><Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: '16px !important' }} />} onClick={() => onReview(row)} sx={{ whiteSpace: 'nowrap' }}>{daily && ['PENDING_APPROVAL', 'PENDING'].includes(order.status) ? 'Review / Approve' : 'Review'}</Button></TableCell>
        </TableRow>;
      })}</TableBody>
    </Table></TableContainer>
    {!!rows.length && <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', lg: 'none' }, px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>Scroll across to see payment, approval and review actions.</Typography>}
    {loading && <Stack spacing={1} p={2}>{[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={48} />)}</Stack>}
    {!loading && !rows.length && <Stack alignItems="center" gap={1} py={6}><Inventory2Outlined sx={{ color: '#9AAA9F', fontSize: 36 }} /><Typography variant="body2" color="text.secondary">No orders match this filter.</Typography></Stack>}
  </Card>;
}
