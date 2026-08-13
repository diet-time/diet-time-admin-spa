export type OperationalStatus = 'SCHEDULED' | 'OVERRIDE' | 'CLOSED' | 'NO_DELIVERIES' | 'PARTIAL';
export type DeliveryView = 'month' | 'week' | 'list';

export interface DeliveryCalendarDay {
  date: string;
  operationalStatus: OperationalStatus;
  holidayName?: string;
  closureReason?: string;
  totalDeliveries: number;
  totalCustomers: number;
  totalMealItems: number;
  overrideCount: number;
}

export interface CustomerDelivery {
  id: string;
  orderNumber: string;
  customerName: string;
  planName: string;
  mealCount: number;
  deliverySlot: string;
  status: string;
}

export interface ProductionGroup {
  mealType: string;
  quantity: number;
}

export interface DeliveryPreparationMenuItem { menuItemId: string; menuItemName: string; quantity: number }
export interface DeliveryPreparationMealType { mealTypeId: string; mealTypeName: string; quantity: number; items: DeliveryPreparationMenuItem[] }
export interface DeliveryPreparationPlan { mealPlanId: string; mealPlanName: string; orderCount: number }
export interface DeliveryPreparationSummary {
  date: string;
  status: string;
  orderCount: number;
  customerCount: number;
  mealItemCount: number;
  mealTypes: DeliveryPreparationMealType[];
  planBreakdown: DeliveryPreparationPlan[];
}

export interface CalendarMenuOverride {
  id: string;
  deliveryDate: string;
  planId?: string;
  mealSlotId?: string;
  mealType: string;
  originalMeal: string;
  replacementMeal: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface DeliveryDateDetail {
  day: DeliveryCalendarDay;
  totalMealItems: number;
  deliveries: CustomerDelivery[];
  production: ProductionGroup[];
  overrides: CalendarMenuOverride[];
}

export type ClosureImpactPolicy = 'SHIFT_NEXT' | 'PREVIOUS_DATE' | 'NEXT_DATE' | 'CANCEL';
export interface ClosureInput {
  startDate: string;
  endDate: string;
  name: string;
  reason: string;
  applyToAllPlans: boolean;
  impactPolicy: ClosureImpactPolicy;
}

export interface ClosureImpactPreview {
  affectedSubscriptions: number;
  affectedDeliveries: number;
  subscriptionsExtended: number;
  movedToDate?: string;
}

export interface OperationalClosure extends ClosureInput {
  id: string;
  status: 'ACTIVE';
  createdBy: string;
  createdAt: string;
}

export interface CalendarFilters {
  planId: string;
  status: string;
  hasOverride: string;
  closure: string;
}
