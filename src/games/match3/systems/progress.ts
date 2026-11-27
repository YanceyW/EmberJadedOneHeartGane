import { Match3Level, starsFor } from '../data/levels';

/** 三星门槛：目标分、目标分 ×1.25、目标分 ×1.5。 */
export const STAR_RATIOS = [1, 1.25, 1.5] as const;

export function starGoals(level: Match3Level): number[] {
  return STAR_RATIOS.map((ratio) => Math.round(level.target * ratio));
}

/** 当前分数距离下一颗星还差多少分；三星已满返回 null。 */
export function nextStarGap(
  level: Match3Level,
  score: number,
): { stars: number; at: number; gap: number } | null {
  const goals = starGoals(level);
  for (let i = 0; i < goals.length; i += 1) {
    if (score < goals[i]) {
      return { stars: i + 1, at: goals[i], gap: goals[i] - score };
    }
  }
  return null;
}

/** 进度条比例：0 到三星门槛（不是 0 到目标分），避免达成目标后条就走满。 */
export function starBarRatio(level: Match3Level, score: number): number {
  const goals = starGoals(level);
  const max = goals[goals.length - 1] ?? level.target;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, score / max));
}

export function starsReached(level: Match3Level, score: number): number {
  return starsFor(level, score);
}
