import { describe, expect, it } from 'vitest';
import { createRng, hashString } from '../src/core/rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(123456);
    const b = createRng(123456);
    const left = Array.from({ length: 20 }, () => a.next());
    const right = Array.from({ length: 20 }, () => b.next());
    expect(left).toEqual(right);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('hashes strings stably', () => {
    expect(hashString('match3')).toBe(hashString('match3'));
    expect(hashString('match3')).not.toBe(hashString('garden'));
  });
});
