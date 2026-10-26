import { describe, expect, it } from 'vitest';
import { discountError, discountPreview } from './packageDiscount';

describe('package discount preview', () => {
  it('keeps optional discounts empty and calculates cents and percentage', () => {
    expect(discountPreview(999, null)).toBeUndefined();
    expect(discountPreview(999, 799)).toEqual({ savings: 200, percentage: 20.02 });
    expect(discountPreview(10.01, 9.99)).toEqual({ savings: 0.02, percentage: 0.2 });
    expect(discountPreview(100, 0)).toEqual({ savings: 100, percentage: 100 });
  });
  it.each([-1, 999, 1000, 1.001, Number.NaN])('rejects invalid discounted price %s', value => {
    expect(discountError(999, value)).toBeTruthy();
    expect(discountPreview(999, value)).toBeUndefined();
  });
});
