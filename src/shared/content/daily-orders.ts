import { IngredientNeed, findIngredient } from './ingredients';

/** 每日委托：只吃王都仓库，玩家点「交付」才结算。 */
export interface DailyOrderDef {
  id: string;
  title: string;
  hint: string;
  needs: IngredientNeed[];
  coins: number;
  prosperity: number;
}

export const DAILY_ORDERS: readonly DailyOrderDef[] = [
  {
    id: 'market-greens',
    title: '早市备菜',
    hint: '食集一早要两筐青菜',
    needs: [
      { id: 'lettuce', amount: 3 },
      { id: 'tomato', amount: 2 },
    ],
    coins: 100,
    prosperity: 2,
  },
  {
    id: 'bakery-order',
    title: '面点预订',
    hint: '茶楼订了面点和面粉',
    needs: [
      { id: 'flour', amount: 2 },
      { id: 'bun', amount: 1 },
    ],
    coins: 135,
    prosperity: 3,
  },
  {
    id: 'tofu-shop',
    title: '豆坊订货',
    hint: '豆坊要新鲜大豆与豆腐',
    needs: [
      { id: 'soybean', amount: 4 },
      { id: 'tofu', amount: 1 },
    ],
    coins: 155,
    prosperity: 3,
  },
  {
    id: 'flower-shop',
    title: '花店补花',
    hint: '花店要两色花配花束',
    needs: [
      { id: 'daisy', amount: 3 },
      { id: 'tulip', amount: 2 },
    ],
    coins: 160,
    prosperity: 3,
  },
  {
    id: 'tea-house',
    title: '茶馆要茶',
    hint: '两款花茶各一壶',
    needs: [
      { id: 'jasmine-tea', amount: 1 },
      { id: 'chrys-tea', amount: 1 },
    ],
    coins: 95,
    prosperity: 2,
  },
  {
    id: 'farm-basket',
    title: '农家菜篮',
    hint: '给王宫送一篮时蔬',
    needs: [
      { id: 'potato', amount: 3 },
      { id: 'onion', amount: 2 },
      { id: 'carrot', amount: 2 },
    ],
    coins: 275,
    prosperity: 5,
  },
  {
    id: 'mushroom-order',
    title: '菌菇订单',
    hint: '汤馆要鲜菇与高汤',
    needs: [
      { id: 'mushroom', amount: 3 },
      { id: 'stock', amount: 1 },
    ],
    coins: 250,
    prosperity: 4,
  },
  {
    id: 'festival-pastry',
    title: '节庆点心',
    hint: '灯会要两样米制点心',
    needs: [
      { id: 'osmanthus-cake', amount: 1 },
      { id: 'beans-bun', amount: 1 },
    ],
    coins: 180,
    prosperity: 4,
  },
  {
    id: 'dessert-shop',
    title: '甜点铺',
    hint: '甜点铺要草莓糕',
    needs: [
      { id: 'berry-cake', amount: 1 },
      { id: 'berry', amount: 3 },
    ],
    coins: 205,
    prosperity: 4,
  },
  {
    id: 'noodle-shop',
    title: '面馆补货',
    hint: '面馆要挂面和配菜',
    needs: [
      { id: 'noodle', amount: 2 },
      { id: 'pickle', amount: 1 },
      { id: 'tomato', amount: 2 },
    ],
    coins: 180,
    prosperity: 4,
  },
  {
    id: 'banquet-order',
    title: '客宴预订',
    hint: '一桌家常菜与一盅汤',
    needs: [
      { id: 'home-tofu', amount: 1 },
      { id: 'mushroom-soup', amount: 1 },
      { id: 'veggie-rice', amount: 1 },
    ],
    coins: 230,
    prosperity: 5,
  },
  {
    id: 'tea-party',
    title: '茶席布置',
    hint: '茶席要玫瑰与茉莉',
    needs: [
      { id: 'rose', amount: 1 },
      { id: 'jasmine', amount: 2 },
    ],
    coins: 260,
    prosperity: 5,
  },
] as const;

export const DAILY_ORDER_COUNT = 3;

/** 三单全交的额外奖励（只发王都币与繁荣度，不引入第二种货币）。 */
export const DAILY_CLEAR_COINS = 120;
export const DAILY_CLEAR_PROSPERITY = 3;

/** 本地日期键：每日委托按它刷新。 */
export function dayKey(now: number): string {
  const date = new Date(now);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

/**
 * 同一天永远抽到同样的 3 单（离线也能用），换天就换一批。
 * 用 Fisher–Yates + FNV 种子，避免依赖 core/rng（shared 不能反向依赖 core）。
 */
export function pickDailyOrders(dateKey: string): readonly DailyOrderDef[] {
  let seed = hash(`daily:${dateKey}`) || 1;
  const next = () => {
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 0x100000000;
  };
  const pool = [...DAILY_ORDERS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }
  return pool.slice(0, DAILY_ORDER_COUNT);
}

export function findDailyOrder(id: string): DailyOrderDef | undefined {
  return DAILY_ORDERS.find((order) => order.id === id);
}

/** 委托奖励与需求价值挂钩，改价后奖励不会飘。 */
export function dailyOrderValue(order: DailyOrderDef): number {
  let value = 0;
  for (const need of order.needs) {
    value += (findIngredient(need.id)?.sellPrice ?? 0) * need.amount;
  }
  return value;
}

export function dailyOrderNames(order: DailyOrderDef): string {
  return order.needs
    .map((need) => `${findIngredient(need.id)?.name ?? need.id}×${need.amount}`)
    .join(' · ');
}
