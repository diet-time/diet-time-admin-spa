import type { PackageRequest } from '@/api/packageRequestsApi';
import { ArrowForwardRounded, Inventory2Outlined, LocalShippingOutlined, StorefrontOutlined } from '@mui/icons-material';
import { Box, Button, Card, Chip, Divider, Pagination, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useMediaQuery, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { approvalFilterStatus, approvalStatusLabel, type StaffOrder } from '@/api/staffOrdersApi';
import { formatOrderDate, orderStatusColor } from './orderPresentation';
import { OrderServiceStatus } from './OrderServiceStatus';

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
  return <Stack spacing={0.5} alignItems="flex-start"><Chip size="small" label={approvalStatusLabel(row.order.status)} color={orderStatusColor(approvalFilterStatus(row.order.status) || row.order.status)} sx={{ fontSize: 11, fontWeight: 650, height: 24 }} /><OrderServiceStatus schedule={row.order.packageSchedule} /></Stack>;
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

export function OrdersTable({ rows, total, loading, daily, onReview, filters, heading, subtitle, page, onPageChange, requestRows = [], pendingRequests = [], onRequestReview, attention = false }: {
  requestRows?: PackageRequest[]; pendingRequests?: PackageRequest[]; onRequestReview?: (value: PackageRequest) => void; attention?: boolean;
  rows: StaffOrder[]; total: number; loading: boolean; daily: boolean; onReview: (row: StaffOrder) => void;
  filters: ReactNode; heading: string; subtitle: string; page: number; onPageChange: (page: number) => void;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const review = (row: StaffOrder) => <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: '16px !important' }} />} onClick={() => onReview(row)} sx={{ whiteSpace: 'nowrap' }}>{daily && ['PENDING_APPROVAL', 'PENDING'].includes(row.order.status) ? 'Review / Approve' : 'Review'}</Button>;
  const requestBadge = (row: StaffOrder) => <Stack spacing={0.5} alignItems="flex-start">{pendingRequests.filter(value => value.orderId === row.order.id).map(value =>
    <Chip key={value.request.id} size="small" variant="outlined" color="warning" label={value.request.type === 'PAUSE' ? 'Pause requested' : 'Resume requested'} onClick={() => onRequestReview?.(value)} />)}</Stack>;
  const requestAction = (value: PackageRequest) => <Button size="small" sx={{whiteSpace:'nowrap'}} onClick={() => onRequestReview?.(value)}>Review {value.request.type === 'PAUSE' ? 'pause' : 'resume'}</Button>;
  const requestSchedule = (value: PackageRequest) => <Stack spacing={0.25}>
    {value.request.pauseStartDate && <Typography variant="body2">Pause from {formatOrderDate(value.request.pauseStartDate)}</Typography>}
    <Typography variant="body2">Resume {formatOrderDate(value.request.resumeDate)}</Typography>
    <Typography variant="caption" color="text.secondary">Proposed end: {formatOrderDate(value.request.projectedEndDate)}</Typography>
  </Stack>;
  const first = (page - 1) * 20 + 1;

  return <Card component="section" aria-label="Filtered customer orders" sx={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(23,53,45,.04)' }}>
    <Box px={{ xs: 2, md: 2.5 }} py={2} borderBottom="1px solid" borderColor="divider">{filters}</Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} px={{ xs: 2, md: 2.5 }} py={2}>
      <Box><Typography component="h2" variant="subtitle1" fontWeight={800}>{heading}</Typography><Typography variant="caption" color="text.secondary">{subtitle}</Typography></Box>
      <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">{loading ? 'Loading…' : `${total} ${attention ? (total === 1 ? 'request' : 'requests') : (total === 1 ? 'order' : 'orders')}`}</Typography>
    </Stack>

    {loading ? <Stack spacing={1} p={2} aria-label="Loading orders">{[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={64} />)}</Stack>
      : !rows.length && !requestRows.length ? <Stack alignItems="center" gap={1} py={6} px={2}><Inventory2Outlined sx={{ color: '#9AAA9F', fontSize: 36 }} /><Typography variant="body2" fontWeight={700}>{attention ? 'No requests awaiting review' : 'No orders match these filters'}</Typography><Typography variant="caption" color="text.secondary">{attention ? 'New bookings and pause/resume requests will appear here.' : 'Try another service date or approval status.'}</Typography></Stack>
        : desktop ? <TableContainer><Table size="small" aria-label="Customer orders" sx={{ minWidth: 860, '& th': { bgcolor: '#F6F8F6', color: 'text.secondary', fontSize: 11, fontWeight: 750, py: 1.25, whiteSpace: 'nowrap' }, '& td': { py: 1.75, borderColor: '#EEF2EF', verticalAlign: 'top' }, '& tbody tr:last-child td': { borderBottom: 0 } }}>
          <TableHead><TableRow>{['Order', 'Customer', 'Plan / package', 'Service / requested dates', 'Payment', 'Status / request', ''].map(heading => <TableCell key={heading}>{heading}</TableCell>)}</TableRow></TableHead>
          <TableBody>{requestRows.map(value => <TableRow key={`request-${value.request.id}`} hover sx={{bgcolor:'#FFFCF5'}}>
            <TableCell sx={{maxWidth:180,overflowWrap:'anywhere'}}><Typography variant="body2" fontWeight={750}>{value.orderNumber}</Typography><Typography variant="caption" color="text.secondary">{formatOrderDate(value.request.createdAt,true)}</Typography></TableCell>
            <TableCell sx={{maxWidth:200,overflowWrap:'anywhere'}}><Typography variant="body2" fontWeight={700}>{value.customerName}</Typography></TableCell>
            <TableCell><Typography variant="body2" fontWeight={650}>{value.planName}</Typography></TableCell>
            <TableCell><Typography variant="body2" fontWeight={700}>{value.request.type === 'PAUSE' ? 'Pause request' : 'Resume request'}</Typography>{requestSchedule(value)}</TableCell>
            <TableCell><Typography variant="caption" color="text.secondary">Unchanged</Typography></TableCell>
            <TableCell><Chip size="small" color="warning" label="Awaiting review" /></TableCell><TableCell>{requestAction(value)}</TableCell>
          </TableRow>)}{rows.map(row => <TableRow key={row.order.id} hover>
            <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="body2" fontWeight={750}>{row.order.orderNumber}</Typography><Typography variant="caption" color="text.secondary">{formatOrderDate(row.order.placedAt, true)}</Typography></TableCell>
            <TableCell><Typography variant="body2" fontWeight={700}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary" whiteSpace="nowrap">{row.customerPhone ?? 'Phone unavailable'}</Typography></TableCell>
            <TableCell sx={{ minWidth: 160 }}><Plan row={row} /></TableCell>
            <TableCell sx={{ maxWidth: 240 }}><Service row={row} /></TableCell>
            <TableCell><Payment row={row} /></TableCell>
            <TableCell><Stack spacing={0.75} alignItems="flex-start"><Approval row={row} />{attention&&<Typography variant="caption">New booking</Typography>}{!attention&&requestBadge(row)}</Stack></TableCell>
            <TableCell>{review(row)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>
          : <Stack divider={<Divider />} aria-label="Customer orders">{requestRows.map(value => <Stack key={`request-${value.request.id}`} component="article" aria-label={`${value.request.type === 'PAUSE' ? 'Pause' : 'Resume'} request ${value.orderNumber}`} spacing={1.5} p={2} sx={{bgcolor:'#FFFCF5'}}>
            <Stack direction="row" justifyContent="space-between" gap={1}><Box sx={{minWidth:0,overflowWrap:'anywhere'}}><Typography fontWeight={750}>{value.customerName}</Typography><Typography variant="caption">{value.orderNumber}</Typography></Box><Chip size="small" color="warning" label="Awaiting review"/></Stack>
            <Typography variant="body2" fontWeight={650}>{value.planName} · {value.request.type === 'PAUSE' ? 'Pause request' : 'Resume request'}</Typography>
            {requestSchedule(value)}<Box>{requestAction(value)}</Box>
          </Stack>)}{rows.map(row => <Stack key={row.order.id} component="article" aria-label={`Order ${row.order.orderNumber}`} spacing={1.5} p={2}>
            <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography fontWeight={750}>{row.customerName}</Typography><Typography variant="caption" color="text.secondary">{row.order.orderNumber} · {formatOrderDate(row.order.placedAt, true)}</Typography></Box><Approval row={row} /></Stack>
            <Plan row={row} /><Service row={row} />{attention?<Typography variant="caption">New booking</Typography>:requestBadge(row)}
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Payment row={row} />{review(row)}</Stack>
          </Stack>)}</Stack>}

    {!loading && (rows.length > 0 || requestRows.length > 0) && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1} px={2.5} py={1.5} borderTop="1px solid" borderColor="divider">
      <Typography variant="caption" color="text.secondary">Showing {first}–{Math.min(first + rows.length + requestRows.length - 1, total)} of {total} {attention ? (total === 1 ? 'request' : 'requests') : (total === 1 ? 'order' : 'orders')}</Typography>
      {total > 20 && <Pagination count={Math.ceil(total / 20)} page={page} onChange={(_, value) => onPageChange(value)} size="small" />}
    </Stack>}
  </Card>;
}
