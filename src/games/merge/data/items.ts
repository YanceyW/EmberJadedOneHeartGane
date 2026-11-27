import { COLORS } from '../../../shared/design-system/tokens';

export const MERGE_ROWS = 5;
export const MERGE_COLS = 5;
export const MERGE_MAX_TIER = 3;
export const SPAWN_COST = 6;

export interface MergeItemDef {
  tier: number;
  name: string;
  short: string;
  color: string;
  shade: string;
  sellPrice: number;
}

export const MERGE_ITEMS: readonly MergeItemDef[] = [
  { tier: 0, name: '新鲜莓果', short: '莓果', color: COLORS.berry, shade: COLORS.petalDeep, sellPrice: 2 },
  { tier: 1, name: '手作果酱', short: '果酱', color: COLORS.honey, shade: COLORS.honeyDeep, sellPrice: 6 },
  { tier: 2, name: '莓果蛋糕', short: '蛋糕', color: COLORS.petal, shade: COLORS.petalDeep, sellPrice: 18 },
  { tier: 3, name: '王都宴席', short: '宴席', color: COLORS.gold, shade: COLORS.honeyDeep, sellPrice: 42 },
] as const;

export interface MergeOrderDef {
  id: string;
  title: string;
  needs: Array<{ tier: number; amount: number }>;
  coins: number;
  prosperity: number;
}

export const MERGE_ORDERS: readonly MergeOrderDef[] = [
  {
    id: 'order-jam',
    title: '甜品屋要两罐果酱',
    needs: [{ tier: 1, amount: 2 }],
    coins: 40,
    prosperity: 2,
  },
  {
    id: 'order-cake',
    title: '茶会要一份莓果蛋糕',
    needs: [
      { tier: 1, amount: 1 },
      { tier: 2, amount: 1 },
    ],
    coins: 74,
    prosperity: 3,
  },
  {
    id: 'order-feast',
    title: '王都晚宴要一份宴席',
    needs: [
      { tier: 2, amount: 1 },
      { tier: 3, amount: 1 },
    ],
    coins: 168,
    prosperity: 6,
  },
] as const;

export function mergeItem(tier: number): MergeItemDef {
  return MERGE_ITEMS[Math.max(0, Math.min(MERGE_MAX_TIER, tier))];
}
