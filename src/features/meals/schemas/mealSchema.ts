import { z } from 'zod';

const optionalText = z.string().max(2000).optional();
const translationSchema = z.object({
  name: z.string().max(160),
  shortDescription: z.string().max(300).optional(),
  fullDescription: optionalText,
  preparationInstructions: optionalText,
  servingNotes: z.string().max(500).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});
const nutritionSchema = z.object({
  servingQuantity: z.coerce.number().positive(),
  servingUnit: z.string().min(1),
  calories: z.coerce.number().min(0).max(10000),
  protein: z.coerce.number().min(0).max(1000),
  carbohydrates: z.coerce.number().min(0).max(1000),
  fat: z.coerce.number().min(0).max(1000),
  saturatedFat: z.coerce.number().min(0).max(1000).optional(),
  transFat: z.coerce.number().min(0).max(1000).optional(),
  fibre: z.coerce.number().min(0).max(1000).optional(),
  sugar: z.coerce.number().min(0).max(1000).optional(),
  sodium: z.coerce.number().min(0).max(100000).optional(),
  cholesterol: z.coerce.number().min(0).max(100000).optional(),
});
const ingredientLinkSchema = z.object({ ingredientId: z.string().min(1), quantity: z.number().optional(), unit: z.string().optional(), isOptional: z.boolean(), canBeRemoved: z.boolean(), canBeReplaced: z.boolean(), isPrimaryIngredient: z.boolean(), displayOrder: z.number().int().min(0) });
const allergenLinkSchema = z.object({ allergenId: z.string().min(1), level: z.enum(['CONTAINS', 'MAY_CONTAIN', 'TRACES']) });
const priceSchema = z.object({
  priceType: z.literal('INDIVIDUAL'),
  currencyCode: z.string().trim().length(3, 'Use a 3-letter currency code'),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  effectiveFrom: z.string().min(1, 'Effective from is required'),
  effectiveUntil: z.string().optional(),
  isActive: z.boolean(),
});

export const mealSchema = z.object({
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphens, or underscores'),
  categoryId: z.string().min(1, 'Select a category'),
  preparationMinutes: z.coerce.number().int().min(0).max(1440),
  status: z.enum(['Draft', 'Published', 'Active', 'Inactive', 'Archived']),
  translations: z.object({ en: translationSchema.extend({ name: z.string().trim().min(1, 'English name is required').max(160) }), ar: translationSchema.optional() }),
  nutrition: nutritionSchema,
  dietary: z.object({ vegetarian: z.boolean(), vegan: z.boolean(), glutenFree: z.boolean(), dairyFree: z.boolean(), nutFree: z.boolean(), spicy: z.boolean(), spiceLevel: z.coerce.number().int().min(0).max(5) }),
  ingredients: z.array(ingredientLinkSchema),
  allergens: z.array(allergenLinkSchema),
  prices: z.array(priceSchema),
  availability: z.object({ mode: z.enum(['always', 'from', 'until', 'range', 'temporary', 'indefinite']), isAvailable: z.boolean(), availableFrom: z.string().optional(), availableUntil: z.string().optional() }),
  tags: z.array(z.string()),
  allergenReviewConfirmed: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.dietary.vegan && !data.dietary.vegetarian) ctx.addIssue({ code: 'custom', path: ['dietary', 'vegetarian'], message: 'Vegan meals must also be marked vegetarian.' });
  if (!data.dietary.spicy && data.dietary.spiceLevel !== 0) ctx.addIssue({ code: 'custom', path: ['dietary', 'spiceLevel'], message: 'Set spice level to zero when the meal is not spicy.' });
  if (data.availability.availableFrom && data.availability.availableUntil && new Date(data.availability.availableUntil) <= new Date(data.availability.availableFrom)) ctx.addIssue({ code: 'custom', path: ['availability', 'availableUntil'], message: 'End time must be after start time.' });
  data.prices.forEach((price, index) => {
    if (price.effectiveUntil && new Date(price.effectiveUntil) <= new Date(price.effectiveFrom)) ctx.addIssue({ code: 'custom', path: ['prices', index, 'effectiveUntil'], message: 'End time must be after the start time.' });
  });
});

export type MealFormValues = z.infer<typeof mealSchema>;

export const defaultMealValues: MealFormValues = {
  sku: '',
  categoryId: '',
  preparationMinutes: 0,
  status: 'Draft',
  translations: { en: { name: '' } },
  nutrition: { servingQuantity: 1, servingUnit: 'serving', calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
  dietary: { vegetarian: false, vegan: false, glutenFree: false, dairyFree: false, nutFree: false, spicy: false, spiceLevel: 0 },
  ingredients: [],
  allergens: [],
  prices: [],
  availability: { mode: 'always', isAvailable: true },
  tags: [],
  allergenReviewConfirmed: false,
};
