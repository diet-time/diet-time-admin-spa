import { CalendarMonthOutlined, CheckCircleOutline, LocalDiningOutlined, LocalShippingOutlined, RefreshRounded, SubscriptionsOutlined, TodayOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Chip, Grid, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { dashboardApi } from '@/api/dashboardApi';
import { queryKeys } from '@/api/queryKeys';
import type { DashboardServiceOrder, OperationsDashboard } from '@/api/apiTypes';
import { canReadPath } from '@/auth/screenPermissionRoutes';
import { CustomerInsightsCard } from './CustomerInsightsCard';
import { dashboardToday } from './dashboardDates';
import { BusinessFollowUps, DashboardMetric, DeliverySlotsCard, FulfillmentDonut, PopularPackagesCard, ScheduledOrdersCard } from './DashboardWidgets';

export function DashboardPage() {
  const [date, setDate] = useState(dashboardToday);
  const query = useQuery({ queryKey: queryKeys.dashboard(date), queryFn: ({ signal }) => dashboardApi.operations(date, signal), refetchInterval: 60_000 });
  const permissions = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const navigate = useNavigate();
  const canReview = !!permissions.data && canReadPath(permissions.data, '/orders');
  const canViewCustomers = !!permissions.data && canReadPath(permissions.data, '/customers');
  const openCalendar = () => navigate(`/operations/delivery-calendar?date=${date}`);
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5}>
      <Box><Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-.04em' }}>Dashboard</Typography><Typography variant="body2" color="text.secondary" mt={0.25}>Business overview · daily operations at a glance</Typography></Box>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Chip size="small" variant="outlined" icon={<CalendarMonthOutlined />} label="7-day outlook" sx={{ bgcolor: 'white', borderRadius: 1.5, fontSize: 11 }} /><TextField type="date" label="Service date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 155 }} /><Button variant="outlined" size="small" startIcon={<TodayOutlined fontSize="small" />} onClick={() => setDate(dashboardToday())} sx={{ minHeight: 38, bgcolor: 'white' }}>Today</Button><Button size="small" aria-label="Refresh dashboard" disabled={query.isFetching} onClick={() => void query.refetch()} sx={{ minWidth: 38 }}><RefreshRounded fontSize="small" /></Button></Stack>
    </Stack>
    {query.isError && <Alert severity={query.data ? 'warning' : 'error'} action={<Button onClick={() => void query.refetch()}>Retry</Button>}>{query.data ? 'Unable to refresh. Showing the last loaded overview.' : 'Unable to load operations dashboard.'}</Alert>}
    {query.data ? <DashboardContent onCustomers={canViewCustomers ? () => navigate('/customers') : undefined} onCustomer={canViewCustomers ? id => navigate(`/customers?customerId=${id}`) : undefined} data={query.data} onCalendar={openCalendar} onReview={canReview ? () => navigate('/orders?status=PENDING_APPROVAL') : undefined} onOrder={canReview ? id => navigate(`/orders?orderId=${id}`) : undefined} /> : query.isPending ? <DashboardSkeleton /> : null}
  </Stack>;
}

function DashboardContent({ data, onCalendar, onReview, onOrder, onCustomer, onCustomers }: { onCustomer?: (id: string) => void; onCustomers?: () => void; data: OperationsDashboard; onCalendar: () => void; onReview?: () => void; onOrder?: (id: string) => void }) {
  const insights = data.insights;
  const fulfillment = insights?.fulfillment;
  const scheduled = fulfillment?.total ?? data.today.scheduledDeliveries;
  const meals = fulfillment?.mealItems ?? data.today.mealsToPrepare;
  const start = parseISO(data.date);
  const rows: DashboardServiceOrder[] = insights?.scheduledOrders ?? data.todayDeliveries.map(row => ({ id: row.orderId, orderNumber: row.orderNumber, customerName: row.customerName, planName: row.mealPlanName, mealCount: row.mealCount, fulfillmentMethod: row.fulfillmentMethod ?? 'HOME_DELIVERY', isOverdue: false, status: row.status, deliverySlot: '', takeawayBranchName: row.takeawayBranchName }));
  return <>
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><DashboardMetric title="Scheduled orders" value={scheduled} detail={fulfillment ? `${fulfillment.homeDelivery} delivery · ${fulfillment.takeaway} takeaway` : `${data.today.customers} customers on this date`} icon={<LocalShippingOutlined />} tone="#2C8650" tint="#E3F4E6" /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><DashboardMetric title="Active subscriptions" value={insights?.activeSubscriptions ?? '—'} detail="Eligible plans in the selected service period" icon={<SubscriptionsOutlined />} tone="#2186CF" tint="#E6F2FF" /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><DashboardMetric title="Meal items scheduled" value={meals} detail="Package demand for the selected date" icon={<LocalDiningOutlined />} tone="#E68B28" tint="#FFF0DE" /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><DashboardMetric title="Fulfillment rate" value={fulfillment?.fulfillmentRate == null ? '—' : `${fulfillment.fulfillmentRate}%`} detail={fulfillment ? fulfillment.total ? `${fulfillment.delivered} delivered · ${fulfillment.collected} collected` : 'No scheduled service days' : 'Fulfillment data not available'} icon={<CheckCircleOutline />} tone="#2C8650" tint="#E3F4E6" /></Grid>
    </Grid>
    <Grid container spacing={1.5} alignItems="stretch">
      <Grid size={12}><CustomerInsightsCard data={data.customerInsights} onCustomer={onCustomer} onCustomers={onCustomers} /></Grid>
      <Grid size={{ xs: 12, md: 6 }}><FulfillmentDonut data={fulfillment} /></Grid>
      <Grid size={{ xs: 12, md: 6 }}><PopularPackagesCard packages={insights?.popularPackages ?? []} total={insights?.activeSubscriptions} /></Grid>
    </Grid>
    <BusinessFollowUps pending={insights?.pendingConfirmations ?? data.needsAttention.ordersRequiringReview} overdue={fulfillment?.overdue} expiring={insights?.expiringSubscriptions} onReview={onReview} onCalendar={onCalendar} />
    <Grid container spacing={1.5} alignItems="stretch">
      <Grid size={{ xs: 12, lg: 8 }}><ScheduledOrdersCard rows={rows} onCalendar={onCalendar} onOrder={onOrder} /></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><DeliverySlotsCard slots={insights?.deliverySlots ?? []} fulfillment={fulfillment} /></Grid>
    </Grid>
    <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={0.5}><Typography variant="caption" color="text.secondary">Outlook: {format(start, 'd MMM')} – {format(addDays(start, 6), 'd MMM yyyy')}</Typography><Typography variant="caption" color="text.secondary">Qatar time · updates automatically</Typography></Stack>
  </>;
}

function DashboardSkeleton() {
  return <Stack spacing={2} aria-label="Loading operations dashboard"><Grid container spacing={1.5}>{[0, 1, 2, 3].map(index => <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}><Skeleton variant="rounded" height={112} /></Grid>)}</Grid><Grid container spacing={1.5}>{[0, 1, 2].map(index => <Grid key={index} size={{ xs: 12, md: index === 0 ? 12 : 6 }}><Skeleton variant="rounded" height={index === 0 ? 340 : 250} /></Grid>)}</Grid></Stack>;
}
