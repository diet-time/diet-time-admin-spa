import { ArrowForwardRounded, Inventory2Outlined, LocalShippingOutlined, StorefrontOutlined } from '@mui/icons-material';
import { Box, Button, Card, Chip, Divider, Pagination, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useMediaQuery, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { approvalFilterStatus, approvalStatusLabel, type StaffOrder } from '@/api/staffOrdersApi';
import { formatOrderDate, orderStatusColor } from './orderPresentation';

function Payment({ row }: { row: StaffOrder }) {
  const { order } = row;
  const payment = order.paymentStatus === 'PENDING' ? 'Pending payment'
    : order.paymentStatus.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  return <Stack spacing={0.5} alignItems="flex-start">
    <Typography variant="body2" fontWeight={750} whiteSpace="nowrap">{order.pricing.currencyCode} {order.pricing.totalAmount.toLocaleString('en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
    <Chip size="small" variant="outlined" label={payment} color={orderStatusColor(order.paymentStatus)} sx={{ fontSize: 11, height: 22 }} />
  </Stack>;
}

function Approval({ row }: { row: StaffOrder }) {
  return <Chip size="small" label={approvalStatusLabel(row.order.status)} color={orderStatusColor(approvalFilterStatus(row.order.status) || row.order.status)} sx={{ fontSize: 11, fontWeight: 650, height: 24 }} />;
}

function Service({ row }: { row: StaffOrder }) {
  const { order } = row;
  const takeaway = order.fulfillmentMethod === 'TAKEAWAY';
  const address = order.delivery.address;
  const location = takeaway ? order.takeawayBranch?.name ?? 'Branch not recorded'
    : address?.formattedAddress || [address?.addressName, address?.area].filter(Boolean).join(', ') || 'Address not recorded';
  return <Stack spacing={0.25}>
    <Stack direction="row" alignItems="center" gap={0.5}>
      {takeaway ? <StorefrontOutlined sx={{ fontSize: 16, color: 'primary.main' }} /> : <LocalShippingOutlined sx={{ fontSize: 16, color: 'primary.main' }} />}
      <Typography variant="body2" fontWeight={650}>{takeaway ? 'Takeaway' : 'Home delivery'}</Typography>
    </Stack>
    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{location}{!takeaway && order.delivery.timeSlot?.name ? ` · ${order.delivery.timeSlot.name}` : ''}</Typography>
    <Typography variant="caption" color="text.secondary">{formatOrderDate(order.delivery.startDate)} – {formatOrderDate(order.delivery.endDate)}</Typography>
  </Stack>;
}

function Plan({ row }: { row: StaffOrder }) {
  return <Stack spacing={0.25}><Typography variant="body2" fontWeight={650}>{row.order.plan.name}</Typography><Typography variant="caption" color="text.secondary">{row.order.mealCount} meals + {row.order.snackCount} snacks · {row.order.plan.durationName}</Typography></Stack>;
}

export function OrdersTable({ rows, total, loading, daily, onReview, filters, heading, subtitle, page, onPageChange }: {
  rows: StaffOrder[]; total: number; loading: boolean; daily: boolean; onReview: (row: StaffOrder) => void;
  filters: ReactNode; heading: string; subtitle: string; page: number; onPageChange: (page: number) => void;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const review = (row: StaffOrder) => <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: '16px !important' }} />} onClick={() => onReview(row)} sx={{ whiteSpace: 'nowrap' }}>{daily && ['PENDING_APPROVAL', 'PENDING'].includes(row.order.status) ? 'Review / Approve' : 'Review'}</Button>;
  const first = (page - 1) * 20 + 1;

  return <Card component="section" aria-label="Filtered customer orders" sx={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(23,53,45,.04)' }}>
    <Box px={{ xs: 2, md: 2.5 }} py={2} borderBottom="1px solid" borderColor="divider">{filters}</Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} px={{ xs: 2, md: 2.5 }} py={2}>
      <Box><Typography component="h2" variant="subtitle1" fontWeight={800}>{heading}</Typography><Typography variant="caption" color="text.secondary">{subtitle}</Typography></Box>
      <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">{loading ? 'Loading…' : `${total} ${total === 1 ? 'order' : 'orders'}`}</Typography>
    </Stack>

    {loading ? <Stack spacing={1} p={2} aria-label="Loading orders">{[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={64} />)}</Stack>
      : !rows.length ? <Stack alignItems="center" gap={1} py={6} px={2}><Inventory2Outlined sx={{ color: '#9AAA9F', fontSize: 36 }} /><Typography variant="body2" fontWeight={700}>No orders match these filters</Typography><Typography variant="caption" color="text.secondary">Try another service date or approval status.</Typography></Stack>
        : desktop ? <TableContainer><Table size="small" aria-label="Customer orders" sx={{ minWidth: 860, '& th': { bgcolor: '#F6F8F6', color: 'text.secondary', fontSize: 11, fontWeight: 750, py: 1.25, whiteSpace: 'nowrap' }, '& td': { py: 1.75, borderColor: '#EEF2EF', verticalAlign: 'top' }, '& tbody tr:last-child td': { borderBottom: 0 } }}>
          <TableHead><TableRow>{['Order', 'Customer', 'Plan / package', 'Service & fulfillment', 'Payment', 'Approval', ''].map(heading => <TableCell key={heading}>{heading}</TableCell>)}</TableRow></TableHead>
          <TableBody>{rows.map(row => <TableRow key={row.order.id} hover>
            <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="body2" fontWeight={750}>{row.order.orderNumber}</Typography><Typography variant="caption" color="text.secondary">{formatOrderDate(row.order.placedAt, true)}</Typography></TableCell>
            <TableCell><Typography variant="body2" fontWeight={700}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary" whiteSpace="nowrap">{row.customerPhone ?? 'Phone unavailable'}</Typography></TableCell>
            <TableCell sx={{ minWidth: 160 }}><Plan row={row} /></TableCell>
            <TableCell sx={{ maxWidth: 240 }}><Service row={row} /></TableCell>
            <TableCell><Payment row={row} /></TableCell>
            <TableCell><Approval row={row} /></TableCell>
            <TableCell>{review(row)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>
          : <Stack divider={<Divider />} aria-label="Customer orders">{rows.map(row => <Stack key={row.order.id} component="article" aria-label={`Order ${row.order.orderNumber}`} spacing={1.5} p={2}>
            <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography fontWeight={750}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary">{row.order.orderNumber} · {formatOrderDate(row.order.placedAt, true)}</Typography></Box><Approval row={row} /></Stack>
            <Plan row={row} /><Service row={row} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Payment row={row} />{review(row)}</Stack>
          </Stack>)}</Stack>}

    {!loading && rows.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1} px={2.5} py={1.5} borderTop="1px solid" borderColor="divider">
      <Typography variant="caption" color="text.secondary">Showing {first}–{Math.min(first + rows.length - 1, total)} of {total} {total === 1 ? 'order' : 'orders'}</Typography>
      {total > 20 && <Pagination count={Math.ceil(total / 20)} page={page} onChange={(_, value) => onPageChange(value)} size="small" />}
    </Stack>}
  </Card>;
}
