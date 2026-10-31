import { PendingActionsOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { staffOrdersApi } from '@/api/staffOrdersApi';
import { canReadPath } from '@/auth/screenPermissionRoutes';

/** A global approval queue, independent of the operational date/calendar filters. */
export function PendingOrdersPanel({ serviceDate }: { serviceDate?: string }) {
  const navigate = useNavigate();
  const permissions = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const canReview = !!permissions.data && canReadPath(permissions.data, '/orders');
  // Share the existing Orders query so approval invalidation refreshes this panel too.
  const pending = useQuery({
    queryKey: ['staffOrders', 'PENDING_APPROVAL', 1],
    queryFn: () => staffOrdersApi.list('PENDING_APPROVAL', 1),
    enabled: canReview, refetchInterval: 30_000, refetchOnWindowFocus: true,
  });
  return <Card component="section" aria-label="Pending confirmation orders" sx={{ border: '2px solid', borderColor: 'warning.main', bgcolor: '#FFF8E8' }}>
    <CardContent>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
        <Box><Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <PendingActionsOutlined sx={{ color: '#805000' }} />
          <Typography variant="h3" component="h2" sx={{ color: '#573D12' }}>Pending confirmation orders</Typography>
          {canReview && pending.data && <Chip aria-live="polite" color={pending.data.totalCount ? 'warning' : 'success'} label={`${pending.data.totalCount} awaiting approval`} />}
        </Stack><Typography variant="body2" mt={0.75} sx={{ color: '#573D12' }}>These orders need Diet Time approval before fulfillment.</Typography></Box>
        {canReview && <Stack direction="row" gap={1} flexWrap="wrap">
          <Button variant="outlined" color="warning" onClick={() => navigate(`/orders/daily${serviceDate ? `?serviceDate=${encodeURIComponent(serviceDate)}` : ''}`)}>Daily orders</Button>
          <Button disabled={pending.isFetching} onClick={() => void pending.refetch()}>Refresh pending orders</Button>
          <Button variant="contained" color="warning" onClick={() => navigate('/orders')}>View all pending orders</Button>
        </Stack>}
      </Stack>
      {permissions.isLoading || (canReview && pending.isLoading) ? <Skeleton aria-label="Loading pending orders" height={60} />
        : permissions.isError ? <Alert severity="error" sx={{ mt: 2 }} action={<Button onClick={() => void permissions.refetch()}>Retry permissions</Button>}>Unable to check order-review access.</Alert>
        : !canReview ? <Alert severity="warning" sx={{ mt: 2 }}>Order-review access is not enabled for your account. Ask an administrator to enable Orders access so pending confirmations can be reviewed.</Alert>
        : <>
          {pending.isError && <Alert severity="error" sx={{ mt: 2 }} action={<Button onClick={() => void pending.refetch()}>Retry pending orders</Button>}>Unable to load pending confirmations. Please retry; orders may still be awaiting approval.</Alert>}
          {!pending.isError && pending.data?.totalCount === 0 && <Typography role="status" mt={2}>No orders are awaiting confirmation.</Typography>}
          {!!pending.data?.items.length && <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, mb: 0 }}>
            {pending.data.items.slice(0, 5).map(({ order, customerName }) => <Box component="li" key={order.id} sx={{ bgcolor: 'background.paper', border: '1px solid #EAD9B6', borderRadius: 2, p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Box minWidth={0} sx={{ overflowWrap: 'anywhere' }}>
                  <Typography fontWeight={800}>{order.orderNumber} · {customerName}</Typography>
                  <Typography variant="body2">{order.plan.name} · {order.mealCount} Meals + {order.snackCount} Snacks · {order.plan.durationName}</Typography>
                  <Typography variant="body2" color="text.secondary">{order.fulfillmentMethod === 'TAKEAWAY' ? `Takeaway${order.takeawayBranch?.name ? ` · ${order.takeawayBranch.name}` : ''}` : 'Home Delivery'} · Payment: {order.paymentStatus.replaceAll('_', ' ')}</Typography>
                </Box>
                <Button variant="outlined" color="warning" sx={{ flexShrink: 0 }} aria-label={`Review order ${order.orderNumber}`} onClick={() => navigate(`/orders?orderId=${encodeURIComponent(order.id)}`)}>Review order</Button>
              </Stack>
            </Box>)}
          </Stack>}
        </>}
    </CardContent>
  </Card>;
}
