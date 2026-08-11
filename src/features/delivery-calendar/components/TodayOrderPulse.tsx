import { ArrowForward, LocalDiningOutlined, LocalShippingOutlined, PeopleOutline } from '@mui/icons-material';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';
import type { DeliveryCalendarDay } from '../types';

export function TodayOrderPulse({ day, onSelect }: { day?: DeliveryCalendarDay; onSelect: (date: string) => void }) {
  if (!day) return null;

  const statusLabel = day.operationalStatus === 'PARTIAL'
    ? 'Special schedule'
    : day.operationalStatus === 'NO_DELIVERIES'
      ? 'No deliveries'
      : day.operationalStatus.toLowerCase().replaceAll('_', ' ');

  return (
    <Box
      sx={{
        px: { xs: 2, md: 2.5 }, py: 1.75, border: '1px solid', borderColor: 'rgba(0,103,78,.18)',
        borderRadius: 2, bgcolor: '#F0F8F4', position: 'relative', overflow: 'hidden',
        '&::before': { content: '""', position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 5, bgcolor: 'primary.main' },
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={{ xs: 1.5, md: 3 }}>
        <Box minWidth={{ md: 210 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: '0 0 0 5px rgba(0,103,78,.10)' }} />
            <Typography variant="overline" fontWeight={800} color="primary.main">Today at a glance</Typography>
          </Stack>
          <Typography variant="h3" mt={0.25}>{format(parseISO(day.date), 'EEEE, d MMMM')}</Typography>
        </Box>
        <Stack direction="row" gap={{ xs: 2, sm: 4 }} flexWrap="wrap" flex={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            <LocalShippingOutlined color="primary" />
            <Box><Typography fontWeight={850} lineHeight={1.1}>{day.totalDeliveries}</Typography><Typography variant="caption" color="text.secondary">orders</Typography></Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <PeopleOutline sx={{ color: '#2C6E9E' }} />
            <Box><Typography fontWeight={850} lineHeight={1.1}>{day.totalCustomers}</Typography><Typography variant="caption" color="text.secondary">customers</Typography></Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <LocalDiningOutlined sx={{ color: 'warning.main' }} />
            <Box><Typography fontWeight={850} lineHeight={1.1}>{day.totalMealItems}</Typography><Typography variant="caption" color="text.secondary">meal items</Typography></Box>
          </Stack>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip label={statusLabel} size="small" color={day.operationalStatus === 'CLOSED' ? 'error' : day.operationalStatus === 'PARTIAL' ? 'info' : 'success'} sx={{ textTransform: 'capitalize', fontWeight: 750 }} />
          <Button endIcon={<ArrowForward />} onClick={() => onSelect(day.date)}>View orders</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
