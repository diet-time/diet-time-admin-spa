import { Close, DeleteOutline, EditOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Drawer, IconButton, List, ListItem, ListItemText, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useState } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import type { DeliveryDateDetail } from '../types';

export function DateDetailsDrawer({ date, onClose, onAddOverride, onRemoveOverride }: { date?: string; onClose: () => void; onAddOverride: (date: string) => void; onRemoveOverride: (id: string, date: string) => void }) {
  const [tab, setTab] = useState(0);
  const query = useQuery({ queryKey: ['delivery-calendar-detail', date], queryFn: () => deliveryCalendarApi.detail(date!), enabled: !!date });
  const past = date ? isBefore(parseISO(date), startOfDay(new Date())) : false;
  return <Drawer anchor="right" open={!!date} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 760 }, maxWidth: '100%' } } }}><Stack direction="row" alignItems="center" p={2} borderBottom={1} borderColor="divider"><Box flex={1}><Typography variant="h2">{date ? format(parseISO(date), 'EEEE, d MMMM yyyy') : 'Delivery details'}</Typography><Typography color="text.secondary">Operations for this calendar date</Typography></Box><IconButton onClick={onClose} aria-label="Close details"><Close /></IconButton></Stack>{past && <Alert severity="info" sx={{ m: 2, mb: 0 }}>This is a past date. Completed deliveries are read-only; dispatched or delivered orders cannot be automatically rescheduled.</Alert>}{query.isLoading ? <Box p={3}><LoadingState /></Box> : query.isError || !query.data ? <Box p={3}><ErrorState message="Unable to load date details." onRetry={() => void query.refetch()} /></Box> : <DrawerContent detail={query.data} tab={tab} onTab={setTab} readOnly={past} onAddOverride={onAddOverride} onRemoveOverride={onRemoveOverride} />}</Drawer>;
}

function DrawerContent({ detail, tab, onTab, readOnly, onAddOverride, onRemoveOverride }: { detail: DeliveryDateDetail; tab: number; onTab: (value: number) => void; readOnly: boolean; onAddOverride: (date: string) => void; onRemoveOverride: (id: string, date: string) => void }) {
  const cards = [['Status', detail.day.operationalStatus.replaceAll('_', ' ')], ['Deliveries', detail.day.totalDeliveries], ['Customers', detail.day.totalCustomers], ['Meal items', detail.totalMealItems], ['Overrides', detail.day.overrideCount]];
  return <><Stack direction="row" flexWrap="wrap" useFlexGap gap={1.25} p={2}>{cards.map(([label, value]) => <Card key={label} sx={{ minWidth: 120, flex: 1, boxShadow: 'none' }}><CardContent sx={{ p: '12px !important' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></CardContent></Card>)}</Stack><Tabs value={tab} onChange={(_, value: number) => onTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Date details"><Tab label="Customer deliveries" /><Tab label="Production summary" /><Tab label="Menu overrides" /></Tabs><Divider />{tab === 0 && <CustomerDeliveriesTable detail={detail} />}{tab === 1 && <ProductionSummary detail={detail} />}{tab === 2 && <MenuOverridesPanel detail={detail} readOnly={readOnly} onAddOverride={onAddOverride} onRemoveOverride={onRemoveOverride} />}</>;
}

function CustomerDeliveriesTable({ detail }: { detail: DeliveryDateDetail }) {
  if (!detail.deliveries.length) return <Alert severity="info" sx={{ m: 2 }}>No customer deliveries are scheduled for this date.</Alert>;
  return <TableContainer><Table size="small" aria-label="Customer deliveries"><TableHead><TableRow>{['Customer', 'Plan', 'Template day', 'Meals', 'Slot', 'Status', ''].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{detail.deliveries.map((delivery) => <TableRow key={delivery.id}><TableCell>{delivery.customerName}</TableCell><TableCell>{delivery.planName}</TableCell><TableCell>Day {delivery.templateDayNumber}</TableCell><TableCell>{delivery.mealCount}</TableCell><TableCell>{delivery.deliverySlot}</TableCell><TableCell><Chip size="small" label={delivery.status} color={delivery.status === 'Paused' ? 'warning' : 'success'} /></TableCell><TableCell><IconButton aria-label={`View ${delivery.customerName} delivery`}><VisibilityOutlined /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>;
}

function ProductionSummary({ detail }: { detail: DeliveryDateDetail }) {
  if (!detail.production.length) return <Alert severity="info" sx={{ m: 2 }}>There is no production required for this date.</Alert>;
  return <Stack spacing={2} p={2}>{detail.production.map((group) => <Card key={group.mealType} sx={{ boxShadow: 'none' }}><CardContent><Typography variant="h3">{group.mealType}</Typography><List dense>{group.meals.map((meal) => <ListItem key={meal.name} divider><ListItemText primary={meal.name} /><Chip label={meal.quantity} size="small" /></ListItem>)}</List></CardContent></Card>)}</Stack>;
}

function MenuOverridesPanel({ detail, readOnly, onAddOverride, onRemoveOverride }: { detail: DeliveryDateDetail; readOnly: boolean; onAddOverride: (date: string) => void; onRemoveOverride: (id: string, date: string) => void }) {
  return <Stack spacing={2} p={2}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h3">Date-specific menu changes</Typography><Button variant="contained" disabled={readOnly} onClick={() => onAddOverride(detail.day.date)}>Add Override</Button></Stack>{!detail.overrides.length ? <Alert severity="info">No menu overrides apply to this date.</Alert> : detail.overrides.map((override) => <Card key={override.id} sx={{ boxShadow: 'none' }}><CardContent><Stack direction="row" justifyContent="space-between" gap={2}><Box><Chip label={override.mealType} size="small" color="warning" /><Typography mt={1}><strong>{override.originalMeal}</strong> → <strong>{override.replacementMeal}</strong></Typography><Typography variant="body2" color="text.secondary">Reason: {override.reason}</Typography><Typography variant="caption" color="text.secondary">Created by {override.createdBy}</Typography></Box><Stack direction="row"><IconButton disabled={readOnly} aria-label="Edit override"><EditOutlined /></IconButton><IconButton disabled={readOnly} color="error" aria-label="Remove override" onClick={() => onRemoveOverride(override.id, detail.day.date)}><DeleteOutline /></IconButton></Stack></Stack></CardContent></Card>)}</Stack>;
}

