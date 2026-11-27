import { describe, expect, it } from 'vitest';
import { TILE_SKINS } from '../src/shared/content/tile-skins';
import { LEVELS } from '../src/games/match3/data/levels';
import { nextStarGap, starBarRatio, starGoals } from '../src/games/match3/systems/progress';
import { TILE_THEMES, tileTheme } from '../src/games/match3/systems/tiles';

describe('match3 star chase', () => {
  it('puts two and three stars above the target so play must continue', () => {
    const level = LEVELS[0];
    expect(starGoals(level)).toEqual([
      level.target,
      Math.round(level.target * 1.25),
      Math.round(level.target * 1.5),
    ]);
    expect(nextStarGap(level, level.target - 1)?.stars).toBe(1);
    expect(nextStarGap(level, level.target)).toEqual({
      stars: 2,
      at: Math.round(level.target * 1.25),
      gap: Math.round(level.target * 1.25) - level.target,
    });
    expect(nextStarGap(level, level.target * 2)).toBeNull();
  });

  it('keeps the progress bar short of full until all three stars are in', () => {
    const level = LEVELS[0];
    expect(starBarRatio(level, 0)).toBe(0);
    expect(starBarRatio(level, level.target)).toBeCloseTo(1 / 1.5, 5);
    expect(starBarRatio(level, level.target * 1.5)).toBe(1);
    expect(starBarRatio(level, level.target * 99)).toBe(1);
  });
});

describe('match3 tile skins sold in the shop', () => {
  it('gives every skin five unique sprites and a price', () => {
    for (const skin of TILE_SKINS) {
      expect(skin.sprites).toHaveLength(5);
      expect(new Set(skin.sprites).size).toBe(5);
      expect(skin.venue.length).toBeGreaterThan(0);
    }
    expect(TILE_SKINS[0].price).toBe(0);
    expect(TILE_SKINS.find((skin) => skin.id === 'farm')?.price).toBe(180);
    expect(TILE_THEMES.farm.sprites).toContain('tile-wheat');
    expect(TILE_THEMES.town.sprites).toContain('tile-bread');
    expect(TILE_SKINS.find((skin) => skin.id === 'ranch')?.unlockHint).toBeTruthy();
    expect(TILE_THEMES.ranch.sprites).toContain('tile-egg');
  });

  it('falls back to the free sweets skin for unknown ids', () => {
    expect(tileTheme('unknown').id).toBe('sweets');
  });

  it('has no per-level theme dependency after skins moved to the shop', () => {
    expect(LEVELS.every((level) => !('tiles' in level))).toBe(true);
  });
});
