import { LEVELS } from '../data/levels';

export interface Match3Save {
  schemaVersion: 3;
  bestScore: number;
  wins: number;
  unlockedLevel: number;
  stars: Record<string, number>;
  dailyDate: string;
  dailyBest: number;
}

export function defaultSave(): Match3Save {
  return {
    schemaVersion: 3,
    bestScore: 0,
    wins: 0,
    unlockedLevel: 1,
    stars: {},
    dailyDate: '',
    dailyBest: 0,
  };
}

export function migrateSave(input: unknown): Match3Save {
  const save = defaultSave();
  if (!input || typeof input !== 'object') return save;

  const raw = input as Record<string, unknown>;
  if (typeof raw.bestScore === 'number' && Number.isFinite(raw.bestScore)) {
    save.bestScore = Math.max(0, Math.floor(raw.bestScore));
  }
  if (typeof raw.wins === 'number' && Number.isFinite(raw.wins)) {
    save.wins = Math.max(0, Math.floor(raw.wins));
  }
  if (typeof raw.unlockedLevel === 'number' && Number.isFinite(raw.unlockedLevel)) {
    save.unlockedLevel = Math.min(
      LEVELS.length,
      Math.max(1, Math.floor(raw.unlockedLevel)),
    );
  }
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [key, value] of Object.entries(raw.stars as Record<string, unknown>)) {
      if (typeof value === 'number' && value >= 1 && value <= 3) {
        save.stars[key] = Math.floor(value);
      }
    }
  }
  if (typeof raw.dailyDate === 'string') {
    save.dailyDate = raw.dailyDate;
  }
  if (typeof raw.dailyBest === 'number' && Number.isFinite(raw.dailyBest)) {
    save.dailyBest = Math.max(0, Math.floor(raw.dailyBest));
  }

  // v1/v2 只有基础进度，上面的默认值已经兼容，无需额外字段。
  return save;
}
