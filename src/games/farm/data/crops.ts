import { COLORS } from '../../../shared/design-system/tokens';
import { findIngredient } from '../../../shared/content/ingredients';

export interface CropDef {
  id: string;
  name: string;
  seedCost: number;
  growSeconds: number;
  /** 仓库卖价，统一来自 shared/content/ingredients.ts。 */
  sellPrice: number;
  color: string;
  shade: string;
}

interface CropSeed {
  id: string;
  seedCost: number;
  growSeconds: number;
  color: string;
  shade: string;
}

/** 名字与卖价不写在这里：仓库是唯一来源，避免「农场价」和「仓库价」打架。 */
const CROP_SEEDS: readonly CropSeed[] = [
  { id: 'lettuce', seedCost: 6, growSeconds: 20, color: COLORS.leaf, shade: COLORS.grassDeep },
  { id: 'wheat', seedCost: 8, growSeconds: 30, color: COLORS.honey, shade: COLORS.honeyDeep },
  { id: 'rice', seedCost: 10, growSeconds: 35, color: COLORS.cream, shade: COLORS.honeyDeep },
  { id: 'soybean', seedCost: 12, growSeconds: 40, color: COLORS.mint, shade: COLORS.mintDeep },
  { id: 'tomato', seedCost: 10, growSeconds: 40, color: COLORS.coral, shade: COLORS.petalDeep },
  { id: 'radish', seedCost: 12, growSeconds: 45, color: COLORS.paper, shade: COLORS.inkSoft },
  { id: 'carrot', seedCost: 14, growSeconds: 50, color: COLORS.coral, shade: COLORS.petalDeep },
  { id: 'cucumber', seedCost: 14, growSeconds: 55, color: COLORS.grass, shade: COLORS.grassDeep },
  { id: 'garlic', seedCost: 15, growSeconds: 60, color: COLORS.paper, shade: COLORS.inkSoft },
  { id: 'berry', seedCost: 16, growSeconds: 65, color: COLORS.berry, shade: COLORS.petalDeep },
  { id: 'potato', seedCost: 16, growSeconds: 70, color: COLORS.honey, shade: COLORS.honeyDeep },
  { id: 'onion', seedCost: 18, growSeconds: 75, color: COLORS.lilac, shade: COLORS.lilacDeep },
  { id: 'corn', seedCost: 18, growSeconds: 75, color: COLORS.honey, shade: COLORS.honeyDeep },
  { id: 'cabbage', seedCost: 20, growSeconds: 85, color: COLORS.mint, shade: COLORS.leaf },
  { id: 'mushroom', seedCost: 22, growSeconds: 95, color: COLORS.peach, shade: COLORS.coral },
  { id: 'pumpkin', seedCost: 24, growSeconds: 100, color: COLORS.honey, shade: COLORS.honeyDeep },
  { id: 'eggplant', seedCost: 26, growSeconds: 110, color: COLORS.lilacDeep, shade: COLORS.teal },
  { id: 'grape', seedCost: 28, growSeconds: 120, color: COLORS.lilac, shade: COLORS.lilacDeep },
];

export const CROPS: readonly CropDef[] = CROP_SEEDS.map((seed) => ({
  ...seed,
  name: findIngredient(seed.id)?.name ?? seed.id,
  sellPrice: findIngredient(seed.id)?.sellPrice ?? 0,
}));

export interface FarmOrderDef {
  id: string;
  title: string;
  needs: Array<{ cropId: string; amount: number }>;
  coins: number;
  prosperity: number;
}

/** 订单价永远高于「直接把作物卖掉」，否则没人愿意做订单。 */
export const FARM_ORDERS: readonly FarmOrderDef[] = [
  {
    id: 'order-wheat',
    title: '面点铺要小麦',
    needs: [
      { cropId: 'wheat', amount: 2 },
      { cropId: 'carrot', amount: 1 },
    ],
    coins: 60,
    prosperity: 2,
  },
  {
    id: 'order-carrot',
    title: '水族馆要鱼食',
    needs: [{ cropId: 'carrot', amount: 3 }],
    coins: 80,
    prosperity: 3,
  },
  {
    id: 'order-pumpkin',
    title: '灯会要南瓜灯',
    needs: [
      { cropId: 'berry', amount: 2 },
      { cropId: 'pumpkin', amount: 1 },
    ],
    coins: 120,
    prosperity: 5,
  },
  {
    id: 'order-salad',
    title: '餐厅要时蔬',
    needs: [
      { cropId: 'lettuce', amount: 3 },
      { cropId: 'tomato', amount: 2 },
    ],
    coins: 90,
    prosperity: 4,
  },
  {
    id: 'order-grape',
    title: '食集要果盘',
    needs: [
      { cropId: 'grape', amount: 2 },
      { cropId: 'corn', amount: 1 },
    ],
    coins: 165,
    prosperity: 6,
  },
  {
    id: 'order-pickle',
    title: '酱坊要白菜',
    needs: [
      { cropId: 'cabbage', amount: 3 },
      { cropId: 'garlic', amount: 1 },
    ],
    coins: 170,
    prosperity: 5,
  },
  {
    id: 'order-mushroom',
    title: '汤馆要鲜菇',
    needs: [
      { cropId: 'mushroom', amount: 3 },
      { cropId: 'onion', amount: 1 },
    ],
    coins: 192,
    prosperity: 5,
  },
  {
    id: 'order-root',
    title: '食堂要根菜',
    needs: [
      { cropId: 'radish', amount: 3 },
      { cropId: 'potato', amount: 2 },
    ],
    coins: 150,
    prosperity: 4,
  },
] as const;

export function findCrop(id: string): CropDef | undefined {
  return CROPS.find((crop) => crop.id === id);
}

/** 3×3 田地：前 6 块默认开垦，后 3 块用王都币扩建。 */
export const FARM_PLOTS = 9;
export const FARM_START_PLOTS = 6;
export const FARM_PLOT_COSTS = [0, 0, 0, 0, 0, 0, 60, 100, 160] as const;
