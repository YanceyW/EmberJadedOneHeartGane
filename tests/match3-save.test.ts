import { describe, expect, it } from 'vitest';
import { LEVELS, levelById, starsFor } from '../src/games/match3/data/levels';
import { defaultSave, mergeSaves, migrateSave } from '../src/games/match3/systems/save';

describe('match3 progression', () => {
  it('clamps unlocked levels to the available range', () => {
    expect(migrateSave({ schemaVersion: 1, unlockedLevel: 999 }).unlockedLevel).toBe(
      LEVELS.length,
    );
    expect(migrateSave({ schemaVersion: 1, unlockedLevel: -5 }).unlockedLevel).toBe(1);
  });

  it('migrates v1 saves and drops the retired daily fields', () => {
    const save = migrateSave({
      schemaVersion: 1,
      bestScore: 1234,
      wins: 3,
      dailyDate: '2026-02-01',
      dailyBest: 1800,
    });
    expect(save.schemaVersion).toBe(5);
    expect(save.bestScore).toBe(1234);
    expect(save.endlessBest).toBe(0);
    expect(save.endlessBestSeconds).toBe(0);
    expect(save.wins).toBe(3);
    expect(save.unlockedLevel).toBe(1);
    expect(save.stars).toEqual({});
    expect(save).not.toHaveProperty('dailyDate');
  });

  it('keeps valid stars and drops invalid ones', () => {
    const save = migrateSave({
      schemaVersion: 2,
      stars: { '1': 3, '2': 0, '3': 9, '4': 2 },
    });
    expect(save.stars).toEqual({ '1': 3, '4': 2 });
  });

  it('merges campaign and endless best scores independently', () => {
    const merged = mergeSaves(
      {
        ...defaultSave(),
        bestScore: 5000,
        endlessBest: 1200,
        endlessBestSeconds: 610,
        wins: 2,
        stars: { '1': 2 },
      },
      {
        ...defaultSave(),
        bestScore: 4200,
        endlessBest: 2600,
        endlessBestSeconds: 320,
        wins: 4,
        stars: { '1': 3 },
      },
    );
    expect(merged.bestScore).toBe(5000);
    expect(merged.endlessBest).toBe(2600);
    expect(merged.endlessBestSeconds).toBe(610);
    expect(merged.wins).toBe(4);
    expect(merged.stars['1']).toBe(3);
  });

  it('falls back to the first level for unknown ids', () => {
    expect(levelById(999).id).toBe(1);
    expect(levelById(5).id).toBe(5);
  });

  it('computes 1/2/3 stars from the target', () => {
    const level = levelById(3);
    expect(starsFor(level, level.target - 1)).toBe(0);
    expect(starsFor(level, level.target)).toBe(1);
    expect(starsFor(level, Math.round(level.target * 1.25))).toBe(2);
    expect(starsFor(level, Math.round(level.target * 1.5))).toBe(3);
  });

  it('defaults to a playable level 1 save with both best scores', () => {
    const save = defaultSave();
    expect(save.unlockedLevel).toBe(1);
    expect(save.schemaVersion).toBe(5);
    expect(save.endlessBest).toBe(0);
    expect(save.endlessBestSeconds).toBe(0);
  });
});
