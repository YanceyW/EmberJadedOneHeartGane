import { describe, expect, it } from 'vitest';
import { COIN_CAP, FISH_ORDERS, MATURE_FEEDS } from '../src/games/aquarium/data/fish';
import {
  addFish,
  aquariumScore,
  canFulfillFishOrder,
  collectAllCoins,
  collectFishCoins,
  createAquariumSave,
  currentFishOrder,
  feedFish,
  fulfillFishOrder,
  isMature,
  matureCount,
  migrateAquariumSave,
  pendingFishCoins,
} from '../src/games/aquarium/systems/aquarium';

describe('aquarium systems', () => {
  it('migrates invalid saves into an empty six-slot tank', () => {
    const save = migrateAquariumSave({ fish: [{ typeId: 'unknown' }], orderIndex: 7 });
    expect(save.fish).toHaveLength(6);
    expect(save.fish.every((fish) => fish === null)).toBe(true);
    expect(save.orderIndex).toBe(7 % FISH_ORDERS.length);
  });

  it('buys fish, feeds it to maturity and collects bubble coins', () => {
    const save = createAquariumSave();
    const now = 1_700_000_000_000;
    const index = addFish(save, 'goldfish', now);
    expect(index).toBe(0);
    expect(isMature(save.fish[0]!)).toBe(false);
    for (let i = 0; i < MATURE_FEEDS; i += 1) {
      const result = feedFish(save, 0, now);
      expect(result).toBe(i === MATURE_FEEDS - 1 ? 'mature' : 'ok');
    }
    expect(isMature(save.fish[0]!)).toBe(true);
    expect(pendingFishCoins(save.fish[0]!, now + 30_000)).toBe(2);
    expect(collectFishCoins(save, 0, now + 30_000)).toBe(2);
    expect(save.totalCoins).toBe(2);
    expect(pendingFishCoins(save.fish[0]!, now + 30_000)).toBe(0);
  });

  it('caps idle bubble coins and collects across the whole tank', () => {
    const save = createAquariumSave();
    const now = 1_700_000_000_000;
    addFish(save, 'goldfish', now);
    addFish(save, 'guppy', now);
    for (let i = 0; i < 2; i += 1) {
      for (let feed = 0; feed < MATURE_FEEDS; feed += 1) feedFish(save, i, now);
    }
    expect(pendingFishCoins(save.fish[0]!, now + 999_999)).toBe(COIN_CAP);
    expect(matureCount(save)).toBe(2);
    expect(collectAllCoins(save, now + 30_000)).toBe(4);
    expect(collectAllCoins(save, now + 30_000)).toBe(0);
    expect(aquariumScore(save)).toBe(114);
  });

  it('serves visitor orders only when enough fish are mature', () => {
    const save = createAquariumSave();
    const now = 1_700_000_000_000;
    const order = currentFishOrder(save);
    expect(canFulfillFishOrder(save)).toBe(false);
    for (let i = 0; i < order.mature; i += 1) {
      addFish(save, 'goldfish', now);
      for (let feed = 0; feed < MATURE_FEEDS; feed += 1) feedFish(save, i, now);
    }
    expect(canFulfillFishOrder(save)).toBe(true);
    expect(fulfillFishOrder(save)).toEqual({
      coins: order.coins,
      prosperity: order.prosperity,
    });
    expect(save.orderIndex).toBe(1);
  });
});
