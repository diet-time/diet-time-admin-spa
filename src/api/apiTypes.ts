export interface ApiErrorBody { title?: string; detail?: string; status?: number; correlationId?: string; errors?: Record<string, string[]> }
export interface ApiEnvelope<T> { data: T; errors?: Array<{ code: string; message: string; field?: string }> }
export interface AuthUserApi { id: string; email: string; name: string; roles: string[] }
export interface AuthSessionApi {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUserApi;
}
export interface PagedResponse<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }
export interface Translation { en: string; ar?: string }
export type RecordStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';
export interface MealSummary { id: string; sku: string; nameEn: string; nameAr?: string; thumbnailUrl?: string; categoryName: string; calories?: number; protein?: number; currentPrice?: number; currency?: string; status: RecordStatus; revisionNumber: number; isAvailable: boolean; availableFrom?: string; availableUntil?: string; updatedAt: string }
export interface MealFilters { page: number; pageSize: number; search?: string; categoryId?: string; status?: string; available?: boolean; missingImage?: boolean; missingTranslation?: boolean; sort?: string }
export interface MasterRecord { id: string; code: string; nameEn: string; nameAr?: string; descriptionEn?: string; descriptionAr?: string; displayOrder?: number; isActive: boolean; usageCount: number; createdAt: string; updatedAt: string }
export interface PlanSummary { id: string; code: string; nameEn: string; nameAr?: string; shortDescription?: string; planType: string; durationDays: number; customizable: boolean; published: boolean; active: boolean; validFrom?: string; validUntil?: string; priceFrom?: number; updatedAt: string }
export interface AuditEntry { id: string; entityType: string; entityId: string; action: string; changedBy: string; changedAt: string; previousValues?: Record<string, unknown>; newValues?: Record<string, unknown>; notes?: string }
export interface DashboardData { activeMeals: number; draftMeals: number; unavailableMeals: number; publishedPlans: number; draftPlans: number; expiringMeals: number; scheduledPriceChanges: number; missingImages: number; missingArabic: number; missingNutrition: number; mealsByCategory: { name: string; value: number }[]; mealsByTag: { name: string; value: number }[]; plansByStatus: { name: string; value: number }[]; availability: { date: string; available: number; unavailable: number }[] }
export interface ScreenPermission {
  screenId: string; groupCode: string; groupName: string; screenCode: string; screenName: string;
  routeUrl?: string; icon?: string; displayOrder: number; isActive: boolean; canRead: boolean; canWrite: boolean;
}
export interface AccessRole { id: string; roleName: string; description?: string; isActive: boolean; screens: ScreenPermission[] }
export interface AccessUser {
  profileId: string; userId: string; email: string; firstName: string; lastName: string; mobile?: string;
  status: string; isActive: boolean; roleIds: string[]; roleNames: string[];
}
