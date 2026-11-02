import { ArrowForwardRounded, BedtimeOutlined, ChevronRightRounded, EventAvailableOutlined, LocalShippingOutlined, StorefrontOutlined, WbSunnyOutlined } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Grid, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip as MuiTooltip, Typography } from '@mui/material';
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useId, type ReactNode } from 'react';
import type { DashboardFulfillment, DashboardPackage, DashboardServiceOrder, DashboardSlot, DeliveryWorkloadDay } from '@/api/apiTypes';

const cardStyle = { height: '100%', borderRadius: '10px', boxShadow: '0 2px 12px rgba(24,55,44,.035)', borderColor: '#E8EDEA' };
function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <Card sx={cardStyle}><CardContent sx={{ p: '18px !important' }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={2}><Box><Typography component="h2" variant="subtitle1" fontWeight={800}>{title}</Typography>{subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}</Box>{action}</Stack>{children}</CardContent></Card>;
}

export function DashboardMetric({ title, value, detail, icon, tone, tint }: { title: string; value: string | number; detail: string; icon: ReactNode; tone: string; tint: string }) {
  return <Card component="section" aria-label={title} sx={cardStyle}><CardContent sx={{ p: '18px !important' }}><Stack direction="row" gap={1.5} alignItems="flex-start"><Box sx={{ width: 43, height: 43, borderRadius: '50%', bgcolor: tint, color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box><Box minWidth={0}><Typography variant="body2" fontWeight={600} color="text.secondary">{title}</Typography><Typography sx={{ fontSize: 30, lineHeight: 1.3, fontWeight: 800, letterSpacing: '-.04em', color: '#172C25' }}>{typeof value === 'number' ? value.toLocaleString() : value}</Typography><Typography variant="caption" color="text.secondary">{detail}</Typography></Box></Stack></CardContent></Card>;
}

export function DemandOutlookChart({ days }: { days: DeliveryWorkloadDay[] }) {
  const id = useId().replaceAll(':', '');
  const rows = days.map(day => ({ ...day, label: format(parseISO(day.date), 'EEE d') }));
  return <ChartCard title="Meal demand & orders" subtitle="Next 7 days · scheduled package quantities and service-day orders">
    {!!rows.length && <Stack direction="row" justifyContent="space-between" mb={0.5}><Typography variant="caption" color="#278647">Meal items</Typography><Typography variant="caption" color="#348FD3">Orders</Typography></Stack>}
    {!rows.length ? <EmptyChart text="No upcoming meal or order workload" /> : <Box height={260} role="img" aria-label="Meal items and service-day orders over the next seven days; meal items use the left scale and orders use the right scale"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 900, height: 260 }}>
      <ComposedChart data={rows} margin={{ top: 24, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id={`meal-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38935B" stopOpacity={0.25} /><stop offset="100%" stopColor="#38935B" stopOpacity={0.02} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#EAEFEC" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#718078' }} />
        <YAxis yAxisId="meals" width={42} allowDecimals={false} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#278647' }} />
        <YAxis yAxisId="orders" orientation="right" width={42} allowDecimals={false} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#348FD3' }} />
        <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? format(parseISO(payload[0].payload.date), 'EEE, d MMM yyyy') : ''} contentStyle={{ borderRadius: 10, borderColor: '#DEE8E2', fontSize: 12 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Area yAxisId="meals" type="monotone" name="Meal items (left scale)" dataKey="meals" stroke="#278647" strokeWidth={2.3} fill={`url(#meal-${id})`} legendType="line" dot={{ r: 3, fill: 'white', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        <Bar yAxisId="orders" name="Orders (right scale)" dataKey="scheduledDeliveries" fill="#348FD3" maxBarSize={32} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer></Box>}
  </ChartCard>;
}

export function FulfillmentDonut({ data }: { data?: DashboardFulfillment }) {
  const segments = [{ name: 'Delivered', value: data?.delivered ?? 0, color: '#287849' }, { name: 'Collected', value: data?.collected ?? 0, color: '#53AD86' }, { name: 'Pending', value: data?.pending ?? 0, color: '#348FD3' }, { name: 'Overdue', value: data?.overdue ?? 0, color: '#EE8C43' }];
  return <ChartCard title="Fulfillment status" subtitle="For the selected service date">
    {!data ? <EmptyChart text="Fulfillment data is not available" /> : <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent="center" gap={1.5} alignItems="center" minHeight={190}>
      <Box position="relative" width={182} height={182} flexShrink={0} role="img" aria-label={`${data.fulfilled} of ${data.total} service orders fulfilled`}>
        {data.total > 0 ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 182, height: 182 }}><PieChart><Pie data={segments.filter(segment => segment.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={79} paddingAngle={1} stroke="none" isAnimationActive={false}>{segments.filter(segment => segment.value > 0).map(segment => <Cell key={segment.name} fill={segment.color} />)}</Pie><Tooltip formatter={value => [String(value ?? 0), 'Service orders']} /></PieChart></ResponsiveContainer> : <Box sx={{ position: 'absolute', inset: 13, border: '20px solid #EDF1EE', borderRadius: '50%' }} />}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{data.total}</Typography><Typography variant="caption" color="text.secondary">service orders</Typography></Box>
      </Box>
      <Stack flex={1} minWidth={130} spacing={1.35}>{segments.map(segment => <Stack key={segment.name} direction="row" alignItems="center" gap={0.75}><Box sx={{ width: 9, height: 9, bgcolor: segment.color, borderRadius: '50%', flexShrink: 0 }} /><Box flex={1}><Typography variant="caption" fontWeight={750} display="block">{segment.name}</Typography><Typography variant="caption" color="text.secondary">{segment.value} orders</Typography></Box><Typography variant="caption" fontWeight={750}>{data.total ? Math.round(segment.value / data.total * 100) : 0}%</Typography></Stack>)}</Stack>
    </Stack>}
  </ChartCard>;
}

export function PopularPackagesCard({ packages, total }: { packages: DashboardPackage[]; total?: number }) {
  return <ChartCard title="Popular packages" subtitle="Among eligible active subscriptions">
    {!packages.length ? <EmptyChart text={total === undefined ? 'Package insights are not available' : 'No active subscription packages'} /> : <Stack spacing={1.75} minHeight={170} justifyContent="center">{packages.slice(0, 4).map(item => <Box key={item.name}><Stack direction="row" justifyContent="space-between" gap={1} mb={0.65}><Typography variant="caption" fontWeight={650}>{item.name}</Typography><Typography variant="caption" fontWeight={800}>{item.subscriptions}</Typography></Stack><MuiTooltip title={`${item.subscriptions} of ${total ?? 0} active subscriptions`}><LinearProgress aria-label={`${item.name} share`} variant="determinate" value={total ? item.subscriptions / total * 100 : 0} sx={{ height: 9, borderRadius: 1, bgcolor: '#EEF1EF', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#216A46,#4B9E6B)', borderRadius: 1 } }} /></MuiTooltip></Box>)}</Stack>}
  </ChartCard>;
}

export function ScheduledOrdersCard({ rows, onCalendar, onOrder }: { rows: DashboardServiceOrder[]; onCalendar: () => void; onOrder?: (id: string) => void }) {
  return <ChartCard title="Scheduled orders" subtitle="Orders for the selected service date" action={<Button size="small" endIcon={<ArrowForwardRounded fontSize="small" />} onClick={onCalendar}>View all</Button>}>
    {!rows.length ? <Stack alignItems="center" spacing={1} py={4}><Box sx={{ width: 45, height: 45, borderRadius: '50%', bgcolor: '#EDF6F0', display: 'grid', placeItems: 'center', color: 'primary.main' }}><EventAvailableOutlined /></Box><Typography fontWeight={750}>No deliveries scheduled</Typography><Typography variant="caption" color="text.secondary" textAlign="center">There are no eligible service-day orders for this date.</Typography><Button size="small" onClick={onCalendar}>Open Delivery Calendar</Button></Stack> : <TableContainer><Table size="small" aria-label="Scheduled dashboard orders"><TableHead><TableRow sx={{ bgcolor: '#F4F7F5' }}>{['Order', 'Customer', 'Package / plan', 'Mode', 'Fulfillment', ''].map(column => <TableCell key={column} sx={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', py: 1 }}>{column}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(row => {
      const done = row.fulfillmentStatus === 'DELIVERED' || row.fulfillmentStatus === 'COLLECTED';
      const status = done ? row.fulfillmentStatus === 'DELIVERED' ? 'Delivered' : 'Collected' : row.isOverdue ? 'Overdue' : row.fulfillmentStatus ? 'Scheduled' : 'Not recorded';
      return <TableRow key={row.serviceDayId ?? row.id} hover><TableCell sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>{row.orderNumber}</TableCell><TableCell sx={{ fontSize: 11, fontWeight: 700 }}>{row.customerName}</TableCell><TableCell sx={{ fontSize: 11 }}>{row.planName}<Typography variant="caption" display="block" color="text.secondary">{row.mealCount} meal items</Typography></TableCell><TableCell sx={{ whiteSpace: 'nowrap', fontSize: 10 }}>{row.fulfillmentMethod === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'}</TableCell><TableCell><Chip size="small" label={status} color={done ? 'success' : row.isOverdue ? 'error' : 'default'} sx={{ height: 21, fontSize: 10 }} /></TableCell><TableCell><IconButton size="small" aria-label={`View order ${row.orderNumber}`} onClick={() => onOrder ? onOrder(row.id) : onCalendar()} sx={{ minWidth: 28, minHeight: 28 }}><ChevronRightRounded fontSize="small" /></IconButton></TableCell></TableRow>;
    })}</TableBody></Table></TableContainer>}
  </ChartCard>;
}

export function DeliverySlotsCard({ slots, fulfillment }: { slots: DashboardSlot[]; fulfillment?: DashboardFulfillment }) {
  return <ChartCard title="Delivery slots" subtitle="Home-delivery fulfillment by time window">
    {!slots.length ? <Typography variant="body2" color="text.secondary" py={3}>No home deliveries scheduled.</Typography> : <Stack spacing={1.25}>{slots.map(slot => {
      const early = slot.startTime ? Number(slot.startTime.slice(0, 2)) < 12 : true;
      return <Box key={`${slot.name}-${slot.startTime}`} sx={{ p: 1.25, border: '1px solid #E8EDEA', borderRadius: '10px' }}><Stack direction="row" gap={1} alignItems="center"><Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: early ? '#FFF1DB' : '#E6F1FD', color: early ? '#EC9A25' : '#368BCE', flexShrink: 0 }}>{slot.startTime ? early ? <WbSunnyOutlined fontSize="small" /> : <BedtimeOutlined fontSize="small" /> : <LocalShippingOutlined fontSize="small" />}</Box><Box flex={1} minWidth={0}><Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="caption" fontWeight={800}>{slot.name}</Typography><Typography variant="caption" fontWeight={700}>{slot.fulfilled} / {slot.scheduled} fulfilled</Typography></Stack><Typography variant="caption" color="text.secondary">{slot.startTime && slot.endTime ? `${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)} · Qatar` : 'Time not recorded'}</Typography><LinearProgress variant="determinate" value={slot.scheduled ? slot.fulfilled / slot.scheduled * 100 : 0} sx={{ mt: 0.75, height: 6, borderRadius: 1, bgcolor: '#EEF1EF' }} /></Box></Stack>{slot.overdue > 0 && <Typography variant="caption" color="error.main" display="block" textAlign="right" mt={0.5}>{slot.overdue} overdue</Typography>}</Box>;
    })}</Stack>}
    {!!fulfillment?.takeaway && <Stack direction="row" gap={1} alignItems="center" mt={1.5} px={1}><StorefrontOutlined fontSize="small" color="primary" /><Typography variant="caption" flex={1}>Takeaway collections</Typography><Typography variant="caption" fontWeight={800}>{fulfillment.collected} / {fulfillment.takeaway}</Typography></Stack>}
  </ChartCard>;
}

export function BusinessFollowUps({ pending, overdue, expiring, onReview, onCalendar }: { pending: number; overdue?: number; expiring?: number; onReview?: () => void; onCalendar: () => void }) {
  return <Grid container spacing={1.5} aria-label="Business follow-ups">
    <Grid size={{ xs: 12, md: 4 }}><Box sx={{ height: '100%', p: 1.5, borderRadius: '10px', bgcolor: pending ? '#FFF7E8' : '#F1F5F2', border: '1px solid', borderColor: pending ? '#F3E5C8' : '#E5ECE7' }}><Stack direction="row" gap={1} alignItems="center"><Box flex={1}><Typography variant="caption" fontWeight={750}>Orders requiring review</Typography><Typography variant="caption" display="block" color="text.secondary">{pending} pending confirmation · all dates</Typography></Box>{onReview && <Button size="small" onClick={onReview} sx={{ fontSize: 11 }}>Review pending orders</Button>}</Stack></Box></Grid>
    <Grid size={{ xs: 12, md: 4 }}><Box sx={{ height: '100%', p: 1.5, borderRadius: '10px', bgcolor: overdue ? '#FFF1EE' : '#F1F5F2', border: '1px solid', borderColor: overdue ? '#F3DAD3' : '#E5ECE7' }}><Stack direction="row" gap={1} alignItems="center"><Box flex={1}><Typography variant="caption" fontWeight={750}>Overdue deliveries</Typography><Typography variant="caption" display="block" color="text.secondary">{overdue === undefined ? 'Not available' : `${overdue} need attention on this date`}</Typography></Box><Button size="small" onClick={onCalendar} sx={{ fontSize: 11 }}>View schedule</Button></Stack></Box></Grid>
    <Grid size={{ xs: 12, md: 4 }}><Box sx={{ height: '100%', p: 1.5, borderRadius: '10px', bgcolor: '#EEF4FA', border: '1px solid #DBE7F0' }}><Typography variant="caption" fontWeight={750}>Renewal opportunities</Typography><Typography variant="caption" display="block" color="text.secondary">{expiring === undefined ? 'Not available' : `${expiring} plans ending in the next 7 days`}</Typography></Box></Grid>
  </Grid>;
}

function EmptyChart({ text }: { text: string }) { return <Stack minHeight={170} alignItems="center" justifyContent="center"><Typography variant="body2" color="text.secondary">{text}</Typography></Stack>; }
