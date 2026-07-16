import { describe, expect, it } from 'vitest';
import { toUtcIso } from './AvailabilityEditor';
describe('toUtcIso',()=>{it('returns ISO UTC',()=>expect(toUtcIso('2026-07-15T12:30')).toMatch(/^2026-07-15T\d{2}:30:00\.000Z$/));it('handles empty values',()=>expect(toUtcIso('')).toBeUndefined())});
