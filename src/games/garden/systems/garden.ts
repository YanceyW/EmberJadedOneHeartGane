import {
  FLOWERS,
  FLOWER_ORDERS,
  GARDEN_PLOTS,
  findFlower,
} from '../data/flowers';
import { sellSelection } from '../../../shared/content/ingredients';

export type FlowerView = 'empty' | 'growing' | 'ready';

/** 王都仓库里的一类货物数量；花园与仓库共用同一份（profile.pantry）。 */
export type GardenStore = Record<string, number>;

export interface GardenPlot {
  flowerId: string;
  plantedAt: number;
  bonusMs: number;
}

/**
 * v2 起花园不再自己存花：收成就直接进王都仓库，
 * 大厅仓库、餐厅、每日委托看到的是同一份数量。
 */
export interface GardenSave {
  schemaVersion: 2;
  plots: Array<GardenPlot | null>;
  orderIndex: number;
  totalHarvests: number;
  totalCoins: number;
}

export function createGardenSave(): GardenSave {
  return {
    schemaVersion: 2,
    plots: new Array<GardenPlot | null>(GARDEN_PLOTS).fill(null),
    orderIndex: 0,
    totalHarvests: 0,
    totalCoins: 0,
  };
}

/** v1 存档把花存在自己身上；这里只负责把旧数据搬进仓库（只搬一次）。 */
export function legacyInventory(input: unknown): Record<string, number> {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  if (!raw.inventory || typeof raw.inventory !== 'object') return {};
  const source = raw.inventory as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const flower of FLOWERS) {
    const amount = source[flower.id];
    if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
      result[flower.id] = Math.floor(amount);
    }
  }
  return result;
}

export function migrateGardenSave(input: unknown): GardenSave {
  const defaults = createGardenSave();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;
  const plots = new Array<GardenPlot | null>(GARDEN_PLOTS).fill(null);
  if (Array.isArray(raw.plots)) {
    for (let i = 0; i < GARDEN_PLOTS; i += 1) {
      const item = raw.plots[i];
      if (!item || typeof item !== 'object') continue;
      const plot = item as Record<string, unknown>;
      if (typeof plot.flowerId !== 'string' || !findFlower(plot.flowerId)) continue;
      plots[i] = {
        flowerId: plot.flowerId,
        plantedAt:
          typeof plot.plantedAt === 'number' && Number.isFinite(plot.plantedAt)
            ? plot.plantedAt
            : Date.now(),
        bonusMs:
          typeof plot.bonusMs === 'number' && Number.isFinite(plot.bonusMs)
            ? Math.max(0, plot.bonusMs)
            : 0,
      };
    }
  }

  return {
    schemaVersion: 2,
    plots,
    orderIndex:
      typeof raw.orderIndex === 'number' && Number.isFinite(raw.orderIndex)
        ? Math.max(0, Math.floor(raw.orderIndex)) % FLOWER_ORDERS.length
        : 0,
    totalHarvests: finite(raw.totalHarvests),
    totalCoins: finite(raw.totalCoins),
  };
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readyAt(plot: GardenPlot, growSeconds: number): number {
  return plot.plantedAt + growSeconds * 1000 - plot.bonusMs;
}

export function flowerView(save: GardenSave, index: number, now: number): FlowerView {
  if (index < 0 || index >= GARDEN_PLOTS) return 'empty';
  const plot = save.plots[index];
  if (!plot) return 'empty';
  const flower = findFlower(plot.flowerId);
  if (!flower) return 'empty';
  return now >= readyAt(plot, flower.growSeconds) ? 'ready' : 'growing';
}

export function remainingSeconds(save: GardenSave, index: number, now: number): number {
  const plot = save.plots[index];
  const flower = plot ? findFlower(plot.flowerId) : undefined;
  if (!plot || !flower) return 0;
  return Math.max(0, Math.ceil((readyAt(plot, flower.growSeconds) - now) / 1000));
}

export function plantFlower(
  save: GardenSave,
  index: number,
  flowerId: string,
  now: number,
): 'ok' | 'busy' | 'missing' {
  if (index < 0 || index >= GARDEN_PLOTS) return 'missing';
  if (save.plots[index]) return 'busy';
  if (!findFlower(flowerId)) return 'missing';
  save.plots[index] = { flowerId, plantedAt: now, bonusMs: 0 };
  return 'ok';
}

export function needsWater(save: GardenSave, index: number, now: number): boolean {
  const plot = save.plots[index];
  return Boolean(plot && plot.bonusMs <= 0 && flowerView(save, index, now) === 'growing');
}

/** 浇水一次，立刻推进 35% 生长时间；每株只能浇一次。 */
export function waterPlot(save: GardenSave, index: number, now: number): 'ok' | 'done' | 'idle' {
  const plot = save.plots[index];
  if (!plot) return 'idle';
  if (flowerView(save, index, now) !== 'growing') return 'idle';
  if (plot.bonusMs > 0) return 'done';
  const flower = findFlower(plot.flowerId);
  if (!flower) return 'idle';
  plot.bonusMs = flower.growSeconds * 1000 * 0.35;
  return 'ok';
}

export function harvestFlower(
  save: GardenSave,
  index: number,
  now: number,
  store: GardenStore,
): { flowerId: string; amount: number } | null {
  if (flowerView(save, index, now) !== 'ready') return null;
  const plot = save.plots[index];
  if (!plot) return null;
  save.plots[index] = null;
  store[plot.flowerId] = Math.min(999, (store[plot.flowerId] ?? 0) + 1);
  save.totalHarvests += 1;
  return { flowerId: plot.flowerId, amount: 1 };
}

export function harvestAllFlowers(
  save: GardenSave,
  now: number,
  store: GardenStore,
): { flowers: Record<string, number>; total: number } {
  const flowers: Record<string, number> = {};
  let total = 0;
  for (let index = 0; index < GARDEN_PLOTS; index += 1) {
    const result = harvestFlower(save, index, now, store);
    if (!result) continue;
    flowers[result.flowerId] = (flowers[result.flowerId] ?? 0) + result.amount;
    total += result.amount;
  }
  return { flowers, total };
}

export function waterAll(save: GardenSave, now: number): number {
  let count = 0;
  for (let index = 0; index < GARDEN_PLOTS; index += 1) {
    if (waterPlot(save, index, now) === 'ok') count += 1;
  }
  return count;
}

export function sellFlowers(save: GardenSave, store: GardenStore): { coins: number; count: number } {
  const result = sellSelection(
    store,
    FLOWERS.map((flower) => flower.id),
  );
  save.totalCoins += result.coins;
  return result;
}

export function currentFlowerOrder(save: GardenSave) {
  return FLOWER_ORDERS[save.orderIndex % FLOWER_ORDERS.length];
}

export function canFulfillFlowerOrder(save: GardenSave, store: GardenStore): boolean {
  return currentFlowerOrder(save).needs.every(
    (need) => (store[need.flowerId] ?? 0) >= need.amount,
  );
}

export function fulfillFlowerOrder(
  save: GardenSave,
  store: GardenStore,
): { coins: number; prosperity: number } | null {
  if (!canFulfillFlowerOrder(save, store)) return null;
  const order = currentFlowerOrder(save);
  for (const need of order.needs) {
    store[need.flowerId] = Math.max(0, (store[need.flowerId] ?? 0) - need.amount);
  }
  save.orderIndex = (save.orderIndex + 1) % FLOWER_ORDERS.length;
  save.totalCoins += order.coins;
  return { coins: order.coins, prosperity: order.prosperity };
}

/** 排行榜看「收成」：收获次数 + 花单收入。 */
export function gardenScore(save: GardenSave): number {
  return save.totalHarvests * 10 + save.totalCoins;
}
