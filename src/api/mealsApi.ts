import { apiClient } from './apiClient';
import type { MealFilters, MealSummary, PagedResponse } from './apiTypes';
import type { MealMedia } from './mediaApi';
import type { MealFormValues } from '@/features/meals/schemas/mealSchema';
import { defaultMealValues } from '@/features/meals/schemas/mealSchema';

interface MealsListApiItem {
  id: string;
  sku: string;
  status: string;
  versionNumber: number;
  isAvailable: boolean;
  name: string;
  nameAr?: string;
  thumbnailUrl?: string;
  categoryName?: string;
  calories?: number;
  protein?: number;
  currentPrice?: number | string | {
    amount?: number | string;
    currencyCode?: string;
    currency?: string;
  };
  currentPriceAmount?: number | string;
  currency?: string;
  currencyCode?: string;
  prices?: Array<{
    priceType?: string;
    amount?: number | string;
    currencyCode?: string;
    currency?: string;
    effectiveFrom?: string;
    effectiveUntil?: string | null;
    isActive?: boolean;
  }>;
  availableFrom?: string;
  availableUntil?: string;
  updatedAt: string;
}

interface MealsListApiResponse {
  data?: MealsListApiItem[];
  items?: MealsListApiItem[];
  meta?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

const normalizeStatus = (status: string): MealSummary['status'] => {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'Active';
  if (normalized === 'inactive') return 'Inactive';
  if (normalized === 'archived') return 'Archived';
  return 'Draft';
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const currentListPrice = (meal: MealsListApiItem) => {
  const currentPrice = typeof meal.currentPrice === 'object' ? meal.currentPrice : undefined;
  const directAmount = toFiniteNumber(currentPrice?.amount ?? meal.currentPriceAmount ?? meal.currentPrice);
  if (directAmount !== undefined) {
    return {
      amount: directAmount,
      currency: currentPrice?.currencyCode ?? currentPrice?.currency ?? meal.currencyCode ?? meal.currency,
    };
  }

  const now = Date.now();
  const price = meal.prices?.find((candidate) => {
    if (candidate.priceType && candidate.priceType.toUpperCase() !== 'INDIVIDUAL') return false;
    if (candidate.isActive === false) return false;
    const startsAt = candidate.effectiveFrom ? new Date(candidate.effectiveFrom).getTime() : undefined;
    const endsAt = candidate.effectiveUntil ? new Date(candidate.effectiveUntil).getTime() : undefined;
    return (startsAt === undefined || Number.isNaN(startsAt) || startsAt <= now)
      && (endsAt === undefined || Number.isNaN(endsAt) || endsAt >= now);
  });

  return {
    amount: toFiniteNumber(price?.amount),
    currency: price?.currencyCode ?? price?.currency ?? meal.currencyCode ?? meal.currency,
  };
};

const normalizeMealsResponse = (response: MealsListApiResponse, filters: MealFilters): PagedResponse<MealSummary> => {
  const sourceItems = response.data ?? response.items ?? [];
  const meta = response.meta;

  return {
    items: sourceItems.map((meal) => {
      const price = currentListPrice(meal);
      return {
        id: meal.id,
        sku: meal.sku,
        nameEn: meal.name,
        nameAr: meal.nameAr,
        thumbnailUrl: meal.thumbnailUrl,
        categoryName: meal.categoryName ?? 'Not assigned',
        calories: meal.calories,
        protein: meal.protein,
        currentPrice: price.amount,
        currency: price.currency,
        status: normalizeStatus(meal.status),
        revisionNumber: meal.versionNumber,
        isAvailable: meal.isAvailable,
        availableFrom: meal.availableFrom,
        availableUntil: meal.availableUntil,
        updatedAt: meal.updatedAt,
      };
    }),
    page: meta?.page ?? response.page ?? filters.page,
    pageSize: meta?.pageSize ?? response.pageSize ?? filters.pageSize,
    totalCount: meta?.totalCount ?? response.totalCount ?? sourceItems.length,
    totalPages: meta?.totalPages ?? response.totalPages ?? 1,
  };
};

interface AdminMealDetailResponse {
  data: {
    id: string;
    status?: string;
    media?: MealMedia[];
    meal?: {
      sku?: string;
      categoryId?: string;
      preparationTimeMinutes?: number;
      isVegetarian?: boolean;
      isVegan?: boolean;
      isGlutenFree?: boolean;
      isDairyFree?: boolean;
      isSpicy?: boolean;
      spiceLevel?: number;
      isAvailable?: boolean;
      availableFrom?: string;
      availableUntil?: string;
      translations?: Array<{
        languageCode?: string;
        name?: string;
        shortDescription?: string;
        fullDescription?: string;
        preparationInstructions?: string;
        servingNotes?: string;
      }>;
      nutrition?: {
        servingQuantity?: number;
        servingUnit?: string;
        caloriesKcal?: number;
        proteinGrams?: number;
        carbohydratesGrams?: number;
        fatGrams?: number;
        saturatedFatGrams?: number;
        transFatGrams?: number;
        fiberGrams?: number;
        sugarGrams?: number;
        sodiumMg?: number;
        cholesterolMg?: number;
      };
      ingredients?: Array<{
        ingredientId: string;
        quantity?: number;
        unit?: string;
        isOptional: boolean;
        canBeRemoved: boolean;
        canBeReplaced: boolean;
        isPrimaryIngredient: boolean;
        displayOrder: number;
      }>;
      allergens?: Array<{
        allergenId: string;
        level: 'CONTAINS' | 'MAY_CONTAIN' | 'TRACES';
      }>;
      prices?: Array<{
        priceType?: string;
        currencyCode?: string;
        amount?: number;
        effectiveFrom?: string;
        effectiveUntil?: string | null;
        isActive?: boolean;
      }>;
      tagIds?: string[];
    };
  };
}

interface VersionedUpdateApiResponse { data: { id: string; createdDraft: boolean } }

const availabilityMode = (
  isAvailable: boolean,
  availableFrom?: string,
  availableUntil?: string,
): MealFormValues['availability']['mode'] => {
  if (!isAvailable && !availableFrom && !availableUntil) return 'indefinite';
  if (availableFrom && availableUntil) return 'range';
  if (availableFrom) return 'from';
  if (availableUntil) return 'until';
  return 'always';
};

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const toIsoTimestamp = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const normalizeMealDetail = (response: AdminMealDetailResponse): MealFormValues & { id: string; media: MealMedia[]; hasNutrition: boolean } => {
  const detail = response.data;
  const meal = detail.meal ?? {};
  const english = meal.translations?.find((translation) => translation.languageCode?.toLowerCase() === 'en');
  const arabic = meal.translations?.find((translation) => translation.languageCode?.toLowerCase() === 'ar');
  const nutrition = meal.nutrition ?? {};
  const isAvailable = meal.isAvailable ?? true;

  return {
    ...defaultMealValues,
    id: detail.id,
    media: detail.media ?? [],
    hasNutrition: meal.nutrition !== undefined && meal.nutrition !== null,
    sku: meal.sku ?? '',
    categoryId: meal.categoryId ?? '',
    preparationMinutes: meal.preparationTimeMinutes ?? 0,
    status: normalizeStatus(detail.status ?? 'Draft'),
    translations: {
      en: {
        name: english?.name ?? '',
        shortDescription: english?.shortDescription,
        fullDescription: english?.fullDescription,
        preparationInstructions: english?.preparationInstructions,
        servingNotes: english?.servingNotes,
      },
      ...(arabic ? {
        ar: {
          name: arabic.name ?? '',
          shortDescription: arabic.shortDescription,
          fullDescription: arabic.fullDescription,
          preparationInstructions: arabic.preparationInstructions,
          servingNotes: arabic.servingNotes,
        },
      } : {}),
    },
    nutrition: {
      servingQuantity: nutrition.servingQuantity ?? 1,
      servingUnit: nutrition.servingUnit ?? 'serving',
      calories: nutrition.caloriesKcal ?? 0,
      protein: nutrition.proteinGrams ?? 0,
      carbohydrates: nutrition.carbohydratesGrams ?? 0,
      fat: nutrition.fatGrams ?? 0,
      saturatedFat: nutrition.saturatedFatGrams,
      transFat: nutrition.transFatGrams,
      fibre: nutrition.fiberGrams,
      sugar: nutrition.sugarGrams,
      sodium: nutrition.sodiumMg,
      cholesterol: nutrition.cholesterolMg,
    },
    dietary: {
      ...defaultMealValues.dietary,
      vegetarian: meal.isVegetarian ?? false,
      vegan: meal.isVegan ?? false,
      glutenFree: meal.isGlutenFree ?? false,
      dairyFree: meal.isDairyFree ?? false,
      spicy: meal.isSpicy ?? false,
      spiceLevel: meal.spiceLevel ?? 0,
    },
    ingredients: meal.ingredients ?? [],
    allergens: meal.allergens ?? [],
    prices: (meal.prices ?? [])
      .filter((price) => price.priceType?.toUpperCase() === 'INDIVIDUAL')
      .map((price) => ({
        priceType: 'INDIVIDUAL' as const,
        currencyCode: price.currencyCode?.toUpperCase() ?? 'QAR',
        amount: price.amount ?? 0,
        effectiveFrom: toLocalDateTimeInput(price.effectiveFrom),
        effectiveUntil: toLocalDateTimeInput(price.effectiveUntil),
        isActive: price.isActive ?? true,
      })),
    availability: {
      mode: availabilityMode(isAvailable, meal.availableFrom, meal.availableUntil),
      isAvailable,
      availableFrom: meal.availableFrom,
      availableUntil: meal.availableUntil,
    },
    tags: meal.tagIds ?? [],
  };
};

const toAdminMealRequest = (meal: MealFormValues) => ({
  sku: meal.sku,
  status: meal.status.toUpperCase(),
  categoryId: meal.categoryId,
  preparationTimeMinutes: meal.preparationMinutes,
  isVegetarian: meal.dietary.vegetarian,
  isVegan: meal.dietary.vegan,
  isGlutenFree: meal.dietary.glutenFree,
  isDairyFree: meal.dietary.dairyFree,
  isSpicy: meal.dietary.spicy,
  spiceLevel: meal.dietary.spiceLevel,
  isAvailable: meal.availability.isAvailable,
  availableFrom: meal.availability.availableFrom,
  availableUntil: meal.availability.availableUntil,
  translations: [
    { languageCode: 'en', name: meal.translations.en.name, shortDescription: meal.translations.en.shortDescription, fullDescription: meal.translations.en.fullDescription, preparationInstructions: meal.translations.en.preparationInstructions, servingNotes: meal.translations.en.servingNotes },
    ...(meal.translations.ar ? [{ languageCode: 'ar', name: meal.translations.ar.name, shortDescription: meal.translations.ar.shortDescription, fullDescription: meal.translations.ar.fullDescription, preparationInstructions: meal.translations.ar.preparationInstructions, servingNotes: meal.translations.ar.servingNotes }] : []),
  ],
  nutrition: {
    servingQuantity: meal.nutrition.servingQuantity,
    servingUnit: meal.nutrition.servingUnit,
    caloriesKcal: meal.nutrition.calories,
    proteinGrams: meal.nutrition.protein,
    carbohydratesGrams: meal.nutrition.carbohydrates,
    fatGrams: meal.nutrition.fat,
    saturatedFatGrams: meal.nutrition.saturatedFat,
    transFatGrams: meal.nutrition.transFat,
    fiberGrams: meal.nutrition.fibre,
    sugarGrams: meal.nutrition.sugar,
    sodiumMg: meal.nutrition.sodium,
    cholesterolMg: meal.nutrition.cholesterol,
  },
  ingredients: meal.ingredients,
  allergens: meal.allergens,
  prices: meal.prices.map((price) => ({
    priceType: price.priceType,
    currencyCode: price.currencyCode.trim().toUpperCase(),
    amount: price.amount,
    effectiveFrom: toIsoTimestamp(price.effectiveFrom),
    effectiveUntil: toIsoTimestamp(price.effectiveUntil),
    isActive: price.isActive,
  })),
  tagIds: meal.tags,
});

export const mealsApi = {
  list: async (filters: MealFilters, signal?: AbortSignal) => {
    const response = await apiClient.get<MealsListApiResponse>('/admin/meals', { params: filters, signal });
    return normalizeMealsResponse(response.data, filters);
  },
  get: async (id: string, signal?: AbortSignal) => {
    const response = await apiClient.get<AdminMealDetailResponse>(`/admin/meals/${id}`, { signal });
    return normalizeMealDetail(response.data);
  },
  create: async (body: MealFormValues) => (await apiClient.post<{ data: { id: string } }>('/admin/meals', toAdminMealRequest(body))).data.data,
  update: async (id: string, body: MealFormValues) => (await apiClient.put<VersionedUpdateApiResponse>(`/admin/meals/${id}`, toAdminMealRequest(body))).data.data,
  status: async (id: string, status: string) => (await apiClient.patch(`/admin/meals/${id}/status`, { status })).data,
};
