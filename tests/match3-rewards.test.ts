import { describe, expect, it } from 'vitest';
import { chestCoinsFor, liveRoundCoins, roundReward } from '../src/games/match3/systems/rewards';

describe('match3 coin rewards', () => {
  it('opens chests at 33/66/100 percent', () => {
    expect(chestCoinsFor(0, 3000)).toBe(0);
    expect(chestCoinsFor(1000, 3000)).toBe(4);
    expect(chestCoinsFor(2000, 3000)).toBe(10);
    expect(chestCoinsFor(3000, 3000)).toBe(20);
  });

  it('shows a live estimate before the round ends', () => {
    expect(liveRoundCoins(0, 3000)).toBe(3);
    expect(liveRoundCoins(3000, 3000)).toBeGreaterThan(liveRoundCoins(1000, 3000));
  });

  it('adds first-clear, three-star and daily bonuses only on a win', () => {
    const win = roundReward({
      score: 3000,
      target: 3000,
      daily: false,
      firstClear: true,
      stars: 3,
      won: true,
    });
    expect(win.firstClear).toBe(20);
    expect(win.threeStar).toBe(10);
    expect(win.total).toBeGreaterThan(20);

    const lose = roundReward({
      score: 3000,
      target: 3000,
      daily: true,
      firstClear: true,
      stars: 3,
      won: false,
    });
    expect(lose.firstClear).toBe(0);
    expect(lose.threeStar).toBe(0);
    expect(lose.daily).toBe(0);
    expect(lose.participation).toBe(3);
  });

  it('caps score coins so a huge score does not inflate the economy', () => {
    const reward = roundReward({
      score: 999999,
      target: 3000,
      daily: false,
      firstClear: false,
      stars: 1,
      won: true,
    });
    expect(reward.scoreCoins).toBe(18);
  });
});
