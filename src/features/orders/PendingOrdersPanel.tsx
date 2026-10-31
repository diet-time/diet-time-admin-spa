import { PendingActionsOutlined } from '@mui/icons-material';
import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { staffOrdersApi } from '@/api/staffOrdersApi';
import { canReadPath } from '@/auth/screenPermissionRoutes';

/** A compact alert for the global pending queue, independent of calendar filters. */
export function PendingOrdersPanel({ serviceDate }: { serviceDate?: string }) {
  const navigate = useNavigate();
  const permissions = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const canReview = !!permissions.data && canReadPath(permissions.data, '/orders');
  const pending = useQuery({
    queryKey: ['staffOrders', 'PENDING_APPROVAL', 1],
    queryFn: () => staffOrdersApi.list('PENDING_APPROVAL', 1),
    enabled: canReview, refetchInterval: 30_000, refetchOnWindowFocus: true,
  });

  if (permissions.isError) return <Alert severity="error" action={<Button onClick={() => void permissions.refetch()}>Retry permissions</Button>}>Unable to check order-review access.</Alert>;
  if (!canReview) return null;
  if (pending.isError) return <Alert severity="error" action={<Button onClick={() => void pending.refetch()}>Retry pending orders</Button>}>Unable to load pending confirmations. Please retry; orders may still be awaiting approval.</Alert>;
  if (!pending.data || pending.data.totalCount <= 0) return null;

  return <Card component="section" aria-label="Pending confirmation orders" sx={{ border: '1px solid', borderColor: 'warning.main', bgcolor: '#FFF8E8' }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.5}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <PendingActionsOutlined sx={{ color: '#805000' }} />
          <Typography variant="h3" component="h2" sx={{ color: '#573D12' }}>Pending confirmation orders</Typography>
          <Chip aria-live="polite" color="warning" label={`${pending.data.totalCount} awaiting approval`} />
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button variant="outlined" color="warning" onClick={() => navigate(`/orders/daily${serviceDate ? `?serviceDate=${encodeURIComponent(serviceDate)}` : ''}`)}>Daily orders</Button>
          <Button variant="contained" color="warning" onClick={() => navigate('/orders')}>View all pending orders</Button>
        </Stack>
      </Stack>
    </CardContent>
  </Card>;
}
