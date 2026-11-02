import { ArrowForwardRounded, PeopleOutlineRounded, RefreshRounded, SearchRounded } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, Card, Chip, InputAdornment, Pagination, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { customersApi } from '@/api/customersApi';
import { canReadPath } from '@/auth/screenPermissionRoutes';
import { RoleGuard } from '@/auth/RoleGuard';
import { formatOrderDate } from '@/features/orders/orderPresentation';
import { CustomerDetailsDrawer } from './CustomerDetailsDrawer';

export function CustomersPage() {
  return <RoleGuard allowedRoles={['Admin']} fallback={<Alert severity="warning">Customer directory is available to Admin staff.</Alert>}><CustomerDirectory /></RoleGuard>;
}

function CustomerDirectory() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const selected = params.get('customerId');
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const permissions = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const query = useQuery({ queryKey: ['admin-customers', search, page], queryFn: ({ signal }) => customersApi.list(search, page, signal), refetchInterval: 60_000 });
  const update = (values: Record<string, string | undefined>) => setParams(previous => { const next = new URLSearchParams(previous); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); } return next; });
  return <Stack spacing={2.5}>
    <Stack direction="row" gap={1.5} alignItems="center"><Box sx={{ bgcolor: '#E5F2E8', color: 'primary.main', p: 1.25, borderRadius: '12px', display: 'flex' }}><PeopleOutlineRounded /></Box><Box><Typography variant="h2">Customers</Typography><Typography variant="body2" color="text.secondary">Customer profiles, booked plans and purchase history</Typography></Box></Stack>
    <Card component="form" onSubmit={event => { event.preventDefault(); update({ search: draft.trim(), page: undefined }); }} sx={{ borderRadius: '12px', p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
      <TextField label="Search customers" placeholder="Name, phone or email" value={draft} onChange={event => setDraft(event.target.value)} slotProps={{ htmlInput: { maxLength: 200 }, input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} sx={{ flex: 1, maxWidth: { sm: 480 } }} />
      <Button type="submit" variant="contained">Search</Button>{search && <Button onClick={() => { setDraft(''); update({ search: undefined, page: undefined }); }}>Clear</Button>}
      <Button startIcon={<RefreshRounded />} disabled={query.isFetching} onClick={() => void query.refetch()} sx={{ ml: { sm: 'auto' } }}>Refresh customers</Button>
    </Stack></Card>
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>Unable to refresh customers.{query.data ? ' Showing the last loaded list.' : ''}</Alert>}
    <Card sx={{ borderRadius: '12px', minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" px={2.5} py={2} alignItems="center"><Typography component="h3" variant="subtitle1" fontWeight={750}>Customer directory</Typography><Chip size="small" variant="outlined" label={`${query.data?.totalCount ?? 0} ${query.data?.totalCount === 1 ? 'customer' : 'customers'}`} /></Stack>
      <TableContainer><Table aria-label="Customer directory" size="small" sx={{ minWidth: 850, '& th': { bgcolor: '#F3F7F3', fontSize: 11, color: 'text.secondary', fontWeight: 750 }, '& td': { py: 1.75 } }}>
        <TableHead><TableRow>{['Customer', 'Phone', 'Plans booked', 'Active / paused', 'Pending orders', 'Latest order', ''].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{query.data?.items.map(customer => <TableRow key={customer.id} hover>
          <TableCell><Stack direction="row" alignItems="center" gap={1.25}><Avatar sx={{ width: 36, height: 36, bgcolor: '#ECF5ED', color: 'primary.main', fontSize: 14 }}>{customer.name.charAt(0).toUpperCase()}</Avatar><Box><Typography variant="body2" fontWeight={700}>{customer.name}</Typography><Typography variant="caption" color="text.secondary">{customer.email || `Joined ${formatOrderDate(customer.registeredAt)}`}</Typography></Box></Stack></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{customer.phone || 'Not recorded'}</TableCell><TableCell><Typography fontWeight={800} color="primary.main">{customer.bookedPlans}</Typography></TableCell>
          <TableCell><Stack direction="row" gap={0.75}><Chip size="small" variant="outlined" label={`${customer.activePlans} active`} color={customer.activePlans ? 'success' : 'default'} /><Chip size="small" variant="outlined" label={`${customer.pausedPlans} paused`} /></Stack></TableCell>
          <TableCell><Chip size="small" label={customer.pendingOrders} color={customer.pendingOrders ? 'warning' : 'default'} /></TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{customer.latestOrderAt ? formatOrderDate(customer.latestOrderAt) : 'No orders yet'}</TableCell>
          <TableCell><Button size="small" aria-label={`View customer ${customer.name}`} endIcon={<ArrowForwardRounded />} onClick={() => update({ customerId: customer.id })}>View</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
      {!!query.data?.items.length && <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', lg: 'none' }, px: 2, py: 1 }}>Scroll across to view booking counts and customer details.</Typography>}
      {query.isPending && <Stack spacing={1} p={2}>{[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={54} />)}</Stack>}
      {query.data?.items.length === 0 && <Stack py={6} alignItems="center" spacing={1}><PeopleOutlineRounded sx={{ fontSize: 36, color: '#8B9D90' }} /><Typography color="text.secondary">{search ? 'No customers match your search.' : 'No customer profiles yet.'}</Typography></Stack>}
    </Card>
    {!!query.data && query.data.totalCount > 20 && <Pagination count={Math.ceil(query.data.totalCount / 20)} page={page} onChange={(_, value) => update({ page: String(value) })} aria-label="Customer pages" />}
    <Typography variant="caption" color="text.secondary">Plans booked counts confirmed, active and completed purchases. Pending, cancelled and rejected orders are excluded.</Typography>
    {selected && <CustomerDetailsDrawer key={selected} id={selected} onClose={() => update({ customerId: undefined })} canViewOrders={!!permissions.data && canReadPath(permissions.data, '/orders')} />}
  </Stack>;
}
