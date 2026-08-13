import { Box, Typography } from '@mui/material';
import { format, getDay, parseISO } from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import type { DeliveryCalendarDay, DeliveryView } from '../types';

const weekdays = [
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
];

const mondayIndex = (date: string) => (getDay(parseISO(date)) + 6) % 7;

export function CalendarMonthGrid({ days, view, onSelect }: { days: DeliveryCalendarDay[]; view: DeliveryView; onSelect: (date: string) => void }) {
  if (!days.length) return null;
  const maxDeliveries = Math.max(1, ...days.map((day) => day.totalDeliveries));
  if (view === 'list') return <Box>{days.map((day) => <CalendarDayCell key={day.date} day={day} compact maxDeliveries={maxDeliveries} onSelect={onSelect} />)}</Box>;
  const todayIndex = days.findIndex((day) => day.date === format(new Date(), 'yyyy-MM-dd'));
  const weekStart = todayIndex >= 0 ? Math.max(0, todayIndex - mondayIndex(days[todayIndex]!.date)) : 0;
  const visible = view === 'week' ? days.slice(weekStart, weekStart + 7) : days;
  const blanks = mondayIndex(visible[0]!.date);
  const trailingBlanks = view === 'month' ? (7 - ((blanks + visible.length) % 7)) % 7 : 0;
  return <Box sx={{ overflowX: 'auto', bgcolor: '#F9FBFA', p: 1 }}>
    <Box sx={{ minWidth: 840 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', overflow: 'hidden', borderRadius: '9px 9px 0 0' }}>
        {weekdays.map((weekday, index) => <Box key={weekday.full} sx={{ px: 1.75, py: 1.05, textAlign: 'center', bgcolor: '#064E3B', borderInlineEnd: index === 6 ? 0 : 1, borderColor: 'rgba(255,255,255,.1)' }}><Typography variant="caption" fontWeight={800} color="common.white" letterSpacing="0.08em"><Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{weekday.full.toUpperCase()}</Box><Box component="span" sx={{ display: { xs: 'inline', lg: 'none' } }}>{weekday.short.toUpperCase()}</Box></Typography></Box>)}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', overflow: 'hidden', border: 1, borderTop: 0, borderColor: 'divider', borderRadius: '0 0 9px 9px' }}>
        {Array.from({ length: blanks }, (_, index) => <CalendarBlankCell key={`blank-${index}`} weekend={index >= 5} />)}
        {visible.map((day) => <CalendarDayCell key={day.date} day={day} maxDeliveries={maxDeliveries} onSelect={onSelect} />)}
        {Array.from({ length: trailingBlanks }, (_, index) => <CalendarBlankCell key={`trailing-blank-${index}`} weekend={(blanks + visible.length + index) % 7 >= 5} />)}
      </Box>
    </Box>
  </Box>;
}

function CalendarBlankCell({ weekend }: { weekend: boolean }) {
  return <Box aria-hidden="true" sx={{ minHeight: 130, bgcolor: weekend ? '#FAFBFA' : '#FDFEFD', borderInlineEnd: 1, borderBottom: 1, borderColor: 'divider' }} />;
}
