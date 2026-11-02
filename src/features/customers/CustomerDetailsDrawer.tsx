import { ArrowForwardRounded, CloseRounded, EmailOutlined, PersonOutlineRounded, PhoneOutlined } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, Pagination, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '@/api/customersApi';
import { approvalStatusLabel } from '@/api/staffOrdersApi';
import { formatOrderDate, orderStatusColor } from '@/features/orders/orderPresentation';

export function CustomerDetailsDrawer({ id, onClose, canViewOrders }: { id: string; onClose: () => void; canViewOrders: boolean }) {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const detail = useQuery({ queryKey: ['admin-customer', id], queryFn: ({ signal }) => customersApi.get(id, signal) });
  const orders = useQuery({ queryKey: ['admin-customer-orders', id, page], queryFn: ({ signal }) => customersApi.orders(id, page, signal) });
  const customer = detail.data;
  return <Drawer anchor="right" open onClose={onClose} slotProps={{ paper: { role: 'dialog', 'aria-label': 'Customer details', sx: { width: { xs: '100%', sm: 680 }, maxWidth: '100vw', bgcolor: '#F7F9F6' } } }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" px={3} py={2} bgcolor="white" borderBottom="1px solid" borderColor="divider"><Box><Typography variant="h3">Customer details</Typography><Typography variant="caption" color="text.secondary">Profile and booking history</Typography></Box><IconButton aria-label="Close customer details" onClick={onClose}><CloseRounded /></IconButton></Stack>
    <Stack spacing={2.5} p={{ xs: 2, sm: 3 }}>
      {detail.isPending && <Skeleton variant="rounded" height={220} />}
      {detail.isError && <Alert severity="error" action={<Button onClick={() => void detail.refetch()}>Retry</Button>}>Unable to load customer details.</Alert>}
      {customer && <>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px' }}>
          <Stack direction="row" gap={1.5} alignItems="center" mb={2}><Avatar sx={{ bgcolor: '#E6F2E9', color: 'primary.main', width: 48, height: 48 }}><PersonOutlineRounded /></Avatar><Box flex={1} minWidth={0}><Typography component="h2" variant="h3" sx={{ overflowWrap: 'anywhere' }}>{customer.name}</Typography><Typography variant="caption" color="text.secondary">Customer since {formatOrderDate(customer.registeredAt)}</Typography></Box><Chip size="small" label={customer.isActive ? 'Active profile' : 'Inactive profile'} color={customer.isActive ? 'success' : 'default'} variant="outlined" /></Stack>
          <Stack spacing={1}><Stack direction="row" alignItems="center" gap={1}><PhoneOutlined fontSize="small" color="action" /><Typography variant="body2">{customer.phone || 'Phone not recorded'}</Typography></Stack><Stack direction="row" alignItems="center" gap={1}><EmailOutlined fontSize="small" color="action" /><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{customer.email || 'Email not recorded'}</Typography></Stack><Typography variant="caption" color="text.secondary">Preferred language: {customer.preferredLanguage === 'ar' ? 'Arabic' : customer.preferredLanguage === 'en' ? 'English' : customer.preferredLanguage || 'Not recorded'}</Typography></Stack>
          <Divider sx={{ my: 2 }} />
          <Box display="grid" gridTemplateColumns="repeat(3, minmax(0, 1fr))" gap={1}>{[['Plans booked', customer.bookedPlans], ['Active now', customer.activePlans], ['Paused now', customer.pausedPlans], ['Pending', customer.pendingOrders], ['Cancelled', customer.cancelledOrders], ['Rejected', customer.rejectedOrders]].map(([label, count]) => <Box key={label} sx={{ bgcolor: '#F3F7F2', p: 1.25, borderRadius: '8px' }}><Typography variant="h3" fontWeight={800}>{count}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box>)}</Box>
          <Typography variant="caption" display="block" color="text.secondary" mt={1.5}>Booked plans include confirmed, active and completed purchases. Pending, cancelled and rejected orders are shown separately.</Typography>
        </Paper>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography component="h2" variant="h3">Order history</Typography><Chip size="small" label={`${customer.totalOrders} total orders`} /></Stack>
      </>}
      {orders.isPending && <Skeleton variant="rounded" height={180} />}
      {orders.isError && <Alert severity="error" action={<Button onClick={() => void orders.refetch()}>Retry</Button>}>Unable to load booking history.</Alert>}
      {orders.data?.items.length === 0 && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}><Typography color="text.secondary">This customer has no orders yet.</Typography></Paper>}
      {orders.data?.items.map(({ order }) => <Paper key={order.id} variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
        <Stack direction="row" gap={1} justifyContent="space-between" alignItems="flex-start"><Box minWidth={0}><Typography fontWeight={750}>{order.plan.name}</Typography><Typography variant="caption" color="text.secondary">{order.orderNumber} · {order.plan.durationName}</Typography></Box><Chip size="small" label={approvalStatusLabel(order.status)} color={orderStatusColor(order.status)} /></Stack>
        <Typography variant="body2" mt={1}>{order.mealCount} {order.mealCount === 1 ? 'meal' : 'meals'} + {order.snackCount} {order.snackCount === 1 ? 'snack' : 'snacks'} per day · {order.fulfillmentMethod === 'TAKEAWAY' ? 'Takeaway' : 'Home Delivery'}</Typography>
        <Typography variant="body2" color="text.secondary">{formatOrderDate(order.delivery.startDate)} – {formatOrderDate(order.delivery.endDate)}</Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mt={1}><Typography variant="caption" color="text.secondary">Payment: {order.paymentStatus.replaceAll('_', ' ')} · Booked {formatOrderDate(order.placedAt)}</Typography>{canViewOrders && <Button size="small" endIcon={<ArrowForwardRounded />} onClick={() => navigate(`/orders?orderId=${order.id}`)}>View order</Button>}</Stack>
      </Paper>)}
      {!!orders.data && orders.data.totalCount > 20 && <Pagination count={Math.ceil(orders.data.totalCount / 20)} page={page} onChange={(_, value) => setPage(value)} aria-label="Customer order pages" />}
    </Stack>
  </Drawer>;
}
