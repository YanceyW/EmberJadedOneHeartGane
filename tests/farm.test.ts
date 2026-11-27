import { describe, expect, it } from 'vitest';
import { FARM_ORDERS } from '../src/games/farm/data/crops';
import {
  canFulfillOrder,
  createFarmSave,
  currentOrder,
  fulfillOrder,
  harvest,
  harvestAll,
  legacyInventory,
  migrateFarmSave,
  nextPlotCost,
  plant,
  plotView,
  remainingSeconds,
  sellAll,
  unlockNextPlot,
} from '../src/games/farm/systems/farm';

describe('farm systems', () => {
  it('migrates invalid saves into a safe farm', () => {
    const save = migrateFarmSave({ plots: [{ cropId: 'unknown' }, null], plotsUnlocked: 99 });
    expect(save.schemaVersion).toBe(2);
    expect(save.plots[0]).toBeNull();
    expect(save.plots).toHaveLength(9);
    expect(save.plotsUnlocked).toBe(9);
    expect(save.orderIndex).toBe(0);
  });

  it('plants, grows and harvests on real time', () => {
    const save = createFarmSave();
    const store: Record<string, number> = {};
    const now = 1_700_000_000_000;
    expect(plant(save, 0, 'wheat', now)).toBe('ok');
    expect(plant(save, 0, 'wheat', now)).toBe('busy');
    expect(plotView(save, 0, now + 10_000)).toBe('growing');
    expect(remainingSeconds(save, 0, now + 10_000)).toBe(20);
    expect(harvest(save, 0, now + 10_000, store)).toBeNull();
    expect(plotView(save, 0, now + 30_000)).toBe('ready');
    expect(harvest(save, 0, now + 30_000, store)).toEqual({ cropId: 'wheat', amount: 1 });
    expect(store.wheat).toBe(1);
    expect(save.plots[0]).toBeNull();
  });

  it('moves v1 farm inventory into the shared pantry', () => {
    expect(legacyInventory({ inventory: { wheat: 3, carrot: 0, ghost: 2 } })).toEqual({
      wheat: 3,
    });
    expect(legacyInventory(null)).toEqual({});
  });

  it('fulfills the current order and advances the rotation', () => {
    const save = createFarmSave();
    const store: Record<string, number> = {};
    const order = FARM_ORDERS[0];
    for (const need of order.needs) store[need.cropId] = need.amount;
    expect(canFulfillOrder(save, store)).toBe(true);
    const result = fulfillOrder(save, store);
    expect(result).toEqual({ coins: order.coins, prosperity: order.prosperity });
    expect(currentOrder(save)).toBe(FARM_ORDERS[1]);
    expect(store[order.needs[0].cropId]).toBe(0);
  });

  it('sells pantry crops at crop prices and unlocks new plots', () => {
    const save = createFarmSave();
    const store: Record<string, number> = { wheat: 2, carrot: 1, flour: 5 };
    expect(sellAll(save, store)).toEqual({ coins: 52, count: 3 });
    expect(store.wheat).toBe(0);
    // 加工品不在农场的卖出范围里，留给加工屋/餐厅。
    expect(store.flour).toBe(5);
    expect(nextPlotCost(save)).toBe(60);
    expect(unlockNextPlot(save)).toBe(true);
    expect(save.plotsUnlocked).toBe(7);
  });

  it('starts with six plots and stops selling land after nine', () => {
    const save = createFarmSave();
    expect(save.plots).toHaveLength(9);
    expect(save.plotsUnlocked).toBe(6);
    expect(nextPlotCost(save)).toBe(60);
    unlockNextPlot(save);
    expect(nextPlotCost(save)).toBe(100);
    unlockNextPlot(save);
    expect(nextPlotCost(save)).toBe(160);
    unlockNextPlot(save);
    expect(nextPlotCost(save)).toBeNull();
    expect(unlockNextPlot(save)).toBe(false);
  });

  it('harvests every ripe plot into the shared pantry', () => {
    const save = createFarmSave();
    const store: Record<string, number> = {};
    const now = 1_700_000_000_000;
    plant(save, 0, 'wheat', now);
    plant(save, 1, 'wheat', now);
    plant(save, 2, 'carrot', now);
    plant(save, 3, 'pumpkin', now);

    expect(harvestAll(save, now + 10_000, store)).toEqual({ crops: {}, total: 0 });
    const result = harvestAll(save, now + 60_000, store);
    expect(result.total).toBe(3);
    expect(result.crops).toEqual({ wheat: 2, carrot: 1 });
    expect(store.wheat).toBe(2);
    expect(store.carrot).toBe(1);
    expect(plotView(save, 3, now + 60_000)).toBe('growing');
  });
});
