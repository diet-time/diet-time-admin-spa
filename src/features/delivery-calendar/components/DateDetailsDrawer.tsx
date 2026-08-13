import { Close, DinnerDiningOutlined, EggAltOutlined, LocalCafeOutlined, LunchDiningOutlined, RestaurantMenuOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Alert, Box, Card, CardContent, Chip, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemIcon, ListItemText, Skeleton, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useEffect, useState, type ReactNode } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import type { DeliveryDateDetail, DeliveryPreparationMealType, DeliveryPreparationSummary } from '../types';

export function DateDetailsDrawer({ date, onClose }: { date?: string; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  useEffect(() => setTab(0), [date]);
  const query = useQuery({ queryKey: ['delivery-calendar-detail', date], queryFn: ({ signal }) => deliveryCalendarApi.detail(date!, signal), enabled: !!date });
  const preparation = useQuery({ queryKey: ['delivery-preparation-summary', date], queryFn: ({ signal }) => deliveryCalendarApi.preparationSummary(date!, signal), enabled: !!date && tab === 1 });
  const past = date ? isBefore(parseISO(date), startOfDay(new Date())) : false;

  return <Drawer anchor="right" open={!!date} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 920 }, maxWidth: '100%' } } }}>
    <Stack direction="row" alignItems="center" p={2} borderBottom={1} borderColor="divider"><Box flex={1}><Typography variant="h2">{date ? format(parseISO(date), 'EEEE, d MMMM yyyy') : 'Order details'}</Typography><Typography color="text.secondary">Orders scheduled for this delivery date</Typography></Box><IconButton onClick={onClose} aria-label="Close details"><Close /></IconButton></Stack>
    {past && <Alert severity="info" sx={{ m: 2, mb: 0 }}>This is a past delivery date.</Alert>}
    {query.isLoading ? <Box p={3}><LoadingState /></Box> : query.isError || !query.data ? <Box p={3}><ErrorState message="Unable to load order details." onRetry={() => void query.refetch()} /></Box> : <DrawerContent detail={query.data} tab={tab} onTab={setTab} preparation={preparation.data} preparationLoading={preparation.isLoading} preparationError={preparation.isError} onRetryPreparation={() => void preparation.refetch()} />}
  </Drawer>;
}

function DrawerContent({ detail, tab, onTab, preparation, preparationLoading, preparationError, onRetryPreparation }: { detail: DeliveryDateDetail; tab: number; onTab: (value: number) => void; preparation?: DeliveryPreparationSummary; preparationLoading: boolean; preparationError: boolean; onRetryPreparation: () => void }) {
  const cards = [['Status', detail.day.operationalStatus.replaceAll('_', ' ')], ['Orders', detail.day.totalDeliveries], ['Customers', detail.day.totalCustomers], ['Meal items', detail.totalMealItems]];
  return <><Stack direction="row" flexWrap="wrap" useFlexGap gap={1.25} p={2}>{cards.map(([label, value]) => <Card key={label} sx={{ minWidth: 120, flex: 1, boxShadow: 'none' }}><CardContent sx={{ p: '12px !important' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></CardContent></Card>)}</Stack><Tabs value={tab} onChange={(_, value: number) => onTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Date details"><Tab label="Scheduled orders" /><Tab label="Preparation Summary" /></Tabs><Divider />{tab === 0 && <CustomerDeliveriesTable detail={detail} />}{tab === 1 && (preparationLoading ? <PreparationSkeleton /> : preparationError || !preparation ? <Box p={2}><ErrorState message="Unable to load the preparation summary." onRetry={onRetryPreparation} /></Box> : <PreparationSummary summary={preparation} />)}</>;
}

function CustomerDeliveriesTable({ detail }: { detail: DeliveryDateDetail }) {
  if (!detail.deliveries.length) return <Alert severity="info" sx={{ m: 2 }}>No orders are scheduled for this date.</Alert>;
  return <TableContainer><Table size="small" aria-label="Scheduled orders"><TableHead><TableRow>{['Order', 'Customer', 'Plan', 'Meals', 'Slot', 'Status', ''].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{detail.deliveries.map(delivery => <TableRow key={delivery.id}><TableCell>{delivery.orderNumber}</TableCell><TableCell>{delivery.customerName}</TableCell><TableCell>{delivery.planName}</TableCell><TableCell>{delivery.mealCount}</TableCell><TableCell>{delivery.deliverySlot}</TableCell><TableCell><Chip size="small" label={delivery.status} color={delivery.status === 'CONFIRMED' ? 'success' : 'default'} /></TableCell><TableCell><IconButton aria-label={`View order ${delivery.orderNumber}`}><VisibilityOutlined /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>;
}

const mealVisual = (name: string): { icon: ReactNode; color: string; tint: string } => {
  const normalized = name.toLowerCase();
  if (normalized.includes('breakfast')) return { icon: <EggAltOutlined />, color: '#E38B24', tint: '#FFF7E8' };
  if (normalized.includes('lunch')) return { icon: <LunchDiningOutlined />, color: '#2E8B57', tint: '#EDF8F1' };
  if (normalized.includes('dinner')) return { icon: <DinnerDiningOutlined />, color: '#7756A8', tint: '#F4F0FA' };
  if (normalized.includes('snack') || normalized.includes('dessert')) return { icon: <LocalCafeOutlined />, color: '#C94E73', tint: '#FFF0F4' };
  return { icon: <RestaurantMenuOutlined />, color: '#397B69', tint: '#EEF7F4' };
};

function PreparationSummary({ summary }: { summary: DeliveryPreparationSummary }) {
  if (!summary.mealTypes.length) return <Stack alignItems="center" textAlign="center" spacing={1} py={7} px={2}><RestaurantMenuOutlined color="primary" sx={{ fontSize: 44 }} /><Typography variant="h3">No preparation required</Typography><Typography color="text.secondary">There are no meals scheduled for preparation on this delivery date.</Typography></Stack>;
  return <Stack spacing={2} p={2}><Grid container spacing={2} alignItems="flex-start"><Grid size={{ xs: 12, md: 4 }}><Stack spacing={2}><OverviewCard mealTypes={summary.mealTypes} /><PlanBreakdown summary={summary} /></Stack></Grid><Grid size={{ xs: 12, md: 8 }}><Typography variant="overline" fontWeight={800}>Menu items to prepare</Typography><Stack spacing={1.5} mt={0.75}>{summary.mealTypes.map(group => <MealTypeCard key={group.mealTypeId} group={group} />)}</Stack></Grid></Grid><Card sx={{ boxShadow: 'none', bgcolor: '#EEF8F4', borderColor: '#D5EADF' }}><CardContent sx={{ p: '14px 16px !important' }}><Stack direction="row" alignItems="center" gap={1.25}><RestaurantMenuOutlined color="primary" /><Box flex={1}><Typography fontWeight={800}>Total Meal Items to Prepare</Typography><Typography variant="caption" color="text.secondary">Across {summary.orderCount} orders and {summary.customerCount} customers</Typography></Box><Typography variant="h2" color="primary.main">{summary.mealItemCount}</Typography></Stack></CardContent></Card></Stack>;
}

function OverviewCard({ mealTypes }: { mealTypes: DeliveryPreparationMealType[] }) {
  return <Card sx={{ boxShadow: 'none' }}><CardContent><Typography variant="overline" fontWeight={800}>Preparation overview</Typography><List dense disablePadding sx={{ mt: 0.75 }}>{mealTypes.map(group => { const visual = mealVisual(group.mealTypeName); return <ListItem key={group.mealTypeId} divider disableGutters><ListItemIcon sx={{ minWidth: 34, color: visual.color }}>{visual.icon}</ListItemIcon><ListItemText primary={group.mealTypeName} /><Typography fontWeight={800}>{group.quantity}</Typography></ListItem>; })}</List></CardContent></Card>;
}

function PlanBreakdown({ summary }: { summary: DeliveryPreparationSummary }) {
  return <Card sx={{ boxShadow: 'none' }}><CardContent><Typography variant="overline" fontWeight={800}>Plan breakdown</Typography><List dense disablePadding sx={{ mt: 0.75 }}>{summary.planBreakdown.map(plan => <ListItem key={plan.mealPlanId} divider disableGutters><ListItemText primary={plan.mealPlanName} /><Typography variant="body2" color="text.secondary">{plan.orderCount} {plan.orderCount === 1 ? 'order' : 'orders'}</Typography></ListItem>)}</List></CardContent></Card>;
}

function MealTypeCard({ group }: { group: DeliveryPreparationMealType }) {
  const visual = mealVisual(group.mealTypeName);
  return <Card sx={{ boxShadow: 'none', overflow: 'hidden' }}><Stack direction="row" alignItems="center" gap={1} px={1.5} py={1} bgcolor={visual.tint} color={visual.color}>{visual.icon}<Typography variant="body2" fontWeight={850}>{group.mealTypeName.toUpperCase()}</Typography></Stack><TableContainer><Table size="small" aria-label={`${group.mealTypeName} menu items`}><TableHead><TableRow><TableCell>Menu Item</TableCell><TableCell align="right" width={110}>Quantity</TableCell></TableRow></TableHead><TableBody>{group.items.map(item => <TableRow key={item.menuItemId}><TableCell>{item.menuItemName}</TableCell><TableCell align="right" sx={{ fontWeight: 750 }}>{item.quantity}</TableCell></TableRow>)}<TableRow><TableCell sx={{ fontWeight: 850, color: 'primary.main' }}>Total</TableCell><TableCell align="right" sx={{ fontWeight: 850, color: 'primary.main' }}>{group.quantity}</TableCell></TableRow></TableBody></Table></TableContainer></Card>;
}

function PreparationSkeleton() {
  return <Grid container spacing={2} p={2} aria-label="Loading preparation summary"><Grid size={{ xs: 12, md: 4 }}><Stack spacing={2}><Skeleton variant="rounded" height={210} /><Skeleton variant="rounded" height={150} /></Stack></Grid><Grid size={{ xs: 12, md: 8 }}><Stack spacing={1.5}><Skeleton width={180} /><Skeleton variant="rounded" height={170} /><Skeleton variant="rounded" height={170} /><Skeleton variant="rounded" height={170} /></Stack></Grid></Grid>;
}
