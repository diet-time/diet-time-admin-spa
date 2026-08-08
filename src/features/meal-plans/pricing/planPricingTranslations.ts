import axios from 'axios';
import type { MealPlanPriceTranslation, PlanPrice, PlanPriceInput } from '@/api/planPricingApi';

export type TranslationField = 'englishName' | 'englishDescription' | 'arabicName' | 'arabicDescription';
export type TranslationErrors = Partial<Record<TranslationField, string>>;
export interface PricingSaveError { message: string; fields: TranslationErrors }

interface TranslationValues {
  englishName: string;
  englishDescription: string;
  arabicName: string;
  arabicDescription: string;
}

interface ApiErrorEnvelope {
  errors?: Record<string, string[]> | Array<{ code?: string; message?: string; field?: string }>;
}

const translationField = (field: string, translations?: MealPlanPriceTranslation[]): TranslationField | undefined => {
  const normalized = field.toLowerCase();
  const indexMatch = normalized.match(/translations(?:\[|\.)(\d+)/);
  const language = normalized.includes('arabic') || normalized.includes('.ar')
    ? 'ar'
    : normalized.includes('english') || normalized.includes('.en')
      ? 'en'
      : indexMatch ? translations?.[Number(indexMatch[1])]?.languageCode.toLowerCase() : undefined;
  if (language !== 'en' && language !== 'ar') return undefined;
  return `${language === 'en' ? 'english' : 'arabic'}${normalized.includes('description') ? 'Description' : 'Name'}` as TranslationField;
};

export const pricingSaveError = (error: unknown, body?: PlanPriceInput): PricingSaveError => {
  const fallback = 'The pricing package could not be saved. Review the fields and try again.';
  if (!axios.isAxiosError<ApiErrorEnvelope>(error)) return { message: fallback, fields: {} };
  const errors = error.response?.data?.errors;
  const fields: TranslationErrors = {};
  let message = fallback;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      message = item.message ?? message;
      const code = item.code?.toLowerCase() ?? '';
      const mappedField = translationField(item.field ?? '', body?.translations);
      if (mappedField) fields[mappedField] = item.message ?? (code === 'max_length' ? 'This value is too long.' : 'Invalid translation value.');
      else if (code === 'duplicate_language' || code === 'invalid_language') {
        fields.englishName = fields.englishName ?? item.message ?? 'The translation language is invalid.';
        fields.arabicName = fields.arabicName ?? item.message ?? 'The translation language is invalid.';
      }
    }
  } else if (errors) {
    for (const [fieldName, messages] of Object.entries(errors)) {
      const mappedField = translationField(fieldName, body?.translations);
      if (mappedField) fields[mappedField] = messages[0];
    }
    message = Object.values(errors)[0]?.[0] ?? message;
  }
  return { message, fields };
};

export const buildPriceTranslations = (values: TranslationValues): MealPlanPriceTranslation[] => {
  const translations: MealPlanPriceTranslation[] = [];
  const englishName = values.englishName.trim();
  const englishDescription = values.englishDescription.trim();
  const arabicName = values.arabicName.trim();
  const arabicDescription = values.arabicDescription.trim();
  if (englishName || englishDescription) translations.push({ languageCode: 'en', name: englishName, description: englishDescription || null });
  if (arabicName || arabicDescription) translations.push({ languageCode: 'ar', name: arabicName, description: arabicDescription || null });
  return translations;
};

export const priceTranslation = (price: PlanPrice, languageCode: 'en' | 'ar') =>
  price.translations?.find((item) => item.languageCode.toLowerCase() === languageCode);

export const priceDisplayName = (price: PlanPrice) =>
  priceTranslation(price, 'en')?.name?.trim()
  || price.packageNameEn?.trim()
  || price.mealPlanName?.trim()
  || `${price.currencyCode} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price.amount)}`;
