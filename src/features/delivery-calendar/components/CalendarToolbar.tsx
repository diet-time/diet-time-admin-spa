import { CalendarMonthOutlined, ChevronLeft, ChevronRight, TodayOutlined } from '@mui/icons-material';
import { Box, Button, Chip, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';
import type { CalendarFilters, DeliveryView } from '../types';

export function CalendarToolbar({ month, filters, view, plans, onMonth, onPrevious, onNext, onToday, onFilters, onView }: { month: string; filters: CalendarFilters; view: DeliveryView; plans: Array<{ id: string; name: string }>; onMonth: (value: string) => void; onPrevious: () => void; onNext: () => void; onToday: () => void; onFilters: (value: CalendarFilters) => void; onView: (value: DeliveryView) => void }) {
  const filter = (key: keyof CalendarFilters, value: string) => onFilters({ ...filters, [key]: value });
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const legend = [{ label: 'Scheduled', color: '#2E7D43' }, { label: 'No deliveries', color: '#C8CFCC' }, { label: 'Today', color: '#4A9D62', ring: true }];
  const monthLabel = format(parseISO(`${month}-01`), 'MMMM yyyy');
  return <Stack borderBottom={1} borderColor="divider">
    <Stack spacing={1.5} px={{ xs: 1.5, md: 2 }} py={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={1.5}>
        <Stack direction="row" alignItems="center" gap={1} flex={1}>
          <Box component="label" sx={{ position: 'relative', width: 46, height: 46, display: 'grid', placeItems: 'center', border: 1, borderColor: 'divider', borderRadius: 2.5, color: 'primary.main', bgcolor: 'background.paper', cursor: 'pointer' }}>
            <CalendarMonthOutlined />
            <Box component="input" type="month" value={month} onChange={(event) => onMonth((event.target as HTMLInputElement).value)} aria-label="Calendar month" sx={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }} />
          </Box>
          <Typography variant="h2" sx={{ minWidth: { sm: 170 }, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{monthLabel}</Typography>
          <Tooltip title="Previous month"><IconButton onClick={onPrevious} aria-label="Previous month" sx={{ color: 'primary.main' }}><ChevronLeft /></IconButton></Tooltip>
          <Tooltip title="Next month"><IconButton onClick={onNext} aria-label="Next month" sx={{ color: 'primary.main' }}><ChevronRight /></IconButton></Tooltip>
        </Stack>
        <Stack direction="row" gap={1.25}>
          <Button variant="outlined" startIcon={<TodayOutlined />} onClick={onToday} sx={{ borderColor: 'divider', color: 'text.primary', px: 2 }}>Today</Button>
          <TextField select value={view} onChange={(event) => onView(event.target.value as DeliveryView)} aria-label="Calendar view" sx={{ minWidth: 118, '& .MuiOutlinedInput-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 800, '& fieldset': { border: 0 }, '& svg': { color: 'common.white' } } }}><MenuItem value="month">Month</MenuItem><MenuItem value="week">Week</MenuItem><MenuItem value="list">List</MenuItem></TextField>
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1.25}>
        <Stack direction="row" gap={1.25} flexWrap="wrap"><TextField select label="Meal plan" value={filters.planId} onChange={(event) => filter('planId', event.target.value)} sx={{ minWidth: 145 }}><MenuItem value="">All plans</MenuItem>{plans.map((plan) => <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>)}</TextField><TextField select label="Order status" value={filters.status} onChange={(event) => filter('status', event.target.value)} sx={{ minWidth: 145 }}><MenuItem value="">All statuses</MenuItem>{['CONFIRMED', 'PAUSED', 'CANCELLED'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>{activeFilters > 0 && <Chip label={`Clear ${activeFilters} ${activeFilters === 1 ? 'filter' : 'filters'}`} onDelete={() => onFilters({ planId: '', status: '', hasOverride: '', closure: '' })} onClick={() => onFilters({ planId: '', status: '', hasOverride: '', closure: '' })} variant="outlined" sx={{ alignSelf: 'center' }} />}</Stack>
        <Stack direction="row" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }} alignItems="center" gap={{ xs: 1.25, md: 2.5 }} flexWrap="wrap">{legend.map((item) => <Stack key={item.label} direction="row" alignItems="center" gap={0.65}><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: item.color, boxShadow: item.ring ? '0 0 0 4px rgba(74,157,98,.16)' : 'none' }} /><Typography variant="caption" color="text.secondary">{item.label}</Typography></Stack>)}</Stack>
      </Stack>
    </Stack>
  </Stack>;
}
