import { COLORS } from '../../../shared/design-system/tokens';

export const TANK_SLOTS = 6;
export const FEED_COST = 4;
export const MATURE_FEEDS = 3;
export const COIN_INTERVAL_MS = 15_000;
export const COIN_CAP = 20;

export interface FishTypeDef {
  id: string;
  name: string;
  price: number;
  color: string;
  accent: string;
  pattern: 'plain' | 'stripe' | 'spot';
}

/** 8 种观赏鱼：越贵越耐看，买鱼、喂食、访客订单只走王都币。 */
export const FISH_TYPES: readonly FishTypeDef[] = [
  {
    id: 'goldfish',
    name: '小金鱼',
    price: 60,
    color: COLORS.honey,
    accent: COLORS.honeyDeep,
    pattern: 'plain',
  },
  {
    id: 'guppy',
    name: '孔雀鱼',
    price: 92,
    color: COLORS.water,
    accent: COLORS.waterDeep,
    pattern: 'stripe',
  },
  {
    id: 'clown',
    name: '小丑鱼',
    price: 140,
    color: COLORS.coral,
    accent: COLORS.paper,
    pattern: 'spot',
  },
  {
    id: 'neon',
    name: '灯鱼',
    price: 170,
    color: COLORS.sky,
    accent: COLORS.mintDeep,
    pattern: 'stripe',
  },
  {
    id: 'koi',
    name: '锦鲤',
    price: 220,
    color: COLORS.peach,
    accent: COLORS.petalDeep,
    pattern: 'spot',
  },
  {
    id: 'angelfish',
    name: '神仙鱼',
    price: 260,
    color: COLORS.mint,
    accent: COLORS.leaf,
    pattern: 'stripe',
  },
  {
    id: 'puffer',
    name: '河豚',
    price: 320,
    color: COLORS.gold,
    accent: COLORS.honeyDeep,
    pattern: 'spot',
  },
  {
    id: 'arowana',
    name: '龙鱼',
    price: 460,
    color: COLORS.lilac,
    accent: COLORS.lilacDeep,
    pattern: 'plain',
  },
] as const;

export interface FishOrderDef {
  id: string;
  title: string;
  mature: number;
  coins: number;
  prosperity: number;
}

export const FISH_ORDERS: readonly FishOrderDef[] = [
  { id: 'order-visit', title: '幼儿园要来参观', mature: 2, coins: 46, prosperity: 2 },
  { id: 'order-school', title: '学堂要观察课', mature: 2, coins: 62, prosperity: 3 },
  { id: 'order-photo', title: '画师要画鱼缸', mature: 3, coins: 88, prosperity: 4 },
  { id: 'order-tea', title: '茶馆要鱼缸摆件', mature: 3, coins: 112, prosperity: 4 },
  { id: 'order-festival', title: '灯会要水族展台', mature: 4, coins: 150, prosperity: 6 },
  { id: 'order-night', title: '夜游水族馆', mature: 5, coins: 205, prosperity: 7 },
] as const;

export function findFishType(id: string): FishTypeDef | undefined {
  return FISH_TYPES.find((fish) => fish.id === id);
}
