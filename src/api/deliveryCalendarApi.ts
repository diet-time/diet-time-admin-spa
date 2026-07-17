import { addDays, eachDayOfInterval, endOfMonth, format, getDate, parseISO, startOfMonth } from 'date-fns';
import type { CalendarFilters, CalendarMenuOverride, ClosureImpactPreview, ClosureInput, DeliveryCalendarDay, DeliveryDateDetail, OperationalClosure, OperationalStatus } from '@/features/delivery-calendar/types';

const plans = [{ id: 'weight-loss', name: 'Weight Loss' }, { id: 'keto', name: 'Keto' }, { id: 'balanced', name: 'Balanced' }];
let closures: OperationalClosure[] = [{ id: 'closure-1', startDate: '2026-07-18', endDate: '2026-07-18', name: 'Public Holiday', reason: 'Kitchen closed for the public holiday.', applyToAllPlans: true, impactPolicy: 'SHIFT_NEXT', status: 'ACTIVE', createdBy: 'Admin User', createdAt: '2026-07-01T08:00:00Z' }];
let addedOverrides: CalendarMenuOverride[] = [];

const statusFor = (date: string, overrideCount: number, deliveries: number): OperationalStatus => {
  if (closures.some((closure) => date >= closure.startDate && date <= closure.endDate)) return 'CLOSED';
  if (!deliveries) return 'NO_DELIVERIES';
  if (getDate(parseISO(date)) % 11 === 0) return 'PARTIAL';
  return overrideCount ? 'OVERRIDE' : 'SCHEDULED';
};

const dayData = (date: string): DeliveryCalendarDay => {
  const closure = closures.find((item) => date >= item.startDate && date <= item.endDate);
  const dateNumber = getDate(parseISO(date));
  const weekend = [5, 6].includes(parseISO(date).getDay());
  const overrideCount = addedOverrides.filter((item) => item.deliveryDate === date).length + (dateNumber % 7 === 0 ? 2 : 0);
  const totalDeliveries = closure ? 0 : weekend ? 0 : 34 + (dateNumber % 17);
  return { date, operationalStatus: statusFor(date, overrideCount, totalDeliveries), holidayName: closure?.name, closureReason: closure?.reason, totalDeliveries, totalCustomers: totalDeliveries ? Math.max(1, totalDeliveries - 5) : 0, overrideCount };
};

const filterDays = (days: DeliveryCalendarDay[], filters: CalendarFilters) => days.map((day) => {
  const hidden = (filters.status && day.operationalStatus !== filters.status)
    || (filters.hasOverride === 'yes' && day.overrideCount === 0)
    || (filters.hasOverride === 'no' && day.overrideCount > 0)
    || (filters.closure === 'yes' && day.operationalStatus !== 'CLOSED')
    || (filters.closure === 'no' && day.operationalStatus === 'CLOSED');
  if (hidden) return { ...day, totalDeliveries: 0, totalCustomers: 0, overrideCount: 0, operationalStatus: 'NO_DELIVERIES' as const };
  return filters.planId && day.operationalStatus !== 'CLOSED' ? { ...day, totalDeliveries: Math.ceil(day.totalDeliveries / plans.length), totalCustomers: Math.ceil(day.totalCustomers / plans.length) } : day;
});

export const deliveryCalendarApi = {
  plans: async () => plans,
  month: async (month: string, filters: CalendarFilters) => {
    const first = startOfMonth(parseISO(`${month}-01`));
    return filterDays(eachDayOfInterval({ start: first, end: endOfMonth(first) }).map((date) => dayData(format(date, 'yyyy-MM-dd'))), filters);
  },
  detail: async (date: string): Promise<DeliveryDateDetail> => {
    const day = dayData(date);
    const deliveries = day.totalDeliveries ? [
      { id: `${date}-1`, customerName: 'Ahmed Hassan', planName: 'Weight Loss', templateDayNumber: 1, mealCount: 3, deliverySlot: 'Morning', status: 'Scheduled' as const },
      { id: `${date}-2`, customerName: 'Sara Ali', planName: 'Weight Loss', templateDayNumber: 6, mealCount: 3, deliverySlot: 'Morning', status: 'Scheduled' as const },
      { id: `${date}-3`, customerName: 'John Smith', planName: 'Keto', templateDayNumber: 3, mealCount: 4, deliverySlot: 'Afternoon', status: 'Paused' as const },
    ] : [];
    const seededOverrides: CalendarMenuOverride[] = day.overrideCount ? [{ id: `${date}-seed`, deliveryDate: date, mealType: 'Lunch', originalMeal: 'Grilled Salmon', replacementMeal: 'Grilled Chicken', reason: 'Ingredient unavailable', createdBy: 'Kitchen Manager', createdAt: `${date}T06:30:00Z` }] : [];
    return { day, totalMealItems: day.totalDeliveries * 3, deliveries, production: day.totalDeliveries ? [
      { mealType: 'Breakfast', meals: [{ name: 'Omelette', quantity: 25 }, { name: 'Greek Yogurt', quantity: 21 }] },
      { mealType: 'Lunch', meals: [{ name: 'Chicken Biryani', quantity: 32 }, { name: 'Grilled Salmon', quantity: 18 }] },
      { mealType: 'Dinner', meals: [{ name: 'Grilled Chicken', quantity: 29 }] },
      { mealType: 'Snack', meals: [{ name: 'Fruit Cup', quantity: 24 }] },
    ] : [], overrides: [...seededOverrides, ...addedOverrides.filter((item) => item.deliveryDate === date)] };
  },
  previewClosure: async (input: ClosureInput): Promise<ClosureImpactPreview> => {
    const numberOfDays = eachDayOfInterval({ start: parseISO(input.startDate), end: parseISO(input.endDate) }).length;
    return { affectedSubscriptions: 42 * numberOfDays, affectedDeliveries: 126 * numberOfDays, subscriptionsExtended: input.impactPolicy === 'CANCEL' ? 0 : 42 * numberOfDays, movedToDate: input.impactPolicy === 'CANCEL' ? undefined : format(addDays(parseISO(input.endDate), 1), 'yyyy-MM-dd') };
  },
  createClosure: async (input: ClosureInput) => {
    const closure: OperationalClosure = { ...input, id: `closure-${Date.now()}`, status: 'ACTIVE', createdBy: 'Admin User', createdAt: new Date().toISOString() };
    closures = [...closures, closure];
    return closure;
  },
  closures: async () => closures,
  createOverride: async (input: Omit<CalendarMenuOverride, 'id' | 'createdBy' | 'createdAt'>) => {
    const override: CalendarMenuOverride = { ...input, id: `override-${Date.now()}`, createdBy: 'Admin User', createdAt: new Date().toISOString() };
    addedOverrides = [...addedOverrides, override];
    return override;
  },
  removeOverride: async (id: string) => { addedOverrides = addedOverrides.filter((item) => item.id !== id); },
};
