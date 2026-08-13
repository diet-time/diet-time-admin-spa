import { Alert, Box, Card, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import { CalendarMonthGrid } from './components/CalendarMonthGrid';
import { CalendarSummaryCards } from './components/CalendarSummaryCards';
import { CalendarToolbar } from './components/CalendarToolbar';
import { DateDetailsDrawer } from './components/DateDetailsDrawer';
import { TodayOrderPulse } from './components/TodayOrderPulse';
import type { CalendarFilters, DeliveryView } from './types';

const emptyFilters: CalendarFilters = { planId: '', status: '', hasOverride: '', closure: '' };

export function DeliveryCalendarPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedDate = searchParams.get('date') ?? '';
  const validRequestedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : undefined;
  const [month, setMonth] = useState(() => validRequestedDate?.slice(0, 7) ?? format(new Date(), 'yyyy-MM'));
  const [filters, setFilters] = useState(emptyFilters);
  const [view, setView] = useState<DeliveryView>('month');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(validRequestedDate);
  const plansQuery = useQuery({ queryKey: ['delivery-calendar-plans'], queryFn: deliveryCalendarApi.plans });
  const calendarQuery = useQuery({ queryKey: ['delivery-calendar', month, filters], queryFn: ({ signal }) => deliveryCalendarApi.month(month, filters, signal) });
  const changeMonth = (offset: number) => setMonth(format(addMonths(parseISO(`${month}-01`), offset), 'yyyy-MM'));
  const calendarDays = calendarQuery.data ?? [];
  const today = calendarDays.find((day) => day.date === format(new Date(), 'yyyy-MM-dd'));

  return <Stack spacing={3}><Box><Typography variant="h1">{t('deliveryCalendar')}</Typography><Typography color="text.secondary">Monitor scheduled orders and daily kitchen volume.</Typography></Box>{calendarQuery.isLoading ? <LoadingState /> : calendarQuery.isError ? <ErrorState message="Unable to load order data for the delivery calendar." onRetry={() => void calendarQuery.refetch()} /> : <><TodayOrderPulse day={today} onSelect={setSelectedDate} /><CalendarSummaryCards days={calendarDays} /><Card sx={{ overflow: 'hidden', borderRadius: 2.5, boxShadow: '0 12px 32px rgba(23,53,45,.08)' }}><CalendarToolbar month={month} filters={filters} view={view} plans={plansQuery.data ?? []} onMonth={setMonth} onPrevious={() => changeMonth(-1)} onNext={() => changeMonth(1)} onToday={() => setMonth(format(new Date(), 'yyyy-MM'))} onFilters={setFilters} onView={setView} /><CalendarMonthGrid days={calendarDays} view={view} onSelect={setSelectedDate} /></Card></>}<Alert severity="info">Delivery dates are calculated from each order's service period and selected delivery weekdays.</Alert><DateDetailsDrawer date={selectedDate} onClose={() => setSelectedDate(undefined)} /></Stack>;
}
