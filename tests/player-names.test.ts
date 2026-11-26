import { describe, expect, it } from 'vitest';
import {
  generateLocalName,
  generateNameCandidates,
  isValidDisplayName,
  PLAYER_NAME_PREFIX,
} from '../src/shared/content/player-names';

describe('player names', () => {
  it('generates stable local names from the same player id', () => {
    expect(generateLocalName('p-abc')).toBe(generateLocalName('p-abc'));
    expect(generateLocalName('p-abc')).not.toBe(generateLocalName('p-def'));
  });

  it('keeps names 2-4 Chinese characters after the prefix', () => {
    const name = generateLocalName('p-abc');
    const short = name.slice(PLAYER_NAME_PREFIX.length);
    expect(short.length).toBeGreaterThanOrEqual(2);
    expect(short.length).toBeLessThanOrEqual(4);
    expect(isValidDisplayName(name)).toBe(true);
  });

  it('returns distinct candidates in a batch', () => {
    const names = generateNameCandidates('p-abc', 3);
    expect(names).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
    for (const name of names) expect(isValidDisplayName(name)).toBe(true);
  });

  it('rejects free text and malformed names', () => {
    expect(isValidDisplayName('桃酥')).toBe(false);
    expect(isValidDisplayName(`${PLAYER_NAME_PREFIX}ab`)).toBe(false);
    expect(isValidDisplayName(`${PLAYER_NAME_PREFIX}桃酥小满长`)).toBe(false);
    expect(isValidDisplayName(`${PLAYER_NAME_PREFIX}桃酥`)).toBe(true);
  });
});
