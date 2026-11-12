import { Chip } from '@mui/material';
import type { OrderPackageSchedule } from '@/api/staffOrdersApi';

const labels: Record<string, string> = {
  PAUSED: 'Paused',
  PAUSE_SCHEDULED: 'Pause scheduled',
  PAUSE_REQUESTED: 'Pause requested',
  UPCOMING: 'Upcoming',
};

export function OrderServiceStatus({ schedule }: { schedule?: OrderPackageSchedule }) {
  const label = schedule && labels[schedule.displayStatus];
  if (!label) return null;
  return <Chip size="small" variant="outlined" color="warning" label={label} />;
}
