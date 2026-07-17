import { CalendarMonthOutlined, LocalShippingOutlined, PeopleOutline, SwapHorizOutlined } from '@mui/icons-material';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import type { DeliveryCalendarDay } from '../types';

export function CalendarSummaryCards({ days }: { days: DeliveryCalendarDay[] }) {
  const values = [
    { label: 'Deliveries This Month', value: days.reduce((sum, day) => sum + day.totalDeliveries, 0), icon: <LocalShippingOutlined /> },
    { label: 'Active Customers', value: Math.max(0, ...days.map((day) => day.totalCustomers)), icon: <PeopleOutline /> },
    { label: 'Menu Overrides', value: days.reduce((sum, day) => sum + day.overrideCount, 0), icon: <SwapHorizOutlined /> },
    { label: 'Holidays / Closures', value: days.filter((day) => day.operationalStatus === 'CLOSED').length, icon: <CalendarMonthOutlined /> },
  ];
  return <Grid container spacing={2}>{values.map((item) => <Grid key={item.label} size={{ xs: 12, sm: 6, lg: 3 }}><Card sx={{ boxShadow: 'none', height: '100%' }}><CardContent><Stack direction="row" alignItems="center" gap={1.5}><Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'primary.main' }}>{item.icon}</Box><Box><Typography variant="h2">{item.value.toLocaleString()}</Typography><Typography variant="body2" color="text.secondary">{item.label}</Typography></Box></Stack></CardContent></Card></Grid>)}</Grid>;
}

