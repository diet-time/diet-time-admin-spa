import { Close, DinnerDiningOutlined, DownloadOutlined, EggAltOutlined, LocalCafeOutlined, LunchDiningOutlined, RestaurantMenuOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemIcon, ListItemText, Skeleton, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useEffect, useState, type ReactNode } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import type { DeliveryDateDetail, DeliveryPreparationMealType, DeliveryPreparationSummary } from '../types';
import { FulfillmentControl } from './FulfillmentControl';
import { dailyCounts, visibleDeliveries, type FulfillmentFilter } from '../fulfillment';

export function DateDetailsDrawer({ date, onClose, focusServiceDayId }: { date?: string; onClose: () => void; focusServiceDayId?: string }) {
  const [tab, setTab] = useState(0);
  const [notice, setNotice] = useState<string>();
  useEffect(() => setTab(0), [date, focusServiceDayId]);
  const query = useQuery({ queryKey: ['delivery-calendar-detail', date], queryFn: ({ signal }) => deliveryCalendarApi.detail(date!, signal), enabled: !!date, refetchInterval: 60_000, refetchOnWindowFocus: true });
  const preparation = useQuery({ queryKey: ['delivery-preparation-summary', date], queryFn: ({ signal }) => deliveryCalendarApi.preparationSummary(date!, signal), enabled: !!date && tab === 1 });
  useEffect(() => {
    if (!focusServiceDayId || !query.data || tab !== 0) return;
    const timer = window.setTimeout(() => document.getElementById(`service-day-${focusServiceDayId}`)?.scrollIntoView?.({ block: 'center' }), 0);
    return () => window.clearTimeout(timer);
  }, [focusServiceDayId, query.data, tab]);
  const past = date ? isBefore(parseISO(date), startOfDay(new Date())) : false;

  return <Drawer anchor="right" open={!!date} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 920 }, maxWidth: '100%' } } }}>
    <Stack direction="row" alignItems="center" p={2} borderBottom={1} borderColor="divider"><Box flex={1}><Typography variant="h2">{date ? format(parseISO(date), 'EEEE, d MMMM yyyy') : 'Order details'}</Typography><Typography color="text.secondary">Orders scheduled for this delivery date</Typography></Box><IconButton onClick={onClose} aria-label="Close details"><Close /></IconButton></Stack>
    {past && <Alert severity="info" sx={{ m: 2, mb: 0 }}>This is a past delivery date.</Alert>}
    {query.isError && query.data && <Alert severity="warning">Unable to refresh orders. Showing the last loaded data.</Alert>}
    {query.isLoading ? <Box p={3}><LoadingState /></Box> : !query.data ? <Box p={3}><ErrorState message="Unable to load order details." onRetry={() => void query.refetch()} /></Box> : <DrawerContent onSuccess={setNotice} date={date!} detail={query.data} tab={tab} onTab={setTab} preparation={preparation.data} preparationLoading={preparation.isLoading} preparationError={preparation.isError} onRetryPreparation={() => void preparation.refetch()} />}
    <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice(undefined)}><Alert severity="success" onClose={() => setNotice(undefined)}>{notice}</Alert></Snackbar>
  </Drawer>;
}

function DrawerContent({ date, detail, tab, onTab, preparation, preparationLoading, preparationError, onRetryPreparation, onSuccess }: { date: string; detail: DeliveryDateDetail; tab: number; onTab: (value: number) => void; preparation?: DeliveryPreparationSummary; preparationLoading: boolean; preparationError: boolean; onRetryPreparation: () => void; onSuccess: (message: string) => void }) {
  const [filter, setFilter] = useState<FulfillmentFilter>('All');
  const counts = dailyCounts(detail);
  const cards = [['Total Scheduled', counts.total], ['Pending', counts.pending], ['Overdue', counts.overdue], ['Fulfilled', counts.fulfilled]];
  return <>
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} p={2} aria-label="Daily fulfillment counts">
      {cards.map(([label, value]) => <Card key={label} component="section" aria-label={label + ' count'} sx={{ minWidth: 100, flex: 1, boxShadow: 'none' }}><CardContent sx={{ p: '12px !important' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></CardContent></Card>)}
    </Stack>
    <Tabs value={tab} onChange={(_, value: number) => onTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Date details"><Tab label="Scheduled orders" /><Tab label="Preparation Summary" /></Tabs><Divider />
    {tab === 0 && <>
      <Box sx={{ p: 2, overflowX: 'auto' }}><ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, value: FulfillmentFilter | null) => { if (value) setFilter(value); }} aria-label="Fulfillment filter">
        {(['All', 'Pending', 'Overdue', 'Delivered', 'Collected'] as const).map(value => <ToggleButton key={value} value={value}>{value}</ToggleButton>)}
      </ToggleButtonGroup></Box>
      <CustomerDeliveriesTable detail={detail} date={date} filter={filter} onSuccess={onSuccess} />
    </>}
    {tab === 1 && (preparationLoading ? <PreparationSkeleton /> : preparationError || !preparation ? <Box p={2}><ErrorState message="Unable to load the preparation summary." onRetry={onRetryPreparation} /></Box> : <PreparationSummary date={date} summary={preparation} />)}
  </>;
}

function CustomerDeliveriesTable({ detail, date, filter, onSuccess }: { detail: DeliveryDateDetail; date: string; filter: FulfillmentFilter; onSuccess: (message: string) => void }) {
  if (!detail.deliveries.length) return <Alert severity="info" sx={{ m: 2 }}>No orders are scheduled for this date.</Alert>;
  const deliveries = visibleDeliveries(detail.deliveries, filter);
  return <TableContainer><Table size="small" aria-label="Scheduled orders">
    <TableHead><TableRow>{['Order', 'Customer', 'Service date', 'Plan', 'Meals', 'Fulfillment', 'Slot / address', 'Approval', 'Service day'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
    <TableBody>{deliveries.map(delivery => <TableRow id={delivery.serviceDayId ? `service-day-${delivery.serviceDayId}` : undefined} key={delivery.serviceDayId ?? delivery.id} sx={delivery.isOverdue ? { bgcolor: '#FFF3F3', '& > td:first-of-type': { borderLeft: '3px solid', borderLeftColor: 'error.main' } } : undefined}>
      <TableCell>{delivery.orderNumber}</TableCell><TableCell>{delivery.customerName}</TableCell><TableCell>{delivery.serviceDate ?? date}</TableCell><TableCell>{delivery.planName}</TableCell><TableCell>{delivery.mealCount}</TableCell>
      <TableCell>{delivery.fulfillmentMethod === 'TAKEAWAY' ? 'Takeaway' : 'Home Delivery'}</TableCell>
      <TableCell>{delivery.fulfillmentMethod === 'TAKEAWAY' ? [delivery.takeawayBranchName ?? 'Branch not recorded', delivery.takeawayBranchAddress].filter(Boolean).join(' · ') : <>{delivery.deliverySlot}<Typography variant="caption" display="block">{delivery.deliveryAddress || 'Address not recorded'}</Typography></>}</TableCell>
      <TableCell><Chip size="small" label={delivery.status} color={delivery.status === 'CONFIRMED' ? 'success' : 'default'} /></TableCell>
      <TableCell><FulfillmentControl key={date + (delivery.serviceDayId ?? delivery.id)} date={date} {...delivery} fulfillmentStatus={delivery.fulfillmentStatus ?? 'SCHEDULED'} onSuccess={onSuccess} /></TableCell>
    </TableRow>)}{!deliveries.length && <TableRow><TableCell colSpan={9}>No service days match this filter.</TableCell></TableRow>}</TableBody>
  </Table></TableContainer>;
}

const mealVisual = (name: string): { icon: ReactNode; color: string; tint: string } => {
  const normalized = name.toLowerCase();
  if (normalized.includes('breakfast')) return { icon: <EggAltOutlined />, color: '#E38B24', tint: '#FFF7E8' };
  if (normalized.includes('lunch')) return { icon: <LunchDiningOutlined />, color: '#2E8B57', tint: '#EDF8F1' };
  if (normalized.includes('dinner')) return { icon: <DinnerDiningOutlined />, color: '#7756A8', tint: '#F4F0FA' };
  if (normalized.includes('snack') || normalized.includes('dessert')) return { icon: <LocalCafeOutlined />, color: '#C94E73', tint: '#FFF0F4' };
  return { icon: <RestaurantMenuOutlined />, color: '#397B69', tint: '#EEF7F4' };
};

const dietaryLabel = (value: string): string => value.split(':').map(part => {
  const text = part.trim();
  if (!text.includes('_') && /[a-z]/.test(text)) return text;
  return text.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}).join(': ');

const selectionLabel = (status: string) => status === 'CUSTOMER_CONFIRMED' ? 'Customer confirmed'
  : status === 'AUTO_FINALIZED' ? 'Automatically assigned' : status === 'UNFINALIZED' ? 'Selection pending' : dietaryLabel(status);

export function PreparationSummary({ date, summary }: { date: string; summary: DeliveryPreparationSummary }) {
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error'>();

  const downloadReport = async () => {
    setDownloading(true);
    setFeedback(undefined);
    try {
      const report = await deliveryCalendarApi.preparationReport(date);
      const url = URL.createObjectURL(report.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback('success');
    } catch {
      setFeedback('error');
    } finally {
      setDownloading(false);
    }
  };

  const heading = <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap"><Typography variant="overline" fontWeight={800}>Menu items to prepare</Typography><Button size="small" variant="outlined" startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlined />} disabled={downloading} onClick={() => void downloadReport()}>Download PDF</Button></Stack>;
  const feedbackToast = <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(undefined)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>{feedback === 'error' ? <Alert severity="error" variant="filled" onClose={() => setFeedback(undefined)}><Typography variant="body2">Unable to download preparation report.</Typography><Typography variant="body2">Please try again.</Typography></Alert> : <Alert severity="success" variant="filled" onClose={() => setFeedback(undefined)}>Preparation report downloaded.</Alert>}</Snackbar>;

  const selectionStatus = <Stack spacing={1}>

    <Alert severity={summary.isPreliminary || summary.status === 'NeedsReview' ? 'warning' : 'success'}>{summary.isPreliminary ? 'Preliminary — quantities include confirmed or automatically assigned, locked meal selections only.' : summary.status === 'Finalized' ? 'Meal selections locked' : summary.status}</Alert>
    {(summary.operationalExceptions ?? []).map((issue, i) => <Alert severity="error" key={i}>{issue}</Alert>)}
    {(summary.selections ?? []).map(selection => <Card key={selection.serviceDayId} variant="outlined"><CardContent>
      <Typography fontWeight={800}>{selection.orderReference} · {selectionLabel(selection.finalizationStatus)}</Typography>
      <Typography variant="caption">{selection.customerName?.trim() || 'Name not recorded'}{selection.selectionSources.length ? ` · ${selection.selectionSources.map(dietaryLabel).join(', ')}` : ''}</Typography>
      <Typography variant="body2">{selection.fulfillmentMethod === 'TAKEAWAY' ? ['Takeaway', selection.takeawayBranchName ?? 'Branch not recorded', selection.takeawayBranchAddress].filter(Boolean).join(' · ') : `Home Delivery · ${selection.deliveryAddress || 'Address not recorded'}`}</Typography>
      <Typography variant="body2">Dietary requirements: {(selection.dietaryRestrictionLabels?.length ? selection.dietaryRestrictionLabels : selection.dietaryRestrictions.map(dietaryLabel)).join(', ') || 'None recorded'}</Typography>
      {selection.dishes.map((dish, i) => <Typography key={i} variant="body2">{dish.quantity} × {dish.mealName} ({dish.category})</Typography>)}
      {selection.reviewReason && <Alert severity="error">{selection.reviewReason}</Alert>}
    </CardContent></Card>)}
  </Stack>;
  if (!summary.mealTypes.length) return <Stack p={2} spacing={2}>{selectionStatus}{heading}<Stack alignItems="center" textAlign="center" spacing={1} py={5} px={2}><RestaurantMenuOutlined color="primary" sx={{ fontSize: 44 }} /><Typography variant="h3">{summary.isPreliminary ? 'No locked meal selections yet' : 'No preparation required'}</Typography><Typography color="text.secondary">{summary.isPreliminary ? 'Review pending service days before preparing meals.' : 'There are no meals scheduled for preparation on this delivery date.'}</Typography></Stack>{feedbackToast}</Stack>;
  return <Stack spacing={2} p={2}>{selectionStatus}<Grid container spacing={2} alignItems="flex-start"><Grid size={{ xs: 12, md: 4 }}><Stack spacing={2}><OverviewCard mealTypes={summary.mealTypes} /><PlanBreakdown summary={summary} /></Stack></Grid><Grid size={{ xs: 12, md: 8 }}>{heading}<Stack spacing={1.5} mt={0.75}>{summary.mealTypes.map(group => <MealTypeCard key={group.mealTypeId} group={group} />)}</Stack></Grid></Grid><Card sx={{ boxShadow: 'none', bgcolor: '#EEF8F4', borderColor: '#D5EADF' }}><CardContent sx={{ p: '14px 16px !important' }}><Stack direction="row" alignItems="center" gap={1.25}><RestaurantMenuOutlined color="primary" /><Box flex={1}><Typography fontWeight={800}>Total Meal Items to Prepare</Typography><Typography variant="caption" color="text.secondary">Across {summary.orderCount} orders and {summary.customerCount} customers</Typography></Box><Typography variant="h2" color="primary.main">{summary.mealItemCount}</Typography></Stack></CardContent></Card>{feedbackToast}</Stack>;
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
