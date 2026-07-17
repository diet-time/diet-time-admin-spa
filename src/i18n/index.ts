import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: {
    weekdays: { SATURDAY: 'Saturday', SUNDAY: 'Sunday', MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday' },
    weeklySchedule: { title: 'Weekly Schedule', addMenuDay: 'Add Menu Day', menuDaySettings: 'Menu Day Settings', weekday: 'Weekday', displayOrder: 'Display order', active: 'Active', inactive: 'Inactive', slots: 'slots', deleteMenuDay: 'Deactivate menu day', alreadyAdded: 'Already added', weekdayRequired: 'Weekday is required.', invalidDisplayOrder: 'Display order must be greater than zero.', duplicateWeekday: 'This weekday already exists in the template.', saveError: 'The menu day could not be saved.', cancel: 'Cancel', saving: 'Saving…', templateType: 'Template type', schedule: 'Schedule', saturdayToThursday: 'Saturday to Thursday', hierarchy: 'Meal plan template → weekday → meal slot → meal options' },
    appName: 'Diet Time Admin', dashboard: 'Dashboard', meals: 'Meals', mealPlans: 'Meal Plans', operations: 'Operations', deliveryCalendar: 'Delivery Calendar', categories: 'Categories', ingredients: 'Ingredients', allergens: 'Allergens', tags: 'Tags', mealTypes: 'Meal Types', pricing: 'Pricing', media: 'Media', audit: 'Audit History', settings: 'Settings', search: 'Search', logout: 'Log out', needsAttention: 'Needs attention', retry: 'Try again', noData: 'No data available', saveDraft: 'Save draft', publish: 'Publish',
  } },
  ar: { translation: {
    weekdays: { SATURDAY: 'السبت', SUNDAY: 'الأحد', MONDAY: 'الاثنين', TUESDAY: 'الثلاثاء', WEDNESDAY: 'الأربعاء', THURSDAY: 'الخميس', FRIDAY: 'الجمعة' },
    weeklySchedule: { title: 'الجدول الأسبوعي', addMenuDay: 'إضافة يوم قائمة', menuDaySettings: 'إعدادات يوم القائمة', weekday: 'يوم الأسبوع', displayOrder: 'ترتيب العرض', active: 'نشط', inactive: 'غير نشط', slots: 'وجبات', deleteMenuDay: 'تعطيل يوم القائمة', alreadyAdded: 'مضاف مسبقاً', weekdayRequired: 'يوم الأسبوع مطلوب.', invalidDisplayOrder: 'يجب أن يكون ترتيب العرض أكبر من صفر.', duplicateWeekday: 'يوم الأسبوع موجود مسبقاً في القالب.', saveError: 'تعذر حفظ يوم القائمة.', cancel: 'إلغاء', saving: 'جارٍ الحفظ…', templateType: 'نوع القالب', schedule: 'الجدول', saturdayToThursday: 'من السبت إلى الخميس', hierarchy: 'قالب خطة الوجبات ← يوم الأسبوع ← الوجبة ← خيارات الوجبات' },
    appName: 'إدارة دايت تايم', dashboard: 'لوحة التحكم', meals: 'الوجبات', mealPlans: 'خطط الوجبات', operations: 'العمليات', deliveryCalendar: 'تقويم التوصيل', categories: 'الفئات', ingredients: 'المكونات', allergens: 'مسببات الحساسية', tags: 'الوسوم', mealTypes: 'أنواع الوجبات', pricing: 'التسعير', media: 'الوسائط', audit: 'سجل التدقيق', settings: 'الإعدادات', search: 'بحث', logout: 'تسجيل الخروج', needsAttention: 'يحتاج إلى اهتمام', retry: 'حاول مرة أخرى', noData: 'لا توجد بيانات', saveDraft: 'حفظ كمسودة', publish: 'نشر',
  } },
};

void i18n.use(LanguageDetector).use(initReactI18next).init({ resources, fallbackLng: 'en', supportedLngs: ['en', 'ar'], interpolation: { escapeValue: false }, detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] } });
export default i18n;
