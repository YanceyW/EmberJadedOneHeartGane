import { Rng } from '../../../core/rng';
import {
  MERGE_COLS,
  MERGE_MAX_TIER,
  MERGE_ORDERS,
  MERGE_ROWS,
  MergeOrderDef,
  mergeItem,
} from '../data/items';

export interface MergeSave {
  schemaVersion: 2;
  /** -1 表示空格，0–3 表示物品等级。 */
  cells: number[];
  orderIndex: number;
  totalMerges: number;
  totalOrders: number;
  totalCoins: number;
  totalCrafts: number;
}

const CELLS = MERGE_ROWS * MERGE_COLS;

export function createMergeSave(): MergeSave {
  return {
    schemaVersion: 2,
    cells: new Array<number>(CELLS).fill(-1),
    orderIndex: 0,
    totalMerges: 0,
    totalOrders: 0,
    totalCoins: 0,
    totalCrafts: 0,
  };
}

export function migrateMergeSave(input: unknown): MergeSave {
  const defaults = createMergeSave();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;

  const cells = new Array<number>(CELLS).fill(-1);
  if (Array.isArray(raw.cells)) {
    for (let i = 0; i < CELLS; i += 1) {
      const value = raw.cells[i];
      if (typeof value === 'number' && Number.isFinite(value)) {
        const tier = Math.floor(value);
        if (tier >= 0 && tier <= MERGE_MAX_TIER) cells[i] = tier;
      }
    }
  }

  return {
    schemaVersion: 2,
    cells,
    orderIndex:
      typeof raw.orderIndex === 'number' && Number.isFinite(raw.orderIndex)
        ? Math.max(0, Math.floor(raw.orderIndex)) % MERGE_ORDERS.length
        : 0,
    totalMerges: finite(raw.totalMerges),
    totalOrders: finite(raw.totalOrders),
    totalCoins: finite(raw.totalCoins),
    totalCrafts: finite(raw.totalCrafts),
  };
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function emptyCells(save: MergeSave): number[] {
  const result: number[] = [];
  for (let i = 0; i < save.cells.length; i += 1) {
    if (save.cells[i] < 0) result.push(i);
  }
  return result;
}

/** 进货：随机放进一个空格；棋盘满时返回 null。 */
export function spawnItem(save: MergeSave, rng: Rng): number | null {
  const empty = emptyCells(save);
  if (empty.length === 0) return null;
  const index = empty[rng.int(empty.length)];
  // 偶尔直接给一级，减少前期重复点击。
  save.cells[index] = rng.next() < 0.16 ? 1 : 0;
  return index;
}

export function mergeCells(
  save: MergeSave,
  a: number,
  b: number,
): { tier: number; index: number } | null {
  if (a === b) return null;
  if (a < 0 || b < 0 || a >= save.cells.length || b >= save.cells.length) return null;
  const left = save.cells[a];
  const right = save.cells[b];
  if (left < 0 || left !== right || left >= MERGE_MAX_TIER) return null;
  save.cells[b] = left + 1;
  save.cells[a] = -1;
  save.totalMerges += 1;
  return { tier: left + 1, index: b };
}

export function currentMergeOrder(save: MergeSave): MergeOrderDef {
  return MERGE_ORDERS[save.orderIndex % MERGE_ORDERS.length];
}

export function needCount(save: MergeSave, tier: number): number {
  return save.cells.reduce((count, value) => count + (value === tier ? 1 : 0), 0);
}

export function canFulfillMergeOrder(save: MergeSave): boolean {
  return currentMergeOrder(save).needs.every((need) => needCount(save, need.tier) >= need.amount);
}

export function fulfillMergeOrder(
  save: MergeSave,
): { coins: number; prosperity: number } | null {
  if (!canFulfillMergeOrder(save)) return null;
  const order = currentMergeOrder(save);
  for (const need of order.needs) {
    let remaining = need.amount;
    for (let i = 0; i < save.cells.length && remaining > 0; i += 1) {
      if (save.cells[i] !== need.tier) continue;
      save.cells[i] = -1;
      remaining -= 1;
    }
  }
  save.orderIndex = (save.orderIndex + 1) % MERGE_ORDERS.length;
  save.totalOrders += 1;
  save.totalCoins += order.coins;
  return { coins: order.coins, prosperity: order.prosperity };
}

/** 卖出二级及以上成品，为卡死的棋盘腾地方。 */
export function sellFinished(save: MergeSave): { coins: number; count: number } {
  let coins = 0;
  let count = 0;
  for (let i = 0; i < save.cells.length; i += 1) {
    const tier = save.cells[i];
    if (tier < 2) continue;
    coins += mergeItem(tier).sellPrice;
    count += 1;
    save.cells[i] = -1;
  }
  save.totalCoins += coins;
  return { coins, count };
}

export function mergeScore(save: MergeSave): number {
  return save.totalMerges * 20 + save.totalOrders * 100 + save.totalCrafts * 30;
}
