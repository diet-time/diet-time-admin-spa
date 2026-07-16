import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: { appName: 'Diet Time Admin', dashboard: 'Dashboard', meals: 'Meals', mealPlans: 'Meal Plans', categories: 'Categories', ingredients: 'Ingredients', allergens: 'Allergens', tags: 'Tags', mealTypes: 'Meal Types', pricing: 'Pricing', media: 'Media', audit: 'Audit History', settings: 'Settings', search: 'Search', logout: 'Log out', needsAttention: 'Needs attention', retry: 'Try again', noData: 'No data available', saveDraft: 'Save draft', publish: 'Publish' } },
  ar: { translation: { appName: 'إدارة دايت تايم', dashboard: 'لوحة التحكم', meals: 'الوجبات', mealPlans: 'خطط الوجبات', categories: 'الفئات', ingredients: 'المكونات', allergens: 'مسببات الحساسية', tags: 'الوسوم', mealTypes: 'أنواع الوجبات', pricing: 'التسعير', media: 'الوسائط', audit: 'سجل التدقيق', settings: 'الإعدادات', search: 'بحث', logout: 'تسجيل الخروج', needsAttention: 'يحتاج إلى اهتمام', retry: 'حاول مرة أخرى', noData: 'لا توجد بيانات', saveDraft: 'حفظ كمسودة', publish: 'نشر' } },
};

void i18n.use(LanguageDetector).use(initReactI18next).init({ resources, fallbackLng: 'en', supportedLngs: ['en', 'ar'], interpolation: { escapeValue: false }, detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] } });
export default i18n;
