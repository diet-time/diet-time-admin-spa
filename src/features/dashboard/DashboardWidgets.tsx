import { ArrowForwardRounded, BedtimeOutlined, ChevronRightRounded, EventAvailableOutlined, LocalShippingOutlined, StorefrontOutlined, WbSunnyOutlined } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip as MuiTooltip, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { type ReactNode } from 'react';
import type { DashboardFulfillment, DashboardPackage, DashboardServiceOrder, DashboardSlot } from '@/api/apiTypes';

const cardStyle = { height: '100%', borderRadius: '10px', boxShadow: '0 2px 12px rgba(24,55,44,.035)', borderColor: '#E8EDEA' };
function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <Card sx={cardStyle}><CardContent sx={{ p: '18px !important' }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={2}><Box><Typography component="h2" variant="subtitle1" fontWeight={800}>{title}</Typography>{subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}</Box>{action}</Stack>{children}</CardContent></Card>;
}

export function DashboardMetric({ title, value, detail, icon, tone, tint }: { title: string; value: string | number; detail: string; icon: ReactNode; tone: string; tint: string }) {
  return <Card component="section" aria-label={title} sx={cardStyle}><CardContent sx={{ p: '18px !important' }}><Stack direction="row" gap={1.5} alignItems="flex-start"><Box sx={{ width: 43, height: 43, borderRadius: '50%', bgcolor: tint, color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box><Box minWidth={0}><Typography variant="body2" fontWeight={600} color="text.secondary">{title}</Typography><Typography sx={{ fontSize: 30, lineHeight: 1.3, fontWeight: 800, letterSpacing: '-.04em', color: '#172C25' }}>{typeof value === 'number' ? value.toLocaleString() : value}</Typography><Typography variant="caption" color="text.secondary">{detail}</Typography></Box></Stack></CardContent></Card>;
}

export function FulfillmentDonut({ data }: { data?: DashboardFulfillment }) {
  const segments = [{ name: 'Delivered', value: data?.delivered ?? 0, color: '#287849' }, { name: 'Collected', value: data?.collected ?? 0, color: '#53AD86' }, { name: 'Pending', value: data?.pending ?? 0, color: '#348FD3' }, { name: 'Overdue', value: data?.overdue ?? 0, color: '#EE8C43' }];
  return <ChartCard title="Fulfillment status" subtitle="For the selected service date">
    {!data ? <EmptyChart text="Fulfillment data is not available" /> : <Stack direction="row" useFlexGap flexWrap="wrap" justifyContent="center" gap={3} alignItems="center" minHeight={190} sx={{ maxWidth: 460, mx: 'auto' }}>
      <Box position="relative" width={182} height={182} flexShrink={0} role="img" aria-label={`${data.fulfilled} of ${data.total} service orders fulfilled`}>
        {data.total > 0 ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 182, height: 182 }}><PieChart><Pie data={segments.filter(segment => segment.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={79} paddingAngle={1} stroke="none" isAnimationActive={false}>{segments.filter(segment => segment.value > 0).map(segment => <Cell key={segment.name} fill={segment.color} />)}</Pie><Tooltip formatter={value => [String(value ?? 0), 'Service orders']} /></PieChart></ResponsiveContainer> : <Box sx={{ position: 'absolute', inset: 13, border: '20px solid #EDF1EE', borderRadius: '50%' }} />}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{data.total}</Typography><Typography variant="caption" color="text.secondary">orders</Typography></Box>
      </Box>
      <Stack flex={1} minWidth={160} maxWidth={240} spacing={1.75}>{segments.map(segment => <Stack key={segment.name} direction="row" alignItems="center" gap={1}><Box sx={{ width: 9, height: 9, bgcolor: segment.color, borderRadius: '50%', flexShrink: 0 }} /><Typography variant="caption" fontWeight={650} flex={1}>{segment.name}</Typography><Typography variant="caption" fontWeight={800}>{segment.value}</Typography><Typography variant="caption" color="text.secondary" textAlign="right" minWidth={36}>{data.total ? Math.round(segment.value / data.total * 100) : 0}%</Typography></Stack>)}</Stack>
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

function EmptyChart({ text }: { text: string }) { return <Stack minHeight={170} alignItems="center" justifyContent="center"><Typography variant="body2" color="text.secondary">{text}</Typography></Stack>; }
