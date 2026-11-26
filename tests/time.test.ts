import { describe, expect, it } from 'vitest';
import { TimeService } from '../src/core/time/time';

describe('weekKey', () => {
  const time = new TimeService();

  it('formats the ISO week of a mid-year date', () => {
    expect(time.weekKey(new Date(2026, 10, 26))).toBe('2026-W48');
  });

  it('puts new year days into the previous ISO year when needed', () => {
    expect(time.weekKey(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(time.weekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  });

  it('keeps monday and sunday in the same week', () => {
    expect(time.weekKey(new Date(2026, 10, 23))).toBe('2026-W48');
    expect(time.weekKey(new Date(2026, 10, 29))).toBe('2026-W48');
    expect(time.weekKey(new Date(2026, 10, 30))).toBe('2026-W49');
  });

  it('formats today into a stable week key', () => {
    expect(time.weekKey()).toMatch(/^\d{4}-W\d{2}$/);
  });
});
