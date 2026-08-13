import { Box, Typography } from '@mui/material';
import { format, getDay, parseISO } from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import type { DeliveryCalendarDay, DeliveryView } from '../types';

const weekdays = [
  { full: 'Sunday', short: 'Sun' },
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
];
export function CalendarMonthGrid({ days, view, onSelect }: { days: DeliveryCalendarDay[]; view: DeliveryView; onSelect: (date: string) => void }) {
  if (!days.length) return null;
  const maxDeliveries = Math.max(1, ...days.map((day) => day.totalDeliveries));
  if (view === 'list') return <Box>{days.map((day) => <CalendarDayCell key={day.date} day={day} compact maxDeliveries={maxDeliveries} onSelect={onSelect} />)}</Box>;
  const todayIndex = days.findIndex((day) => day.date === format(new Date(), 'yyyy-MM-dd'));
  const weekStart = todayIndex >= 0 ? Math.max(0, todayIndex - getDay(parseISO(days[todayIndex]!.date))) : 0;
  const visible = view === 'week' ? days.slice(weekStart, weekStart + 7) : days;
  const blanks = getDay(parseISO(visible[0]!.date));
  const trailingBlanks = view === 'month' ? (7 - ((blanks + visible.length) % 7)) % 7 : 0;
  return <Box sx={{ overflowX: 'auto', bgcolor: 'background.paper' }}>
    <Box sx={{ minWidth: 840, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {weekdays.map((weekday, index) => <Box key={weekday.full} sx={{ px: 1.75, py: 1.25, bgcolor: index === 0 || index === 6 ? '#F7FAF8' : '#FBFCFB', borderBottom: 1, borderInlineEnd: index === 6 ? 0 : 1, borderColor: 'divider' }}><Typography variant="overline" fontWeight={800} color="text.secondary" letterSpacing="0.06em"><Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{weekday.full}</Box><Box component="span" sx={{ display: { xs: 'inline', lg: 'none' } }}>{weekday.short}</Box></Typography></Box>)}
      {Array.from({ length: blanks }, (_, index) => <CalendarBlankCell key={`blank-${index}`} weekend={index === 0 || index === 6} />)}
      {visible.map((day) => <CalendarDayCell key={day.date} day={day} maxDeliveries={maxDeliveries} onSelect={onSelect} />)}
      {Array.from({ length: trailingBlanks }, (_, index) => <CalendarBlankCell key={`trailing-blank-${index}`} weekend={(blanks + visible.length + index) % 7 === 0 || (blanks + visible.length + index) % 7 === 6} />)}
    </Box>
  </Box>;
}

function CalendarBlankCell({ weekend }: { weekend: boolean }) {
  return <Box aria-hidden="true" sx={{ minHeight: 144, bgcolor: weekend ? '#F7FAF8' : '#FBFCFB', borderBottom: 1, borderInlineEnd: 1, borderColor: 'divider', backgroundImage: 'linear-gradient(135deg, rgba(23,53,45,.012) 25%, transparent 25%, transparent 50%, rgba(23,53,45,.012) 50%, rgba(23,53,45,.012) 75%, transparent 75%, transparent)', backgroundSize: '12px 12px' }} />;
}
