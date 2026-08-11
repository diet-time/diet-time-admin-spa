import { format, parseISO } from 'date-fns';
import { apiClient } from './apiClient';
import { plansApi } from './plansApi';
import type {
  CalendarFilters,
  CalendarMenuOverride,
  ClosureImpactPreview,
  ClosureInput,
  DeliveryCalendarDay,
  DeliveryDateDetail,
  OperationalClosure,
} from '@/features/delivery-calendar/types';

interface CalendarOrderApi {
  id: string;
  orderNumber: string;
  customerProfileId: string;
  customerName: string;
  mealPlanTemplateId: string;
  planName: string;
  mealCount: number;
  deliverySlot: string;
  status: string;
}

interface CalendarDayApi {
  date: string;
  totalOrders: number;
  totalCustomers: number;
  totalMealItems: number;
  orders: CalendarOrderApi[];
  mealTypeTotals: Array<{ mealType: string; quantity: number }>;
}

interface CalendarMonthApi {
  startDate: string;
  endDate: string;
  days: CalendarDayApi[];
}

interface ApiEnvelope<T> { data: T }

const toCalendarDay = (day: CalendarDayApi): DeliveryCalendarDay => ({
  date: day.date,
  operationalStatus: day.totalOrders > 0 ? 'SCHEDULED' : 'NO_DELIVERIES',
  totalDeliveries: day.totalOrders,
  totalCustomers: day.totalCustomers,
  totalMealItems: day.totalMealItems,
  overrideCount: 0,
});

const getMonth = async (month: string, filters: CalendarFilters, signal?: AbortSignal) => {
  const response = await apiClient.get<ApiEnvelope<CalendarMonthApi>>('/admin/orders/delivery-calendar', {
    params: {
      month,
      planId: filters.planId || undefined,
      orderStatus: filters.status || undefined,
    },
    signal,
  });
  return response.data.data;
};

export const deliveryCalendarApi = {
  plans: async () => {
    const response = await plansApi.list({ page: 1, pageSize: 100, published: true });
    return response.items.map((plan) => ({ id: plan.id, name: plan.nameEn }));
  },
  month: async (month: string, filters: CalendarFilters, signal?: AbortSignal) =>
    (await getMonth(month, filters, signal)).days.map(toCalendarDay),
  detail: async (date: string, signal?: AbortSignal): Promise<DeliveryDateDetail> => {
    const response = await getMonth(format(parseISO(date), 'yyyy-MM'), {
      planId: '', status: '', hasOverride: '', closure: '',
    }, signal);
    const source = response.days.find((day) => day.date === date);
    if (!source) throw new Error(`The API did not return calendar data for ${date}.`);
    return {
      day: toCalendarDay(source),
      totalMealItems: source.totalMealItems,
      deliveries: source.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        planName: order.planName,
        mealCount: order.mealCount,
        deliverySlot: order.deliverySlot,
        status: order.status,
      })),
      production: source.mealTypeTotals,
      overrides: [],
    };
  },
  previewClosure: async (input: ClosureInput) =>
    (await apiClient.post<ApiEnvelope<ClosureImpactPreview>>('/admin/operations/closures/preview', input)).data.data,
  createClosure: async (input: ClosureInput) =>
    (await apiClient.post<ApiEnvelope<OperationalClosure>>('/admin/operations/closures', input)).data.data,
  closures: async () =>
    (await apiClient.get<ApiEnvelope<OperationalClosure[]>>('/admin/operations/closures')).data.data,
  createOverride: async (input: Omit<CalendarMenuOverride, 'id' | 'createdBy' | 'createdAt'>) =>
    (await apiClient.post<ApiEnvelope<CalendarMenuOverride>>('/admin/orders/menu-overrides', input)).data.data,
  removeOverride: async (id: string) => {
    await apiClient.delete(`/admin/orders/menu-overrides/${id}`);
  },
};
