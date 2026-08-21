import { describe, expect, it } from 'vitest';
import { adminApiUrl } from './apiClient';

describe('adminApiUrl', () => {
  it('targets unversioned meal configuration endpoints', () => {
    expect(new URL(adminApiUrl('package-options')).pathname).toBe('/api/admin/package-options');
    expect(new URL(adminApiUrl('/meal-plans/plan-1/weekly-menu')).pathname).toBe('/api/admin/meal-plans/plan-1/weekly-menu');
  });
});
