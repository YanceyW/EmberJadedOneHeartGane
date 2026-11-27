import {
  CROPS,
  FARM_ORDERS,
  FARM_PLOT_COSTS,
  FARM_PLOTS,
  FARM_START_PLOTS,
  findCrop,
} from '../data/crops';
import { sellSelection } from '../../../shared/content/ingredients';

export type PlotView = 'locked' | 'empty' | 'growing' | 'ready';

/** 王都仓库里的一类食材数量；由 profile.pantry 提供。 */
export type FarmStore = Record<string, number>;

export interface FarmPlot {
  cropId: string;
  plantedAt: number;
}

export interface FarmSave {
  schemaVersion: 2;
  plots: Array<FarmPlot | null>;
  plotsUnlocked: number;
  orderIndex: number;
  totalHarvests: number;
  totalCoins: number;
}

function emptyPlots(): Array<FarmPlot | null> {
  return new Array<FarmPlot | null>(FARM_PLOTS).fill(null);
}

export function createFarmSave(): FarmSave {
  return {
    schemaVersion: 2,
    plots: emptyPlots(),
    plotsUnlocked: FARM_START_PLOTS,
    orderIndex: 0,
    totalHarvests: 0,
    totalCoins: 0,
  };
}

/** v1 存档把作物存在自己身上；v2 起统一放进王都仓库，这里只负责把旧数据搬出来。 */
export function legacyInventory(input: unknown): Record<string, number> {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  if (!raw.inventory || typeof raw.inventory !== 'object') return {};
  const source = raw.inventory as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const crop of CROPS) {
    const amount = source[crop.id];
    if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
      result[crop.id] = Math.floor(amount);
    }
  }
  return result;
}

export function migrateFarmSave(input: unknown): FarmSave {
  const defaults = createFarmSave();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;
  const plots = emptyPlots();
  const rawPlots = Array.isArray(raw.plots) ? raw.plots : [];
  for (let i = 0; i < FARM_PLOTS; i += 1) {
    const item = rawPlots[i];
    if (!item || typeof item !== 'object') continue;
    const plot = item as Record<string, unknown>;
    if (typeof plot.cropId !== 'string' || !findCrop(plot.cropId)) continue;
    const plantedAt = typeof plot.plantedAt === 'number' ? plot.plantedAt : Date.now();
    plots[i] = { cropId: plot.cropId, plantedAt };
  }

  const plotsUnlocked =
    typeof raw.plotsUnlocked === 'number'
      ? Math.max(FARM_START_PLOTS, Math.min(FARM_PLOTS, Math.floor(raw.plotsUnlocked)))
      : defaults.plotsUnlocked;
  const orderIndex =
    typeof raw.orderIndex === 'number'
      ? Math.max(0, Math.floor(raw.orderIndex)) % FARM_ORDERS.length
      : 0;

  return {
    schemaVersion: 2,
    plots,
    plotsUnlocked,
    orderIndex,
    totalHarvests:
      typeof raw.totalHarvests === 'number' ? Math.max(0, Math.floor(raw.totalHarvests)) : 0,
    totalCoins: typeof raw.totalCoins === 'number' ? Math.max(0, Math.floor(raw.totalCoins)) : 0,
  };
}

export function plotView(save: FarmSave, index: number, now: number): PlotView {
  if (index < 0 || index >= FARM_PLOTS) return 'locked';
  if (index >= save.plotsUnlocked) return 'locked';
  const plot = save.plots[index];
  if (!plot) return 'empty';
  const crop = findCrop(plot.cropId);
  if (!crop) return 'empty';
  return now >= plot.plantedAt + crop.growSeconds * 1000 ? 'ready' : 'growing';
}

export function remainingSeconds(save: FarmSave, index: number, now: number): number {
  const plot = save.plots[index];
  const crop = plot ? findCrop(plot.cropId) : undefined;
  if (!plot || !crop) return 0;
  return Math.max(0, Math.ceil((plot.plantedAt + crop.growSeconds * 1000 - now) / 1000));
}

export function plant(
  save: FarmSave,
  index: number,
  cropId: string,
  now: number,
): 'ok' | 'locked' | 'busy' | 'missing' {
  if (index < 0 || index >= save.plotsUnlocked) return 'locked';
  if (save.plots[index]) return 'busy';
  if (!findCrop(cropId)) return 'missing';
  save.plots[index] = { cropId, plantedAt: now };
  return 'ok';
}

export function harvest(
  save: FarmSave,
  index: number,
  now: number,
  store: FarmStore,
): { cropId: string; amount: number } | null {
  if (plotView(save, index, now) !== 'ready') return null;
  const plot = save.plots[index];
  if (!plot) return null;
  save.plots[index] = null;
  store[plot.cropId] = Math.min(999, (store[plot.cropId] ?? 0) + 1);
  save.totalHarvests += 1;
  return { cropId: plot.cropId, amount: 1 };
}

export interface HarvestAllResult {
  crops: Record<string, number>;
  total: number;
}

/** 一键收获：把当前所有成熟地块收进王都仓库。 */
export function harvestAll(save: FarmSave, now: number, store: FarmStore): HarvestAllResult {
  const crops: Record<string, number> = {};
  let total = 0;
  for (let index = 0; index < save.plotsUnlocked; index += 1) {
    const result = harvest(save, index, now, store);
    if (!result) continue;
    crops[result.cropId] = (crops[result.cropId] ?? 0) + result.amount;
    total += result.amount;
  }
  return { crops, total };
}

export function sellAll(save: FarmSave, store: FarmStore): { coins: number; count: number } {
  // 卖出只走共享逻辑：农场只卖作物，加工品/成菜留给加工屋与餐厅。
  const result = sellSelection(
    store,
    CROPS.map((crop) => crop.id),
  );
  save.totalCoins += result.coins;
  return result;
}

export function currentOrder(save: FarmSave) {
  return FARM_ORDERS[save.orderIndex % FARM_ORDERS.length];
}

export function canFulfillOrder(save: FarmSave, store: FarmStore): boolean {
  return currentOrder(save).needs.every((need) => (store[need.cropId] ?? 0) >= need.amount);
}

export function fulfillOrder(
  save: FarmSave,
  store: FarmStore,
): { coins: number; prosperity: number } | null {
  if (!canFulfillOrder(save, store)) return null;
  const order = currentOrder(save);
  for (const need of order.needs) {
    store[need.cropId] = Math.max(0, (store[need.cropId] ?? 0) - need.amount);
  }
  save.orderIndex = (save.orderIndex + 1) % FARM_ORDERS.length;
  save.totalCoins += order.coins;
  return { coins: order.coins, prosperity: order.prosperity };
}

export function nextPlotCost(save: FarmSave): number | null {
  if (save.plotsUnlocked >= FARM_PLOTS) return null;
  return FARM_PLOT_COSTS[save.plotsUnlocked] ?? 100;
}

export function unlockNextPlot(save: FarmSave): boolean {
  if (save.plotsUnlocked >= FARM_PLOTS) return false;
  save.plotsUnlocked += 1;
  return true;
}
