import { describe, expect, it } from 'vitest';
import { compactNumber, formatDuration } from '../src/shared/format';

describe('format helpers', () => {
  it('keeps small numbers readable and compacts 万/亿', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(9_999)).toBe('9999');
    expect(compactNumber(10_000)).toBe('1万');
    expect(compactNumber(12_345)).toBe('1.2万');
    expect(compactNumber(99_999)).toBe('10万');
    expect(compactNumber(1_234_567)).toBe('123万');
    expect(compactNumber(120_000_000)).toBe('1.2亿');
  });

  it('guards against invalid values', () => {
    expect(compactNumber(-5)).toBe('0');
    expect(compactNumber(Number.NaN)).toBe('0');
  });

  it('formats durations for short and long sessions', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(7)).toBe('00:07');
    expect(formatDuration(187)).toBe('03:07');
    expect(formatDuration(3_607)).toBe('1:00:07');
  });
});
