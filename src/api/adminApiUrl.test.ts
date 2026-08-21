import { describe, expect, it } from 'vitest';
import { adminApiUrl } from './apiClient';

describe('adminApiUrl', () => {
  it('targets unversioned meal configuration endpoints', () => {
    expect(new URL(adminApiUrl('package-options')).pathname).toBe('/api/admin/package-options');
  });
});
