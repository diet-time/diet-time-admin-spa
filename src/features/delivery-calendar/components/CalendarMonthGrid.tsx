import { Box, Grid, Typography } from '@mui/material';
import { format, getDay, parseISO } from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import type { DeliveryCalendarDay, DeliveryView } from '../types';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function CalendarMonthGrid({ days, view, onSelect }: { days: DeliveryCalendarDay[]; view: DeliveryView; onSelect: (date: string) => void }) {
  if (!days.length) return null;
  if (view === 'list') return <Box>{days.map((day) => <CalendarDayCell key={day.date} day={day} compact onSelect={onSelect} />)}</Box>;
  const todayIndex = days.findIndex((day) => day.date === format(new Date(), 'yyyy-MM-dd'));
  const weekStart = todayIndex >= 0 ? Math.max(0, todayIndex - getDay(parseISO(days[todayIndex]!.date))) : 0;
  const visible = view === 'week' ? days.slice(weekStart, weekStart + 7) : days;
  const blanks = getDay(parseISO(visible[0]!.date));
  return <Box sx={{ overflowX: 'auto' }}><Box sx={{ minWidth: 840 }}><Grid container columns={7}>{weekdays.map((weekday) => <Grid size={1} key={weekday}><Typography variant="caption" fontWeight={800} color="text.secondary" display="block" p={1.25} borderBottom={1} borderColor="divider">{weekday}</Typography></Grid>)}{Array.from({ length: blanks }, (_, index) => <Grid size={1} key={`blank-${index}`} sx={{ bgcolor: 'action.hover', borderBottom: 1, borderInlineEnd: 1, borderColor: 'divider' }} />)}{visible.map((day) => <Grid size={1} key={day.date}><CalendarDayCell day={day} onSelect={onSelect} /></Grid>)}</Grid></Box></Box>;
}
