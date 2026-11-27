import { describe, expect, it } from 'vitest';
import { FLOWER_ORDERS } from '../src/games/garden/data/flowers';
import {
  canFulfillFlowerOrder,
  createGardenSave,
  currentFlowerOrder,
  fulfillFlowerOrder,
  gardenScore,
  harvestAllFlowers,
  harvestFlower,
  legacyInventory,
  migrateGardenSave,
  needsWater,
  plantFlower,
  sellFlowers,
  waterAll,
} from '../src/games/garden/systems/garden';

describe('garden systems', () => {
  it('migrates invalid saves into six empty beds', () => {
    const save = migrateGardenSave({ plots: [{ flowerId: 'unknown' }, null], orderIndex: 9 });
    expect(save.schemaVersion).toBe(2);
    expect(save.plots).toHaveLength(6);
    expect(save.plots.every((plot) => plot === null)).toBe(true);
    expect(save.orderIndex).toBe(9 % FLOWER_ORDERS.length);
  });

  it('moves v1 inventory into the shared warehouse once', () => {
    const legacy = { inventory: { daisy: 3, tulip: 1, unknown: 5 }, plots: [] };
    expect(legacyInventory(legacy)).toEqual({ daisy: 3, tulip: 1 });

    const store: Record<string, number> = {};
    for (const [id, amount] of Object.entries(legacyInventory(legacy))) store[id] = amount;
    expect(store).toEqual({ daisy: 3, tulip: 1 });

    // 迁移后的存档不再带 inventory，第二次读不会重复搬。
    const save = migrateGardenSave(legacy);
    expect(legacyInventory(save)).toEqual({});
  });

  it('plants, waters and harvests faster after watering', () => {
    const save = createGardenSave();
    const store: Record<string, number> = {};
    const now = 1_700_000_000_000;
    expect(plantFlower(save, 0, 'daisy', now)).toBe('ok');
    expect(plantFlower(save, 0, 'daisy', now)).toBe('busy');
    expect(needsWater(save, 0, now + 1_000)).toBe(true);
    expect(waterAll(save, now + 1_000)).toBe(1);
    expect(needsWater(save, 0, now + 2_000)).toBe(false);
    expect(harvestFlower(save, 0, now + 30_000, store)).toEqual({ flowerId: 'daisy', amount: 1 });
    expect(store.daisy).toBe(1);
    expect(save.plots[0]).toBeNull();
  });

  it('waits for the full growth time without watering', () => {
    const save = createGardenSave();
    const store: Record<string, number> = {};
    const now = 1_700_000_000_000;
    plantFlower(save, 0, 'daisy', now);
    expect(harvestFlower(save, 0, now + 44_000, store)).toBeNull();
    expect(harvestFlower(save, 0, now + 45_000, store)).not.toBeNull();
  });

  it('harvests all ripe beds and sells the flower basket', () => {
    const save = createGardenSave();
    const store: Record<string, number> = {};
    const now = 1_700_000_000_000;
    plantFlower(save, 0, 'daisy', now);
    plantFlower(save, 1, 'daisy', now);
    plantFlower(save, 2, 'tulip', now);
    expect(harvestAllFlowers(save, now + 10_000, store).total).toBe(0);
    const result = harvestAllFlowers(save, now + 60_000, store);
    expect(result.total).toBe(2);
    expect(result.flowers).toEqual({ daisy: 2 });
    expect(sellFlowers(save, store)).toEqual({ coins: 36, count: 2 });
    expect(store.daisy).toBe(0);
    expect(gardenScore(save)).toBe(56);
  });

  it('fulfills flower orders from the shared warehouse', () => {
    const save = createGardenSave();
    const store: Record<string, number> = {};
    const order = FLOWER_ORDERS[0];
    for (const need of order.needs) store[need.flowerId] = need.amount;
    expect(canFulfillFlowerOrder(save, store)).toBe(true);
    expect(fulfillFlowerOrder(save, store)).toEqual({
      coins: order.coins,
      prosperity: order.prosperity,
    });
    expect(currentFlowerOrder(save)).toBe(FLOWER_ORDERS[1]);
    expect(store[order.needs[0].flowerId]).toBe(0);
  });
});
