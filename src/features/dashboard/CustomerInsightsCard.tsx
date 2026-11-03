import { ArrowForwardRounded, PeopleOutlineRounded, PersonAddAltOutlined, RepeatRounded, ShoppingBagOutlined } from '@mui/icons-material';
import { Avatar, Box, Button, Card, CardContent, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';
import type { DashboardCustomerInsights } from '@/api/apiTypes';

export function CustomerInsightsCard({ data, onCustomer, onCustomers }: {
  data?: DashboardCustomerInsights | null; onCustomer?: (id: string) => void; onCustomers?: () => void;
}) {
  const top = data?.topCustomers ?? [];
  const max = Math.max(1, ...top.map(customer => customer.bookedOrders));
  const metrics = data ? [
    { label: 'Customers with bookings', value: data.customersWithBookings, note: 'At least one booked plan', icon: <PeopleOutlineRounded />, tint: '#EAF6F1', color: '#00684F' },
    { label: 'Repeat customers', value: data.repeatCustomers, note: data.repeatCustomerRate == null ? 'No bookings yet' : `${data.repeatCustomerRate}% have booked more than once`, icon: <RepeatRounded />, tint: '#E8F2FF', color: '#2788CA' },
    { label: 'New customers', value: data.newCustomers, note: 'First booking in the last 30 days', icon: <PersonAddAltOutlined />, tint: '#FFF3E5', color: '#C27D24' },
    { label: 'Booked orders', value: data.bookedOrders, note: 'One count per purchased plan', icon: <ShoppingBagOutlined />, tint: '#F0ECFA', color: '#7963AA' },
  ] : [];
  return <Card sx={{ borderRadius: '10px', boxShadow: '0 2px 12px rgba(24,55,44,.035)', borderColor: '#E8EDEA' }}>
    <CardContent sx={{ p: '20px !important' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={2.5}>
        <Box><Typography component="h2" variant="subtitle1" fontWeight={800}>Customer insights</Typography><Typography variant="caption" color="text.secondary">Booked plans through {data ? format(parseISO(data.throughDate), 'd MMM yyyy') : 'the selected date'}</Typography></Box>
        {onCustomers && <Button size="small" endIcon={<ArrowForwardRounded />} onClick={onCustomers}>View customers</Button>}
      </Stack>
      {!data ? <Typography color="text.secondary" py={4}>Customer insights are not available.</Typography> : <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack direction="row" alignItems="baseline" gap={1} mb={2}><Typography component="h3" variant="body2" fontWeight={800}>Top customers</Typography><Typography variant="caption" color="text.secondary">By number of booked orders</Typography></Stack>
          {!top.length ? <Stack alignItems="center" justifyContent="center" minHeight={180} spacing={1}><PeopleOutlineRounded color="primary" /><Typography fontWeight={700}>No customer bookings yet</Typography><Typography variant="caption" color="text.secondary">Customers appear here after a plan is confirmed.</Typography></Stack> : <Box component="ol" aria-label="Customers ranked by booked orders" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {top.map((customer, index) => <Box component="li" key={customer.customerId} sx={{ mb: index === top.length - 1 ? 0 : 1.75 }}>
              <Stack direction="row" alignItems="center" gap={1.25}>
                <Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: index === 0 ? '#00684F' : '#EAF6F1', color: index === 0 ? '#FFF' : '#00684F' }}>{index + 1}</Avatar>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mb={0.5}>
                    {onCustomer ? <Button size="small" onClick={() => onCustomer(customer.customerId)} sx={{ p: 0, minWidth: 0, fontSize: 12, textAlign: 'left', justifyContent: 'flex-start', lineHeight: 1.5 }}>{customer.customerName}</Button> : <Typography variant="caption" fontWeight={750}>{customer.customerName}</Typography>}
                    <Typography variant="caption" fontWeight={800} whiteSpace="nowrap">{customer.bookedOrders} {customer.bookedOrders === 1 ? 'order' : 'orders'}</Typography>
                  </Stack>
                  <LinearProgress aria-label={`${customer.customerName}: ${customer.bookedOrders} booked orders`} variant="determinate" value={customer.bookedOrders / max * 100} sx={{ height: 9, borderRadius: 2, bgcolor: '#EEF3F0', '& .MuiLinearProgress-bar': { bgcolor: index === 0 ? '#00684F' : '#73B699', borderRadius: 2 } }} />
                </Box>
              </Stack>
            </Box>)}
          </Box>}
          <Typography variant="caption" color="text.secondary" display="block" mt={2}>Confirmed, active and completed purchases. Pending, rejected and cancelled orders are excluded.</Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}><Grid container spacing={1.5}>{metrics.map(metric => <Grid key={metric.label} size={6}>
          <Box component="section" aria-label={metric.label} sx={{ height: '100%', p: 1.75, borderRadius: 2, bgcolor: '#F7F9F8', border: '1px solid #EDF1EF' }}>
            <Box sx={{ width: 30, height: 30, mb: 1, bgcolor: metric.tint, color: metric.color, borderRadius: '50%', display: 'grid', placeItems: 'center', '& svg': { fontSize: 18 } }}>{metric.icon}</Box>
            <Typography variant="caption" display="block" fontWeight={650} color="text.secondary">{metric.label}</Typography>
            <Typography sx={{ fontSize: 25, fontWeight: 800, lineHeight: 1.4 }}>{metric.value.toLocaleString()}</Typography>
            <Typography variant="caption" color="text.secondary">{metric.note}</Typography>
          </Box>
        </Grid>)}</Grid></Grid>
      </Grid>}
    </CardContent>
  </Card>;
}
