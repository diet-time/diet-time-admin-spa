import { ArrowForward, CalendarMonthOutlined, ErrorOutline, EventBusyOutlined, GroupsOutlined, HomeWorkOutlined, LocalDiningOutlined, LocalShippingOutlined, PendingActionsOutlined, TodayOutlined, WarningAmberOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/api/dashboardApi';
import { queryKeys } from '@/api/queryKeys';
import type { DashboardAttention, DeliveryWorkloadDay, OperationsDashboard, PlanActivityDay } from '@/api/apiTypes';
import { colors } from '@/theme/theme';

const todayValue = () => format(new Date(), 'yyyy-MM-dd');

export function DashboardPage() {
  const [date, setDate] = useState(todayValue);
  const query = useQuery({ queryKey: queryKeys.dashboard(date), queryFn: ({ signal }) => dashboardApi.operations(date, signal) });
  const navigate = useNavigate();
  const openCalendar = () => navigate(`/operations/delivery-calendar?date=${date}`);

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={2}>
      <Box><Typography variant="h1">Good day</Typography><Typography color="text.secondary">Here's today's delivery operation.</Typography><Typography mt={0.75} fontWeight={750}>{format(parseISO(date), 'EEEE, d MMMM yyyy')}</Typography></Box>
      <Stack direction="row" gap={1}><TextField type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} aria-label="Operational date" slotProps={{ inputLabel: { shrink: true } }} /><Button variant="outlined" startIcon={<TodayOutlined />} onClick={() => setDate(todayValue())}>Today</Button></Stack>
    </Stack>
    {query.isLoading ? <DashboardSkeleton /> : query.isError || !query.data ? <DashboardError onRetry={() => void query.refetch()} /> : <DashboardContent data={query.data} onOpenCalendar={openCalendar} />}
  </Stack>;
}

function DashboardContent({ data, onOpenCalendar }: { data: OperationsDashboard; onOpenCalendar: () => void }) {
  const next = data.nextDeliveryDay;
  const metrics: Array<{ title: string; value: string | number; detail?: string; icon: ReactNode; tone: string; tint: string }> = [
    { title: 'Scheduled deliveries', value: data.today.scheduledDeliveries, detail: data.today.completedDeliveries == null ? undefined : `${data.today.completedDeliveries} completed`, icon: <LocalShippingOutlined />, tone: colors.emerald, tint: '#E8F5F0' },
    { title: 'Customers', value: data.today.customers, detail: 'Scheduled today', icon: <GroupsOutlined />, tone: '#2C6E9E', tint: '#EAF3F9' },
    { title: 'Meals to prepare', value: data.today.mealsToPrepare, detail: "Across today's deliveries", icon: <LocalDiningOutlined />, tone: colors.orange, tint: '#FFF0EC' },
    { title: 'Next delivery day', value: next ? format(parseISO(next.date), 'EEE, d MMM') : 'No upcoming deliveries', detail: next ? `${next.scheduledDeliveries} deliveries · ${next.customers} customers` : undefined, icon: <CalendarMonthOutlined />, tone: colors.mocca, tint: '#F5EEE9' },
  ];
  return <Stack spacing={3}>
    <Grid container spacing={2}>{metrics.map(metric => <Grid key={metric.title} size={{ xs: 12, sm: 6, xl: 3 }}><MetricCard {...metric} /></Grid>)}</Grid>
    <Grid container spacing={3} alignItems="stretch">
      <Grid size={{ xs: 12, xl: 8 }}><WorkloadCard days={data.nextSevenDays} /></Grid>
      <Grid size={{ xs: 12, xl: 4 }}><AttentionCard attention={data.needsAttention} /></Grid>
    </Grid>
    <DeliveriesCard deliveries={data.todayDeliveries} onOpenCalendar={onOpenCalendar} />
    <PlanActivityCard starting={data.upcomingPlanActivity.starting} ending={data.upcomingPlanActivity.ending} />
  </Stack>;
}

function MetricCard({ title, value, detail, icon, tone, tint }: { title: string; value: string | number; detail?: string; icon: ReactNode; tone: string; tint: string }) {
  return <Card sx={{ height: '100%', boxShadow: 'none' }}><CardContent><Stack direction="row" alignItems="center" gap={1.5}><Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: tint, color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box><Box minWidth={0}><Typography variant="body2" color="text.secondary">{title}</Typography><Typography variant={typeof value === 'number' ? 'h1' : 'h3'} mt={0.35} noWrap>{typeof value === 'number' ? value.toLocaleString() : value}</Typography>{detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}</Box></Stack></CardContent></Card>;
}

function WorkloadCard({ days }: { days: DeliveryWorkloadDay[] }) {
  const max = Math.max(1, ...days.map(day => day.scheduledDeliveries));
  return <Card sx={{ height: '100%' }}><CardContent sx={{ p: { xs: 2, md: 3 } }}><Typography variant="h3">Delivery workload</Typography><Typography variant="body2" color="text.secondary" mt={0.5} mb={2.5}>Scheduled workload for the next 7 days</Typography><Stack spacing={1.35}>{days.map(day => <Tooltip key={day.date} placement="top" arrow title={<Box><strong>{format(parseISO(day.date), 'EEEE, d MMMM')}</strong><br />{day.scheduledDeliveries} deliveries<br />{day.customers} customers<br />{day.meals} meals</Box>}><Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 0.35 }}><Typography sx={{ width: 62, flexShrink: 0, fontWeight: 750, color: day.hasDeliveries ? 'text.primary' : 'text.secondary' }}>{format(parseISO(day.date), 'EEE d')}</Typography><Box flex={1}><LinearProgress variant="determinate" value={(day.scheduledDeliveries / max) * 100} sx={{ height: 15, borderRadius: 2, bgcolor: '#EEF1EF', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: day.hasDeliveries ? 'primary.main' : 'transparent' } }} /></Box><Typography variant="body2" sx={{ width: 88, textAlign: 'end', color: day.hasDeliveries ? 'text.primary' : 'text.secondary', fontWeight: day.hasDeliveries ? 750 : 500 }}>{day.hasDeliveries ? `${day.scheduledDeliveries} deliveries` : 'No deliveries'}</Typography></Stack></Tooltip>)}</Stack></CardContent></Card>;
}

function AttentionCard({ attention }: { attention: DashboardAttention }) {
  const rows: Array<{ key: keyof DashboardAttention; label: string; icon: ReactNode; severity: 'warning' | 'error' }> = [
    { key: 'missingDeliveryAddresses', label: 'Missing delivery addresses', icon: <HomeWorkOutlined />, severity: 'error' },
    { key: 'ordersRequiringReview', label: 'Orders requiring review', icon: <PendingActionsOutlined />, severity: 'warning' },
    { key: 'plansEndingSoon', label: 'Plans ending soon', icon: <EventBusyOutlined />, severity: 'warning' },
    { key: 'customersWithoutUpcomingDelivery', label: 'Customers without upcoming delivery', icon: <GroupsOutlined />, severity: 'error' },
    { key: 'deliveryConflicts', label: 'Delivery conflicts', icon: <ErrorOutline />, severity: 'error' },
  ];
  return <Card sx={{ height: '100%' }}><CardContent><Stack direction="row" alignItems="center" gap={1}><WarningAmberOutlined color="warning" /><Typography variant="h3">Needs attention</Typography></Stack><List sx={{ mt: 1 }}>{rows.map(row => { const count = attention[row.key]; return <ListItem key={row.key} divider disableGutters><ListItemIcon sx={{ minWidth: 38, color: count ? `${row.severity}.main` : 'text.disabled' }}>{row.icon}</ListItemIcon><ListItemText primary={row.label} primaryTypographyProps={{ variant: 'body2', fontWeight: count ? 700 : 500 }} /><Chip size="small" label={count} color={count ? row.severity : 'success'} /><ArrowForward fontSize="small" sx={{ ms: 1, color: 'text.disabled' }} /></ListItem>; })}</List></CardContent></Card>;
}

function DeliveriesCard({ deliveries, onOpenCalendar }: { deliveries: OperationsDashboard['todayDeliveries']; onOpenCalendar: () => void }) {
  return <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography variant="h3">Today's deliveries</Typography><Button endIcon={<ArrowForward />} onClick={onOpenCalendar}>View all</Button></Stack>{deliveries.length === 0 ? <Stack alignItems="center" textAlign="center" py={5} spacing={1.25}><Box sx={{ width: 54, height: 54, borderRadius: '50%', bgcolor: '#EAF5F1', color: 'primary.main', display: 'grid', placeItems: 'center' }}><LocalShippingOutlined /></Box><Typography variant="h3">No deliveries scheduled</Typography><Typography color="text.secondary">There are no customer deliveries scheduled for this date.</Typography><Button variant="contained" onClick={onOpenCalendar}>Open Delivery Calendar</Button></Stack> : <TableContainer><Table size="small" aria-label="Today's deliveries"><TableHead><TableRow>{['Customer', 'Order', 'Meal plan', 'Meals', 'Area', 'Status'].map(column => <TableCell key={column}>{column}</TableCell>)}</TableRow></TableHead><TableBody>{deliveries.slice(0, 10).map(delivery => <TableRow hover key={delivery.orderId}><TableCell sx={{ fontWeight: 700 }}>{delivery.customerName}</TableCell><TableCell>{delivery.orderNumber}</TableCell><TableCell>{delivery.mealPlanName}</TableCell><TableCell>{delivery.mealCount}</TableCell><TableCell><Tooltip title={delivery.deliveryAddress || delivery.deliveryArea}><span>{delivery.deliveryArea || 'Not provided'}</span></Tooltip></TableCell><TableCell><Chip size="small" label={delivery.status} color={delivery.status === 'CONFIRMED' || delivery.status === 'SCHEDULED' ? 'success' : 'warning'} /></TableCell></TableRow>)}</TableBody></Table></TableContainer>}</CardContent></Card>;
}

function PlanActivityCard({ starting, ending }: { starting: PlanActivityDay[]; ending: PlanActivityDay[] }) {
  return <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}><Typography variant="h3" mb={2}>Upcoming plan activity</Typography><Grid container spacing={3}><ActivitySection title="Starting" rows={starting} empty="No plans starting" /><ActivitySection title="Ending" rows={ending} empty="No plans ending" /></Grid></CardContent></Card>;
}
function ActivitySection({ title, rows, empty }: { title: string; rows: PlanActivityDay[]; empty: string }) {
  return <Grid size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 2, height: '100%', boxShadow: 'none' }}><Typography fontWeight={800} mb={1}>{title}</Typography>{rows.length ? <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>{rows.map(row => <Stack key={row.date} direction="row" justifyContent="space-between" py={1}><Typography>{format(parseISO(row.date), 'd MMM')}</Typography><Typography fontWeight={750}>{row.customerCount} {row.customerCount === 1 ? 'customer' : 'customers'}</Typography></Stack>)}</Stack> : <Typography variant="body2" color="text.secondary">{empty}</Typography>}</Paper></Grid>;
}

function DashboardSkeleton() {
  return <Stack spacing={3} aria-label="Loading operations dashboard"><Grid container spacing={2}>{Array.from({ length: 4 }, (_, index) => <Grid key={index} size={{ xs: 12, sm: 6, xl: 3 }}><Skeleton variant="rounded" height={112} /></Grid>)}</Grid><Grid container spacing={3}><Grid size={{ xs: 12, xl: 8 }}><Skeleton variant="rounded" height={340} /></Grid><Grid size={{ xs: 12, xl: 4 }}><Skeleton variant="rounded" height={340} /></Grid></Grid><Skeleton variant="rounded" height={300} /><Skeleton variant="rounded" height={180} /></Stack>;
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Retry</Button>}><Typography fontWeight={800}>Unable to load operations dashboard</Typography><Typography variant="body2">We couldn't retrieve the latest delivery information.</Typography></Alert>;
}
