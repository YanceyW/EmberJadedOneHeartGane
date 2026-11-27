import { MENU } from '../../../shared/content/menu';
import { findLegacyRecipe } from '../data/combos';
import { CounterCells, emptyCounter, migrateCounter } from './counter';
import { StoveState, createStoves, migrateStoves } from './stove';

/** 点菜页的三张桌子，存的是菜单 id；换菜谱也不会读错。 */
export const RESTAURANT_TABLES = 3;
export const RESTAURANT_DAILY_GOAL = 8;
export const RESTAURANT_DAILY_REWARD = { coins: 60, prosperity: 2 } as const;

export interface RestaurantSave {
  schemaVersion: 5;
  /** 每张桌子当前点的菜（menu id）。 */
  tables: string[];
  /** 下一位客人的菜，保证一轮里不重复太多。 */
  nextItem: number;
  /** 累计备菜份数。 */
  cooked: number;
  /** 点菜页累计上菜份数。 */
  served: number;
  /** 点菜页累计营业额（排行榜组成部分）。 */
  totalCoins: number;
  /** 营业小游戏的最好成绩（排行榜组成部分）。 */
  bestRevenue: number;
  bestCombo: number;
  shifts: number;
  /** 厨房备料台：15 格，每格一件。 */
  counter: CounterCells;
  /** 厨房灶台：离开游戏也会保留正在烹饪/出锅的食物。 */
  stoves: StoveState[];
  /** 已经做出来过的配方，用于统计/成就。 */
  discovered: string[];
  /** 点菜页每日目标，跨天自动重置。 */
  dailyDate: string;
  dailyServed: number;
  dailyClaimed: boolean;
}

export function createRestaurantSave(): RestaurantSave {
  return {
    schemaVersion: 5,
    tables: MENU.slice(0, RESTAURANT_TABLES).map((item) => item.id),
    nextItem: RESTAURANT_TABLES,
    cooked: 0,
    served: 0,
    totalCoins: 0,
    bestRevenue: 0,
    bestCombo: 0,
    shifts: 0,
    counter: emptyCounter(),
    stoves: createStoves(),
    discovered: [],
    dailyDate: '',
    dailyServed: 0,
    dailyClaimed: false,
  };
}

export function migrateRestaurantSave(input: unknown): RestaurantSave {
  const defaults = createRestaurantSave();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;

  const tables = [...defaults.tables];
  if (Array.isArray(raw.tables)) {
    for (let i = 0; i < RESTAURANT_TABLES; i += 1) {
      const value = raw.tables[i];
      if (typeof value === 'string' && MENU.some((item) => item.id === value)) {
        tables[i] = value;
      }
    }
  }

  const discovered: string[] = [];
  if (Array.isArray(raw.discovered)) {
    for (const id of raw.discovered) {
      if (typeof id !== 'string') continue;
      const recipe = findLegacyRecipe(id);
      if (recipe && !discovered.includes(recipe.id)) discovered.push(recipe.id);
    }
  }

  return {
    schemaVersion: 5,
    tables,
    nextItem: finite(raw.nextItem, defaults.nextItem),
    cooked: finite(raw.cooked, 0),
    served: finite(raw.served, 0),
    totalCoins: finite(raw.totalCoins, 0),
    bestRevenue: finite(raw.bestRevenue, 0),
    bestCombo: finite(raw.bestCombo, 0),
    shifts: finite(raw.shifts, 0),
    counter: migrateCounter(raw.counter ?? raw.craft),
    stoves: migrateStoves(raw.stoves),
    discovered,
    dailyDate: typeof raw.dailyDate === 'string' ? raw.dailyDate : '',
    dailyServed: finite(raw.dailyServed, 0),
    dailyClaimed: raw.dailyClaimed === true,
  };
}

/** 跨天时清空点菜目标；返回是否发生了重置。 */
export function ensureRestaurantDaily(save: RestaurantSave, today: string): boolean {
  if (save.dailyDate === today) return false;
  save.dailyDate = today;
  save.dailyServed = 0;
  save.dailyClaimed = false;
  return true;
}

export function claimRestaurantDaily(save: RestaurantSave): {
  coins: number;
  prosperity: number;
} | null {
  if (save.dailyClaimed || save.dailyServed < RESTAURANT_DAILY_GOAL) return null;
  save.dailyClaimed = true;
  return { ...RESTAURANT_DAILY_REWARD };
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

/** 排行榜看点菜累计营业额 + 营业最好成绩，覆盖两条产出线。 */
export function restaurantScore(save: RestaurantSave): number {
  return save.totalCoins + save.bestRevenue;
}
