import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import {
  MVP_MENU_WEEKDAYS,
  defaultWeekdayDisplayOrder,
  isWeekdayConfigured,
  menuWeekdayFromDate,
  normalizeMenuWeekday,
  sortMenuDays,
} from './menuWeekdays';

describe('weekly menu weekdays', () => {
  it('uses Saturday through Thursday for the default MVP schedule', () => {
    expect(MVP_MENU_WEEKDAYS).toEqual(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
  });

  it('normalizes canonical weekday codes case-insensitively', () => {
    expect(normalizeMenuWeekday('wednesday')).toBe('WEDNESDAY');
  });

  it('rejects records without a canonical menuWeekday', () => {
    expect(() => normalizeMenuWeekday(undefined)).toThrow('supported weekday');
  });

  it('sorts menu days by display order', () => {
    const sorted = sortMenuDays([
      { menuWeekday: 'THURSDAY' as const, displayOrder: 6 },
      { menuWeekday: 'SATURDAY' as const, displayOrder: 1 },
    ]);
    expect(sorted.map((day) => day.menuWeekday)).toEqual(['SATURDAY', 'THURSDAY']);
  });

  it('suggests stable default display orders', () => {
    expect(defaultWeekdayDisplayOrder('WEDNESDAY')).toBe(5);
  });

  it('detects configured weekdays for duplicate prevention', () => {
    expect(isWeekdayConfigured([{ menuWeekday: 'WEDNESDAY' }], 'WEDNESDAY')).toBe(true);
  });

  it('maps JavaScript dates to menu weekdays', () => {
    expect(menuWeekdayFromDate(new Date(2026, 6, 15))).toBe('WEDNESDAY');
  });

  it('renders the Arabic weekday translation without changing the API code', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.t('weekdays.WEDNESDAY')).toBe('الأربعاء');
    expect(normalizeMenuWeekday('WEDNESDAY')).toBe('WEDNESDAY');
    await i18n.changeLanguage('en');
  });
});
