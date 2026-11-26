import { describe, expect, it } from 'vitest';
import { LEVELS, levelById, starsFor } from '../src/games/match3/data/levels';
import { dailySeed } from '../src/games/match3/data/daily';
import { defaultSave, migrateSave } from '../src/games/match3/systems/save';

describe('match3 progression', () => {
  it('clamps unlocked levels to the available range', () => {
    expect(migrateSave({ schemaVersion: 1, unlockedLevel: 999 }).unlockedLevel).toBe(
      LEVELS.length,
    );
    expect(migrateSave({ schemaVersion: 1, unlockedLevel: -5 }).unlockedLevel).toBe(1);
  });

  it('migrates v1 saves', () => {
    const save = migrateSave({ schemaVersion: 1, bestScore: 1234, wins: 3 });
    expect(save.schemaVersion).toBe(3);
    expect(save.bestScore).toBe(1234);
    expect(save.wins).toBe(3);
    expect(save.unlockedLevel).toBe(1);
    expect(save.stars).toEqual({});
    expect(save.dailyDate).toBe('');
    expect(save.dailyBest).toBe(0);
  });

  it('keeps valid stars and drops invalid ones', () => {
    const save = migrateSave({
      schemaVersion: 2,
      stars: { '1': 3, '2': 0, '3': 9, '4': 2 },
      dailyDate: '2026-02-01',
      dailyBest: 1800,
    });
    expect(save.stars).toEqual({ '1': 3, '4': 2 });
    expect(save.dailyDate).toBe('2026-02-01');
    expect(save.dailyBest).toBe(1800);
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

  it('defaults to a playable level 1 save', () => {
    const save = defaultSave();
    expect(save.unlockedLevel).toBe(1);
    expect(save.schemaVersion).toBe(3);
  });

  it('creates a stable daily seed per date', () => {
    expect(dailySeed('2026-02-01')).toBe(dailySeed('2026-02-01'));
    expect(dailySeed('2026-02-01')).not.toBe(dailySeed('2026-02-02'));
  });
});
