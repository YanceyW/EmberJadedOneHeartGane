import { COLORS } from '../../../shared/design-system/tokens';
import { findIngredient } from '../../../shared/content/ingredients';

export type FlowerShape = 'round' | 'bell' | 'spade' | 'star' | 'sun' | 'cluster' | 'lotus';

export interface FlowerDef {
  id: string;
  name: string;
  seedCost: number;
  growSeconds: number;
  /** 仓库卖价，统一来自 shared/content/ingredients.ts。 */
  sellPrice: number;
  color: string;
  shade: string;
  shape: FlowerShape;
}

interface FlowerSeed {
  id: string;
  seedCost: number;
  growSeconds: number;
  color: string;
  shade: string;
  shape: FlowerShape;
}

const FLOWER_SEEDS: readonly FlowerSeed[] = [
  {
    id: 'daisy',
    seedCost: 8,
    growSeconds: 45,
    color: COLORS.cream,
    shade: COLORS.honey,
    shape: 'round',
  },
  {
    id: 'tulip',
    seedCost: 16,
    growSeconds: 75,
    color: COLORS.petal,
    shade: COLORS.petalDeep,
    shape: 'bell',
  },
  {
    id: 'sunflower',
    seedCost: 22,
    growSeconds: 95,
    color: COLORS.honey,
    shade: COLORS.honeyDeep,
    shape: 'sun',
  },
  {
    id: 'rose',
    seedCost: 26,
    growSeconds: 120,
    color: COLORS.coral,
    shade: COLORS.petalDeep,
    shape: 'spade',
  },
  {
    id: 'jasmine',
    seedCost: 30,
    growSeconds: 150,
    color: COLORS.paper,
    shade: COLORS.honey,
    shape: 'star',
  },
  {
    id: 'chrysanthemum',
    seedCost: 32,
    growSeconds: 165,
    color: COLORS.gold,
    shade: COLORS.honeyDeep,
    shape: 'round',
  },
  {
    id: 'lilac',
    seedCost: 36,
    growSeconds: 180,
    color: COLORS.lilac,
    shade: COLORS.lilacDeep,
    shape: 'cluster',
  },
  {
    id: 'osmanthus',
    seedCost: 40,
    growSeconds: 200,
    color: COLORS.gold,
    shade: COLORS.honeyDeep,
    shape: 'cluster',
  },
  {
    id: 'lotus',
    seedCost: 46,
    growSeconds: 220,
    color: COLORS.petal,
    shade: COLORS.petalDeep,
    shape: 'lotus',
  },
];

export const FLOWERS: readonly FlowerDef[] = FLOWER_SEEDS.map((seed) => ({
  ...seed,
  name: findIngredient(seed.id)?.name ?? seed.id,
  sellPrice: findIngredient(seed.id)?.sellPrice ?? 0,
}));

export interface FlowerOrderDef {
  id: string;
  title: string;
  needs: Array<{ flowerId: string; amount: number }>;
  coins: number;
  prosperity: number;
}

export const FLOWER_ORDERS: readonly FlowerOrderDef[] = [
  {
    id: 'order-daisy',
    title: '甜品屋要雏菊桌花',
    needs: [{ flowerId: 'daisy', amount: 2 }],
    coins: 42,
    prosperity: 2,
  },
  {
    id: 'order-tulip',
    title: '广场要郁金香花坛',
    needs: [
      { flowerId: 'daisy', amount: 1 },
      { flowerId: 'tulip', amount: 2 },
    ],
    coins: 100,
    prosperity: 3,
  },
  {
    id: 'order-sunflower',
    title: '花市要向日葵',
    needs: [{ flowerId: 'sunflower', amount: 3 }],
    coins: 150,
    prosperity: 4,
  },
  {
    id: 'order-rose',
    title: '茶会要玫瑰花束',
    needs: [
      { flowerId: 'rose', amount: 2 },
      { flowerId: 'chrysanthemum', amount: 1 },
    ],
    coins: 210,
    prosperity: 5,
  },
  {
    id: 'order-osmanthus',
    title: '中秋要桂花枝',
    needs: [{ flowerId: 'osmanthus', amount: 2 }],
    coins: 190,
    prosperity: 5,
  },
  {
    id: 'order-lotus',
    title: '荷塘要荷花与茉莉',
    needs: [
      { flowerId: 'lotus', amount: 2 },
      { flowerId: 'jasmine', amount: 1 },
    ],
    coins: 310,
    prosperity: 6,
  },
] as const;

export const GARDEN_PLOTS = 6;

export function findFlower(id: string): FlowerDef | undefined {
  return FLOWERS.find((flower) => flower.id === id);
}
