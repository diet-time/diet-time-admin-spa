import { expect, it } from 'vitest';
import { dashboardToday } from './dashboardDates';
it('uses Qatar business dates across the UTC midnight boundary', () => {
  expect(dashboardToday(new Date('2026-11-01T20:59:00Z'))).toBe('2026-11-01');
  expect(dashboardToday(new Date('2026-11-01T21:01:00Z'))).toBe('2026-11-02');
});
