export const CHEST_TIERS = [
  { at: 0.33, coins: 4 },
  { at: 0.66, coins: 6 },
  { at: 1, coins: 10 },
] as const;

export interface RoundRewardInput {
  score: number;
  target: number;
  firstClear: boolean;
  stars: number;
  won: boolean;
}

export interface RoundReward {
  participation: number;
  scoreCoins: number;
  chests: number;
  firstClear: number;
  threeStar: number;
  total: number;
}

/** 无时间限制模式没有目标分，按本局分数给币；长局封顶，避免挂机刷币。 */
export function endlessReward(score: number): number {
  return 4 + Math.min(56, Math.floor(Math.max(0, score) / 150));
}

export function chestCoinsFor(score: number, target: number): number {
  const progress = target > 0 ? Math.max(0, score) / target : 0;
  return CHEST_TIERS.reduce((sum, tier) => sum + (progress >= tier.at ? tier.coins : 0), 0);
}

export function liveRoundCoins(score: number, target: number): number {
  const participation = 3;
  const progress = target > 0 ? Math.min(1.4, Math.max(0, score) / target) : 0;
  const scoreCoins = Math.min(18, Math.floor(progress * 18));
  return participation + scoreCoins + chestCoinsFor(score, target);
}

export function roundReward(input: RoundRewardInput): RoundReward {
  const progress = input.target > 0 ? Math.min(1.4, Math.max(0, input.score) / input.target) : 0;
  const participation = input.won ? 8 : 3;
  const scoreCoins = Math.min(18, Math.floor(progress * 18));
  const chests = chestCoinsFor(input.score, input.target);
  const firstClear = input.won && input.firstClear ? 20 : 0;
  const threeStar = input.won && input.stars >= 3 ? 10 : 0;

  return {
    participation,
    scoreCoins,
    chests,
    firstClear,
    threeStar,
    total: participation + scoreCoins + chests + firstClear + threeStar,
  };
}
