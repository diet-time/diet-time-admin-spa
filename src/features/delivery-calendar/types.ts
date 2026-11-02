export type OperationalStatus = 'SCHEDULED' | 'OVERDUE' | 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'OVERRIDE' | 'CLOSED' | 'NO_DELIVERIES' | 'PARTIAL';
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
  totalServiceDays?: number;
  pendingCount?: number;
  overdueCount?: number;
  deliveredCount?: number;
  collectedCount?: number;
  fulfilledCount?: number;
}

export interface CustomerDelivery {
  serviceDate?: string;
  fulfillmentDeadline?: string;
  isOverdue?: boolean;
  staffDisplayName?: string;
  serviceDayId?: string;
  fulfillmentStatus?: string;
  fulfilledAt?: string;
  fulfilledBy?: string;
  fulfillmentMethod?: string; takeawayBranchName?: string; takeawayBranchAddress?: string;
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress?: string;
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
export interface DeliveryPreparationMealType { mealTypeId: string; mealTypeName: string; mealClassification?: string; mealCategoryDisplayOrder?: number; quantity: number; items: DeliveryPreparationMenuItem[] }
export interface DeliveryPreparationPlan { mealPlanId: string; mealPlanName: string; orderCount: number }
export interface KitchenSelection {
  fulfillmentStatus?: string;
  fulfilledAt?: string;
  fulfilledBy?: string;
  fulfillmentMethod?: string;
  takeawayBranchName?: string;
  takeawayBranchAddress?: string;
  serviceDayId: string;
  orderReference: string;
  customerReference: string;
  customerName?: string;
  deliveryAddress?: string;
  dietaryRestrictionLabels?: string[];
  foodPreferences?: string[];
  allergens?: string[];
  mealPlanName?: string;
  finalizationStatus: string;
  selectionSources: string[];
  dishes: { mealName: string; category: string; quantity: number; mealCategoryId?: string; mealCategoryName?: string; mealCategoryDisplayOrder?: number; mealClassification?: string }[];
  dietaryRestrictions: string[];
  reviewReason?: string;
}
export interface DeliveryPreparationSummary {
  totalScheduledCount?: number;
  deliveredCount?: number;
  collectedCount?: number;
  remainingCount?: number;
  isPreliminary?: boolean;
  operationalExceptions?: string[];
  selections?: KitchenSelection[];
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
