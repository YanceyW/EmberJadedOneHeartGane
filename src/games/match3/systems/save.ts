import { LEVELS } from '../data/levels';

export interface Match3Save {
  schemaVersion: 5;
  /** 闯关模式最高分。 */
  bestScore: number;
  /** 无时间限制模式最高分。 */
  endlessBest: number;
  /** 无时间限制单局最长用时（秒），只做展示。 */
  endlessBestSeconds: number;
  wins: number;
  unlockedLevel: number;
  stars: Record<string, number>;
}

export function defaultSave(): Match3Save {
  return {
    schemaVersion: 5,
    bestScore: 0,
    endlessBest: 0,
    endlessBestSeconds: 0,
    wins: 0,
    unlockedLevel: 1,
    stars: {},
  };
}

export function migrateSave(input: unknown): Match3Save {
  const save = defaultSave();
  if (!input || typeof input !== 'object') return save;
  const raw = input as Record<string, unknown>;
  if (typeof raw.bestScore === 'number' && Number.isFinite(raw.bestScore)) {
    save.bestScore = Math.max(0, Math.floor(raw.bestScore));
  }
  if (typeof raw.endlessBest === 'number' && Number.isFinite(raw.endlessBest)) {
    save.endlessBest = Math.max(0, Math.floor(raw.endlessBest));
  }
  if (typeof raw.endlessBestSeconds === 'number' && Number.isFinite(raw.endlessBestSeconds)) {
    save.endlessBestSeconds = Math.max(0, Math.floor(raw.endlessBestSeconds));
  }
  if (typeof raw.wins === 'number' && Number.isFinite(raw.wins)) {
    save.wins = Math.max(0, Math.floor(raw.wins));
  }
  if (typeof raw.unlockedLevel === 'number' && Number.isFinite(raw.unlockedLevel)) {
    save.unlockedLevel = Math.min(LEVELS.length, Math.max(1, Math.floor(raw.unlockedLevel)));
  }
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [key, value] of Object.entries(raw.stars as Record<string, unknown>)) {
      if (typeof value === 'number' && value >= 1 && value <= 3) {
        save.stars[key] = Math.floor(value);
      }
    }
  }
  // v1–v3 的每日挑战字段不再读取；旧档只保留闯关进度。
  return save;
}

// 云同步冲突时按「取进度更大的一方」合并：星级取高、关卡取远、当日最佳取高。
export function mergeSaves(local: Match3Save, remote: Match3Save): Match3Save {
  const stars: Record<string, number> = { ...remote.stars };
  for (const [key, value] of Object.entries(local.stars)) {
    stars[key] = Math.max(stars[key] ?? 0, value);
  }

  return {
    schemaVersion: 5,
    bestScore: Math.max(local.bestScore, remote.bestScore),
    endlessBest: Math.max(local.endlessBest, remote.endlessBest || 0),
    endlessBestSeconds: Math.max(
      local.endlessBestSeconds || 0,
      remote.endlessBestSeconds || 0,
    ),
    wins: Math.max(local.wins, remote.wins),
    unlockedLevel: Math.max(local.unlockedLevel, remote.unlockedLevel),
    stars,
  };
}
