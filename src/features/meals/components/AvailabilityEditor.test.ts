import { describe, expect, it } from 'vitest';
import { deriveAvailabilityMode, toUtcIso } from './AvailabilityEditor';

describe('toUtcIso', () => {
  it('returns ISO UTC', () => expect(toUtcIso('2026-07-15T12:30')).toMatch(/^2026-07-15T\d{2}:30:00\.000Z$/));
  it('handles empty values', () => expect(toUtcIso('')).toBeUndefined());
});

describe('deriveAvailabilityMode', () => {
  it('marks unavailable meals as indefinite', () => {
    expect(deriveAvailabilityMode(false, '2026-07-15', '2026-07-20')).toBe('indefinite');
  });

  it.each([
    [undefined, undefined, 'always'],
    ['2026-07-15', undefined, 'from'],
    [undefined, '2026-07-20', 'until'],
    ['2026-07-15', '2026-07-20', 'range'],
  ] as const)('derives the mode from optional dates', (from, until, expected) => {
    expect(deriveAvailabilityMode(true, from, until)).toBe(expected);
  });
});
