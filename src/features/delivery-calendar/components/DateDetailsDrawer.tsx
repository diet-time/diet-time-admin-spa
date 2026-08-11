import { Close, VisibilityOutlined } from '@mui/icons-material';
import { Alert, Box, Card, CardContent, Chip, Divider, Drawer, IconButton, List, ListItem, ListItemText, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useState } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import type { DeliveryDateDetail } from '../types';

export function DateDetailsDrawer({ date, onClose }: { date?: string; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const query = useQuery({
    queryKey: ['delivery-calendar-detail', date],
    queryFn: ({ signal }) => deliveryCalendarApi.detail(date!, signal),
    enabled: !!date,
  });
  const past = date ? isBefore(parseISO(date), startOfDay(new Date())) : false;

  return <Drawer anchor="right" open={!!date} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 760 }, maxWidth: '100%' } } }}>
    <Stack direction="row" alignItems="center" p={2} borderBottom={1} borderColor="divider">
      <Box flex={1}>
        <Typography variant="h2">{date ? format(parseISO(date), 'EEEE, d MMMM yyyy') : 'Order details'}</Typography>
        <Typography color="text.secondary">Orders scheduled for this delivery date</Typography>
      </Box>
      <IconButton onClick={onClose} aria-label="Close details"><Close /></IconButton>
    </Stack>
    {past && <Alert severity="info" sx={{ m: 2, mb: 0 }}>This is a past delivery date.</Alert>}
    {query.isLoading ? <Box p={3}><LoadingState /></Box> : query.isError || !query.data
      ? <Box p={3}><ErrorState message="Unable to load order details." onRetry={() => void query.refetch()} /></Box>
      : <DrawerContent detail={query.data} tab={tab} onTab={setTab} />}
  </Drawer>;
}

function DrawerContent({ detail, tab, onTab }: { detail: DeliveryDateDetail; tab: number; onTab: (value: number) => void }) {
  const cards = [
    ['Status', detail.day.operationalStatus.replaceAll('_', ' ')],
    ['Orders', detail.day.totalDeliveries],
    ['Customers', detail.day.totalCustomers],
    ['Meal items', detail.totalMealItems],
  ];
  return <>
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.25} p={2}>
      {cards.map(([label, value]) => <Card key={label} sx={{ minWidth: 120, flex: 1, boxShadow: 'none' }}>
        <CardContent sx={{ p: '12px !important' }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography fontWeight={800}>{value}</Typography>
        </CardContent>
      </Card>)}
    </Stack>
    <Tabs value={tab} onChange={(_, value: number) => onTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Date details">
      <Tab label="Scheduled orders" />
      <Tab label="Meal quantities" />
    </Tabs>
    <Divider />
    {tab === 0 && <CustomerDeliveriesTable detail={detail} />}
    {tab === 1 && <ProductionSummary detail={detail} />}
  </>;
}

function CustomerDeliveriesTable({ detail }: { detail: DeliveryDateDetail }) {
  if (!detail.deliveries.length) return <Alert severity="info" sx={{ m: 2 }}>No orders are scheduled for this date.</Alert>;
  return <TableContainer><Table size="small" aria-label="Scheduled orders">
    <TableHead><TableRow>{['Order', 'Customer', 'Plan', 'Meals', 'Slot', 'Status', ''].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
    <TableBody>{detail.deliveries.map((delivery) => <TableRow key={delivery.id}>
      <TableCell>{delivery.orderNumber}</TableCell>
      <TableCell>{delivery.customerName}</TableCell>
      <TableCell>{delivery.planName}</TableCell>
      <TableCell>{delivery.mealCount}</TableCell>
      <TableCell>{delivery.deliverySlot}</TableCell>
      <TableCell><Chip size="small" label={delivery.status} color={delivery.status === 'CONFIRMED' ? 'success' : 'default'} /></TableCell>
      <TableCell><IconButton aria-label={`View order ${delivery.orderNumber}`}><VisibilityOutlined /></IconButton></TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>;
}

function ProductionSummary({ detail }: { detail: DeliveryDateDetail }) {
  if (!detail.production.length) return <Alert severity="info" sx={{ m: 2 }}>There are no meal quantities for this date.</Alert>;
  return <Card sx={{ m: 2, boxShadow: 'none' }}><CardContent>
    <Typography variant="h3">Meal types required</Typography>
    <List dense>{detail.production.map((group) => <ListItem key={group.mealType} divider>
      <ListItemText primary={group.mealType} />
      <Chip label={group.quantity} size="small" />
    </ListItem>)}</List>
  </CardContent></Card>;
}
