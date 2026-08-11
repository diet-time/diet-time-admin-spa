import { CalendarMonthOutlined, LocalDiningOutlined, LocalShippingOutlined, PeopleOutline, TrendingUp } from '@mui/icons-material';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import type { DeliveryCalendarDay } from '../types';
import { colors } from '@/theme/theme';

export function CalendarSummaryCards({ days }: { days: DeliveryCalendarDay[] }) {
  const activeDays = days.filter((day) => day.totalDeliveries > 0);
  const totalDeliveries = days.reduce((sum, day) => sum + day.totalDeliveries, 0);
  const totalMealItems = days.reduce((sum, day) => sum + day.totalMealItems, 0);
  const peakDay = activeDays.reduce<DeliveryCalendarDay | undefined>((peak, day) => !peak || day.totalDeliveries > peak.totalDeliveries ? day : peak, undefined);
  const values = [
    { label: 'Deliveries this month', value: totalDeliveries, detail: activeDays.length ? `${Math.round(totalDeliveries / activeDays.length)} daily average` : 'No active delivery days', icon: <LocalShippingOutlined />, tone: colors.emerald, tint: '#E8F5F0' },
    { label: 'Customers at peak', value: Math.max(0, ...days.map((day) => day.totalCustomers)), detail: peakDay ? `Peak volume: ${peakDay.totalDeliveries} orders` : 'No orders scheduled', icon: <PeopleOutline />, tone: '#2C6E9E', tint: '#EAF3F9' },
    { label: 'Meal items scheduled', value: totalMealItems, detail: totalDeliveries ? `${(totalMealItems / totalDeliveries).toFixed(1)} items per order` : 'No meals scheduled', icon: <LocalDiningOutlined />, tone: colors.orange, tint: '#FFF0EC' },
    { label: 'Active delivery days', value: activeDays.length, detail: `${days.length - activeDays.length} days without orders`, icon: <CalendarMonthOutlined />, tone: colors.mocca, tint: '#F5EEE9' },
  ];
  return <Grid container spacing={2}>{values.map((item) => <Grid key={item.label} size={{ xs: 12, sm: 6, lg: 3 }}><Card sx={{ boxShadow: 'none', height: '100%', position: 'relative', overflow: 'hidden', transition: 'transform .18s ease, box-shadow .18s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px rgba(23,53,45,.09)' }, '&::after': { content: '""', position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, bgcolor: item.tone } }}><CardContent sx={{ p: 2.25 }}><Stack direction="row" alignItems="center" gap={1.5}><Box sx={{ width: 46, height: 46, flexShrink: 0, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: item.tint, color: item.tone }}>{item.icon}</Box><Box minWidth={0}><Typography variant="h2" lineHeight={1.05}>{item.value.toLocaleString()}</Typography><Typography variant="body2" fontWeight={700} mt={0.25}>{item.label}</Typography><Stack direction="row" alignItems="center" gap={0.5} mt={0.5}><TrendingUp sx={{ fontSize: 14, color: item.tone }} /><Typography variant="caption" color="text.secondary" noWrap>{item.detail}</Typography></Stack></Box></Stack></CardContent></Card></Grid>)}</Grid>;
}
