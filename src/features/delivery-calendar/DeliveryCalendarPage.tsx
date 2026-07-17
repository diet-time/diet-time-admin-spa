import { EventBusyOutlined, SwapHorizOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { queryClient } from '@/app/queryClient';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import { CalendarMonthGrid } from './components/CalendarMonthGrid';
import { CalendarSummaryCards } from './components/CalendarSummaryCards';
import { CalendarToolbar } from './components/CalendarToolbar';
import { ClosureDialog } from './components/ClosureDialog';
import { DateDetailsDrawer } from './components/DateDetailsDrawer';
import { MenuOverrideDialog } from './components/MenuOverrideDialog';
import type { CalendarFilters, DeliveryView } from './types';

const emptyFilters: CalendarFilters = { planId: '', status: '', hasOverride: '', closure: '' };

export function DeliveryCalendarPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filters, setFilters] = useState(emptyFilters);
  const [view, setView] = useState<DeliveryView>('month');
  const [selectedDate, setSelectedDate] = useState<string>();
  const [closureOpen, setClosureOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string>();
  const [removeOverride, setRemoveOverride] = useState<{ id: string; date: string }>();
  const plansQuery = useQuery({ queryKey: ['delivery-calendar-plans'], queryFn: deliveryCalendarApi.plans });
  const calendarQuery = useQuery({ queryKey: ['delivery-calendar', month, filters], queryFn: () => deliveryCalendarApi.month(month, filters) });
  const removeMutation = useMutation({ mutationFn: (id: string) => deliveryCalendarApi.removeOverride(id), onSuccess: async () => { const date = removeOverride?.date; setRemoveOverride(undefined); await queryClient.invalidateQueries({ queryKey: ['delivery-calendar'] }); if (date) await queryClient.invalidateQueries({ queryKey: ['delivery-calendar-detail', date] }); } });
  const changeMonth = (offset: number) => setMonth(format(addMonths(parseISO(`${month}-01`), offset), 'yyyy-MM'));
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['delivery-calendar'] }); };
  const savedOverride = async (date: string) => { await refresh(); await queryClient.invalidateQueries({ queryKey: ['delivery-calendar-detail', date] }); setSelectedDate(date); };

  return <Stack spacing={3}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} gap={2}><Box><Typography variant="h1">{t('deliveryCalendar')}</Typography><Typography color="text.secondary">Manage daily deliveries, kitchen closures, holidays, and menu overrides.</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button variant="outlined" startIcon={<EventBusyOutlined />} onClick={() => setClosureOpen(true)}>Add Holiday / Closure</Button><Button variant="contained" startIcon={<SwapHorizOutlined />} onClick={() => setOverrideDate(format(new Date(), 'yyyy-MM-dd'))}>Add Menu Override</Button></Stack></Stack>{calendarQuery.isLoading ? <LoadingState /> : calendarQuery.isError ? <ErrorState message="Unable to load the delivery calendar." onRetry={() => void calendarQuery.refetch()} /> : <><CalendarSummaryCards days={calendarQuery.data ?? []} /><Card sx={{ overflow: 'hidden' }}><CalendarToolbar month={month} filters={filters} view={view} plans={plansQuery.data ?? []} onMonth={setMonth} onPrevious={() => changeMonth(-1)} onNext={() => changeMonth(1)} onToday={() => setMonth(format(new Date(), 'yyyy-MM'))} onFilters={setFilters} onView={setView} /><CalendarMonthGrid days={calendarQuery.data ?? []} view={view} onSelect={setSelectedDate} /></Card></>}<Alert severity="info">Template days remain customer-specific. This calendar shows real delivery dates and kitchen operations; customers on the same date may be on different template days.</Alert><DateDetailsDrawer date={selectedDate} onClose={() => setSelectedDate(undefined)} onAddOverride={setOverrideDate} onRemoveOverride={(id, date) => setRemoveOverride({ id, date })} /><ClosureDialog open={closureOpen} onClose={() => setClosureOpen(false)} onApplied={() => void refresh()} /><MenuOverrideDialog open={!!overrideDate} date={overrideDate} onClose={() => setOverrideDate(undefined)} onSaved={(date) => void savedOverride(date)} /><Dialog open={!!removeOverride} onClose={() => setRemoveOverride(undefined)}><DialogTitle>Remove menu override?</DialogTitle><DialogContent><Typography>This removes the date-specific replacement only. The original plan template will not be changed.</Typography></DialogContent><DialogActions><Button onClick={() => setRemoveOverride(undefined)}>Cancel</Button><Button color="error" variant="contained" disabled={removeMutation.isPending} onClick={() => removeOverride && removeMutation.mutate(removeOverride.id)}>Remove</Button></DialogActions></Dialog></Stack>;
}
