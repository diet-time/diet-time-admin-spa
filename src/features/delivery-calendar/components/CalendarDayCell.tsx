import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import type { DeliveryCalendarDay } from '../types';

const statuses: Record<DeliveryCalendarDay['operationalStatus'], { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  SCHEDULED: { label: 'Scheduled', color: 'success' }, OVERRIDE: { label: 'Menu Override', color: 'warning' }, CLOSED: { label: 'Closed', color: 'error' }, NO_DELIVERIES: { label: 'No Deliveries', color: 'default' }, PARTIAL: { label: 'Special Schedule', color: 'info' },
};
const statusProps = (status: DeliveryCalendarDay['operationalStatus']) => statuses[status];

export function CalendarDayCell({ day, compact = false, onSelect }: { day: DeliveryCalendarDay; compact?: boolean; onSelect: (date: string) => void }) {
  const status = statusProps(day.operationalStatus);
  const past = isBefore(parseISO(day.date), startOfDay(new Date()));
  return <Box component="button" type="button" onClick={() => onSelect(day.date)} aria-label={`Open deliveries for ${format(parseISO(day.date), 'EEEE, d MMMM yyyy')}`} sx={{ appearance: 'none', width: '100%', minHeight: compact ? 105 : 145, p: 1.25, border: 0, borderInlineEnd: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary', textAlign: 'start', cursor: 'pointer', opacity: past ? 0.78 : 1, '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { position: 'relative', zIndex: 1 } }}><Stack spacing={0.7}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight={800}>{format(parseISO(day.date), compact ? 'EEE d' : 'd')}</Typography><Tooltip title={status.label}><Chip size="small" label={status.label} color={status.color} variant={status.color === 'default' ? 'outlined' : 'filled'} sx={{ maxWidth: compact ? 110 : 130 }} /></Tooltip></Stack>{day.operationalStatus === 'CLOSED' ? <><Typography fontWeight={750} color="error.main">Kitchen Closed</Typography><Typography variant="caption" color="text.secondary">{day.holidayName}</Typography><Typography variant="caption">No Deliveries</Typography></> : <><Typography variant="body2"><strong>{day.totalDeliveries}</strong> Deliveries</Typography><Typography variant="body2"><strong>{day.totalCustomers}</strong> Customers</Typography>{day.overrideCount > 0 && <Typography variant="caption" color="warning.main">{day.overrideCount} Overrides</Typography>}</>}</Stack></Box>;
}
