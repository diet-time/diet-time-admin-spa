import { ExpandMore, Close, DinnerDiningOutlined, DownloadOutlined, EggAltOutlined, LocalCafeOutlined, LunchDiningOutlined, RestaurantMenuOutlined } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemText, Skeleton, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useEffect, useState, type ReactNode } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import type { DeliveryDateDetail, DeliveryPreparationMealType, DeliveryPreparationSummary, KitchenSelection } from '../types';
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

  return <Drawer anchor="right" open={!!date} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 880 }, maxWidth: '100%', overflow: 'hidden', '& > *': { flexShrink: 0 } } } }}>
    <Stack direction="row" alignItems="center" p={2} borderBottom={1} borderColor="divider"><Box flex={1} minWidth={0}><Typography variant="h2" sx={{ fontSize: { xs: 20, sm: 26 } }}>{date ? format(parseISO(date), 'EEEE, d MMMM yyyy') : 'Order details'}</Typography><Typography color="text.secondary">Orders scheduled for this delivery date</Typography></Box><IconButton onClick={onClose} aria-label="Close details"><Close /></IconButton></Stack>
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
    <Box display="grid" gridTemplateColumns="repeat(4, minmax(0, 1fr))" gap={1} p={1.5} aria-label="Daily fulfillment counts">
      {cards.map(([label, value]) => <Card key={label} component="section" aria-label={label + ' count'} sx={{ minWidth: 0, boxShadow: 'none' }}><CardContent sx={{ p: '12px !important' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></CardContent></Card>)}
    </Box>
    <Tabs value={tab} onChange={(_, value: number) => onTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Date details"><Tab label="Scheduled orders" /><Tab label="Preparation Summary" /></Tabs><Divider />
    <Box sx={{ overflowY: 'auto', minHeight: 0, flex: '1 1 auto', overflowX: 'hidden' }}>
    {tab === 0 && <>
      <Box sx={{ p: 1.5 }}><ToggleButtonGroup sx={{ flexWrap: 'wrap' }} exclusive size="small" value={filter} onChange={(_, value: FulfillmentFilter | null) => { if (value) setFilter(value); }} aria-label="Fulfillment filter">
        {(['All', 'Pending', 'Overdue', 'Delivered', 'Collected'] as const).map(value => <ToggleButton key={value} value={value}>{value}</ToggleButton>)}
      </ToggleButtonGroup></Box>
      <CustomerDeliveriesTable detail={detail} date={date} filter={filter} onSuccess={onSuccess} />
    </>}
    {tab === 1 && (preparationLoading ? <PreparationSkeleton /> : preparationError || !preparation ? <Box p={2}><ErrorState message="Unable to load the preparation summary." onRetry={onRetryPreparation} /></Box> : <PreparationSummary date={date} summary={preparation} />)}
    </Box>
  </>;
}

function CustomerDeliveriesTable({ detail, date, filter, onSuccess }: { detail: DeliveryDateDetail; date: string; filter: FulfillmentFilter; onSuccess: (message: string) => void }) {
  if (!detail.deliveries.length) return <Alert severity="info" sx={{ m: 2 }}>No orders are scheduled for this date.</Alert>;
  const deliveries = visibleDeliveries(detail.deliveries, filter);
  return <Stack component="section" spacing={1} px={1.5} pb={2} aria-label="Scheduled orders">
    {deliveries.map(delivery => <Card component="article" aria-label={delivery.orderNumber} id={delivery.serviceDayId ? 'service-day-' + delivery.serviceDayId : undefined} key={delivery.serviceDayId ?? delivery.id} variant="outlined" sx={{ minWidth: 0, overflowWrap: 'anywhere', borderRadius: 1.5, ...(delivery.isOverdue ? { bgcolor: '#FFF3F3', borderColor: '#F4C9C5' } : {}) }}>
      <Box p={1.5}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5} flexWrap="wrap">
        <Box flex="1 1 200px" minWidth={0}><Typography fontWeight={800}>{delivery.customerName}</Typography><Typography variant="body2" color="text.secondary">{delivery.orderNumber} · {delivery.planName}</Typography></Box>
        <FulfillmentControl key={date + (delivery.serviceDayId ?? delivery.id)} date={date} {...delivery} fulfillmentStatus={delivery.fulfillmentStatus ?? 'SCHEDULED'} onSuccess={onSuccess} />
      </Stack><Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" mt={0.75}>
        <Typography variant="body2">{delivery.mealCount} meal/snack items · {delivery.fulfillmentMethod === 'TAKEAWAY' ? 'Takeaway' : 'Home Delivery'}</Typography>
        <Chip size="small" label={delivery.status} color={delivery.status === 'CONFIRMED' ? 'success' : 'default'} sx={{ height: 21, fontSize: 11 }} />
      </Stack><Typography variant="body2" color="text.secondary" mt={0.5}>{delivery.fulfillmentMethod === 'TAKEAWAY' ? [delivery.takeawayBranchName ?? 'Branch not recorded', delivery.takeawayBranchAddress].filter(Boolean).join(' · ') : [delivery.deliverySlot, delivery.deliveryAddress || 'Address not recorded'].filter(Boolean).join(' · ')}</Typography></Box>
    </Card>)}
    {!deliveries.length && <Typography p={1}>No service days match this filter.</Typography>}
  </Stack>;
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

  const heading = <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap"><Typography variant="h3">Preparation Summary</Typography><Button size="small" variant="outlined" startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlined />} disabled={downloading} onClick={() => void downloadReport()}>Download PDF</Button></Stack>;
  const snacks = summary.mealTypes.filter(g => g.mealClassification === 'snack').reduce((sum, g) => sum + g.quantity, 0);
  const groups = [...summary.mealTypes].sort((a, b) => (a.mealCategoryDisplayOrder ?? 0) - (b.mealCategoryDisplayOrder ?? 0));
  return <Stack spacing={1.5} p={1.5}>
    {heading}
    <Alert severity={summary.isPreliminary || summary.status === 'NeedsReview' ? 'warning' : 'success'}>{summary.isPreliminary ? 'Preliminary — quantities include confirmed or automatically assigned, locked meal selections only.' : summary.status === 'Finalized' ? 'Meal selections locked' : summary.status}</Alert>
    {(summary.operationalExceptions ?? []).map((issue, i) => <Alert severity="error" key={i}>{issue}</Alert>)}
    <Box component="section" aria-label="Preparation overview" display="grid" gridTemplateColumns={{ xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }} gap={1}>
      {[['Eligible orders', summary.orderCount], ['Meal portions', summary.mealItemCount - snacks], ['Snack portions', snacks], ['Total portions', summary.mealItemCount]].map(([label, value]) => <Box key={label} p={1.25} bgcolor="#EEF7F4" borderRadius={1}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800} fontSize={22}>{value}</Typography></Box>)}
    </Box>
    <Stack direction="row" gap={0.75} flexWrap="wrap" aria-label="Preparation category totals">{groups.map(group => <Chip key={group.mealTypeId + group.mealClassification} size="small" variant="outlined" label={group.mealTypeName + ' · ' + group.quantity} />)}</Stack>
    <Typography variant="overline" fontWeight={800}>Menu items to prepare</Typography>
    {groups.map(group => <MealTypeCard key={group.mealTypeId + group.mealClassification} group={group} />)}
    {!groups.length && <Box py={2}><Typography variant="h3">{summary.isPreliminary ? 'No locked meal selections yet' : 'No preparation required'}</Typography><Typography color="text.secondary">{summary.isPreliminary ? 'Review pending service days before preparing meals.' : 'There are no meals scheduled for preparation on this delivery date.'}</Typography></Box>}
    <Typography variant="overline" fontWeight={800}>Customer preparation details</Typography>
    {(summary.selections ?? []).map(selection => <CustomerPreparation key={selection.serviceDayId} selection={selection} />)}
    <PlanBreakdown summary={summary} />
    <Snackbar open={!!feedback} autoHideDuration={4000} onClose={() => setFeedback(undefined)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>{feedback === 'error' ? <Alert severity="error" variant="filled" onClose={() => setFeedback(undefined)}><Typography variant="body2">Unable to download preparation report.</Typography><Typography variant="body2">Please try again.</Typography></Alert> : <Alert severity="success" variant="filled" onClose={() => setFeedback(undefined)}>Preparation report downloaded.</Alert>}</Snackbar>
  </Stack>;
}

// Legacy prefixes are parsed only at the beginning; no customer data is rewritten.
const cleanLabels = (values: string[]) => {
  const labels = new Map<string, string>();
  for (const value of values) {
    const label = dietaryLabel(value.trim());
    const key = label.toLocaleLowerCase();
    if (label && key !== 'none' && !labels.has(key)) labels.set(key, label);
  }
  return [...labels.values()];
};
const dietaryGroups = (selection: KitchenSelection) => {
  const legacy = selection.dietaryRestrictionLabels?.length ? selection.dietaryRestrictionLabels : selection.dietaryRestrictions;
  return {
    preferences: cleanLabels(selection.foodPreferences ?? legacy.filter(v => !/^allergen:/i.test(v.trim()))),
    allergens: cleanLabels((selection.allergens ?? legacy.filter(v => /^allergen:/i.test(v.trim()))).map(v => v.trim().replace(/^allergen:\s*/i, ''))),
  };
};

function CustomerPreparation({ selection }: { selection: KitchenSelection }) {
  const dietary = dietaryGroups(selection);
  const dishes = [...selection.dishes].sort((a, b) => (a.mealCategoryDisplayOrder ?? Number.MAX_SAFE_INTEGER) - (b.mealCategoryDisplayOrder ?? Number.MAX_SAFE_INTEGER));
  const groups = new Map<string, { name: string; dishes: typeof dishes }>();
  for (const dish of dishes) {
    const name = dish.mealCategoryName || ((dish.mealClassification ?? dish.category) === 'snack' ? 'Uncategorized Snack' : 'Uncategorized Meal');
    const key = dish.mealCategoryId || name;
    if (!groups.has(key)) groups.set(key, { name, dishes: [] });
    groups.get(key)!.dishes.push(dish);
  }
  return <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px !important', '&:before': { display: 'none' }, overflowWrap: 'anywhere' }}>
    <AccordionSummary expandIcon={<ExpandMore />}><Box minWidth={0} flex={1}>
      <Typography fontWeight={800}>{selection.customerName?.trim() || 'Name not recorded'}</Typography>
      <Typography variant="body2">{selection.orderReference} · {selectionLabel(selection.finalizationStatus)}</Typography>
      <Typography variant="caption" color="text.secondary">{selection.mealPlanName || 'Plan not recorded'} · {selection.fulfillmentMethod === 'TAKEAWAY' ? 'Takeaway' : 'Home Delivery'} · {selection.dishes.reduce((sum, d) => sum + d.quantity, 0)} portions</Typography>
      {selection.selectionSources.length > 0 && <Typography variant="caption" display="block">{selection.selectionSources.map(source => source === 'DEFAULT' ? 'Automatically Assigned' : source === 'CUSTOMER' ? 'Customer Selected' : dietaryLabel(source)).join(', ')}</Typography>}
      {dietary.allergens.length > 0 && <Typography variant="body2" color="error.main" fontWeight={750}>Allergens: {dietary.allergens.join(', ')}</Typography>}
    </Box></AccordionSummary>
    <AccordionDetails sx={{ pt: 0 }}>
      <Typography variant="caption" display="block" color="text.secondary">{['CUSTOMER_CONFIRMED', 'AUTO_FINALIZED'].includes(selection.finalizationStatus) ? 'Meal selections locked' : 'Selection pending'}</Typography>
      {[...groups.entries()].map(([key, group]) => <Box key={key} mt={1}><Typography variant="body2" fontWeight={800}>{group.name}</Typography>{group.dishes.map((dish, i) => <Typography key={i} variant="body2">{dish.quantity} × {dish.mealName}</Typography>)}</Box>)}
      <Typography variant="body2" mt={1}>Food Preferences: {dietary.preferences.join(', ') || 'None specified'}</Typography>
      {!dietary.allergens.length && <Typography variant="body2" fontWeight={750}>Allergens: None specified</Typography>}
      <Typography variant="body2" color="text.secondary" mt={0.5}>{selection.fulfillmentMethod === 'TAKEAWAY' ? ['Takeaway', selection.takeawayBranchName ?? 'Branch not recorded', selection.takeawayBranchAddress].filter(Boolean).join(' · ') : 'Home Delivery · ' + (selection.deliveryAddress || 'Address not recorded')}</Typography>
      {selection.reviewReason && <Alert severity="error">{selection.reviewReason}</Alert>}
    </AccordionDetails>
  </Accordion>;
}

function PlanBreakdown({ summary }: { summary: DeliveryPreparationSummary }) {
  return <Card sx={{ boxShadow: 'none' }}><CardContent><Typography variant="overline" fontWeight={800}>Plan breakdown</Typography><List dense disablePadding sx={{ mt: 0.75 }}>{summary.planBreakdown.map(plan => <ListItem key={plan.mealPlanId} divider disableGutters><ListItemText primary={plan.mealPlanName} /><Typography variant="body2" color="text.secondary">{plan.orderCount} {plan.orderCount === 1 ? 'order' : 'orders'}</Typography></ListItem>)}</List></CardContent></Card>;
}

function MealTypeCard({ group }: { group: DeliveryPreparationMealType }) {
  const visual = mealVisual(group.mealTypeName);
  return <Card sx={{ boxShadow: 'none', overflow: 'hidden' }}><Stack direction="row" alignItems="center" gap={1} px={1.5} py={1} bgcolor={visual.tint} color={visual.color}>{visual.icon}<Typography variant="body2" fontWeight={850}>{group.mealTypeName.toUpperCase()}</Typography></Stack><TableContainer><Table size="small" sx={{ tableLayout: 'fixed', '& td, & th': { overflowWrap: 'anywhere' } }} aria-label={`${group.mealTypeName} menu items`}><TableHead><TableRow><TableCell>Menu Item</TableCell><TableCell align="right" width={110}>Quantity</TableCell></TableRow></TableHead><TableBody>{group.items.map(item => <TableRow key={item.menuItemId}><TableCell>{item.menuItemName}</TableCell><TableCell align="right" sx={{ fontWeight: 750 }}>{item.quantity}</TableCell></TableRow>)}<TableRow><TableCell sx={{ fontWeight: 850, color: 'primary.main' }}>Total</TableCell><TableCell align="right" sx={{ fontWeight: 850, color: 'primary.main' }}>{group.quantity}</TableCell></TableRow></TableBody></Table></TableContainer></Card>;
}

function PreparationSkeleton() {
  return <Grid container spacing={2} p={2} aria-label="Loading preparation summary"><Grid size={{ xs: 12, md: 4 }}><Stack spacing={2}><Skeleton variant="rounded" height={210} /><Skeleton variant="rounded" height={150} /></Stack></Grid><Grid size={{ xs: 12, md: 8 }}><Stack spacing={1.5}><Skeleton width={180} /><Skeleton variant="rounded" height={170} /><Skeleton variant="rounded" height={170} /><Skeleton variant="rounded" height={170} /></Stack></Grid></Grid>;
}
