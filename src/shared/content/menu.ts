import { COLORS } from '../design-system/tokens';
import { findIngredient, IngredientNeed } from './ingredients';

/** 厨房能做的「出品」：炒菜与茶饮。做好后进王都仓库，上菜时消耗。 */
export type MenuArt =
  | 'stirfry'
  | 'noodle'
  | 'soup'
  | 'cake'
  | 'bun'
  | 'plate'
  | 'pancake'
  | 'rice'
  | 'tea'
  | 'milk';

export interface MenuItemDef {
  id: string;
  kind: 'dish' | 'drink';
  name: string;
  art: MenuArt;
  /** 主色，画面里只做点睛，描边与纸底仍走 tokens。 */
  tint: string;
  needs: IngredientNeed[];
  /** 上菜价（营业 / 点菜都按这个价结算）。 */
  coins: number;
  prosperity: number;
}

interface MenuSeed {
  id: string;
  kind: 'dish' | 'drink';
  art: MenuArt;
  tint: string;
  needs: IngredientNeed[];
  coins: number;
  prosperity: number;
}

const SEEDS: readonly MenuSeed[] = [
  // 炒菜
  {
    id: 'veggie-stir',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.leaf,
    needs: [
      { id: 'lettuce', amount: 1 },
      { id: 'garlicpaste', amount: 1 },
    ],
    coins: 96,
    prosperity: 2,
  },
  {
    id: 'spring-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.honey,
    needs: [
      { id: 'noodle', amount: 1 },
      { id: 'lettuce', amount: 1 },
    ],
    coins: 88,
    prosperity: 2,
  },
  {
    id: 'pumpkin-cake',
    kind: 'dish',
    art: 'pancake',
    tint: COLORS.honey,
    needs: [
      { id: 'pumpkin', amount: 1 },
      { id: 'flour', amount: 1 },
    ],
    coins: 112,
    prosperity: 3,
  },
  {
    id: 'tomato-tofu',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.coral,
    needs: [
      { id: 'tomato', amount: 1 },
      { id: 'tofu', amount: 1 },
    ],
    coins: 118,
    prosperity: 3,
  },
  {
    id: 'tomato-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.coral,
    needs: [
      { id: 'noodle', amount: 1 },
      { id: 'tomato', amount: 1 },
    ],
    coins: 112,
    prosperity: 3,
  },
  {
    id: 'pickle-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.mintDeep,
    needs: [
      { id: 'pickle', amount: 1 },
      { id: 'noodle', amount: 1 },
    ],
    coins: 124,
    prosperity: 3,
  },
  {
    id: 'potato-pancake',
    kind: 'dish',
    art: 'pancake',
    tint: COLORS.honey,
    needs: [
      { id: 'potato', amount: 1 },
      { id: 'onion', amount: 1 },
      { id: 'flour', amount: 1 },
    ],
    coins: 138,
    prosperity: 3,
  },
  {
    id: 'potato-shreds',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.honeyDeep,
    needs: [
      { id: 'potato', amount: 1 },
      { id: 'garlicpaste', amount: 1 },
    ],
    coins: 136,
    prosperity: 3,
  },
  {
    id: 'veggie-rice',
    kind: 'dish',
    art: 'rice',
    tint: COLORS.cream,
    needs: [
      { id: 'rice', amount: 1 },
      { id: 'carrot', amount: 1 },
      { id: 'onion', amount: 1 },
    ],
    coins: 108,
    prosperity: 4,
  },
  {
    id: 'corn-potage',
    kind: 'dish',
    art: 'soup',
    tint: COLORS.honey,
    needs: [
      { id: 'corn', amount: 1 },
      { id: 'cornmeal', amount: 1 },
    ],
    coins: 148,
    prosperity: 4,
  },
  {
    id: 'home-tofu',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.honeyDeep,
    needs: [
      { id: 'tofu', amount: 1 },
      { id: 'cabbage', amount: 1 },
      { id: 'garlicpaste', amount: 1 },
    ],
    coins: 168,
    prosperity: 4,
  },
  {
    id: 'mushroom-soup',
    kind: 'dish',
    art: 'soup',
    tint: COLORS.inkSoft,
    needs: [
      { id: 'stock', amount: 1 },
      { id: 'mushroom', amount: 1 },
    ],
    coins: 156,
    prosperity: 4,
  },
  {
    id: 'fruit-plate',
    kind: 'dish',
    art: 'plate',
    tint: COLORS.lilac,
    needs: [{ id: 'grape', amount: 2 }],
    coins: 156,
    prosperity: 4,
  },
  {
    id: 'beans-bun',
    kind: 'dish',
    art: 'bun',
    tint: COLORS.paper,
    needs: [
      { id: 'bun', amount: 1 },
      { id: 'beanpaste', amount: 1 },
    ],
    coins: 162,
    prosperity: 4,
  },
  {
    id: 'berry-cake',
    kind: 'dish',
    art: 'cake',
    tint: COLORS.berry,
    needs: [
      { id: 'berry', amount: 1 },
      { id: 'beanpaste', amount: 1 },
      { id: 'riceflour', amount: 1 },
    ],
    coins: 166,
    prosperity: 4,
  },
  {
    id: 'rose-cake',
    kind: 'dish',
    art: 'cake',
    tint: COLORS.petalDeep,
    needs: [
      { id: 'rose', amount: 1 },
      { id: 'flour', amount: 2 },
    ],
    coins: 198,
    prosperity: 5,
  },
  {
    id: 'garlic-eggplant',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.lilacDeep,
    needs: [
      { id: 'eggplant', amount: 1 },
      { id: 'garlicpaste', amount: 1 },
    ],
    coins: 178,
    prosperity: 4,
  },
  {
    id: 'osmanthus-cake',
    kind: 'dish',
    art: 'cake',
    tint: COLORS.honey,
    needs: [
      { id: 'osmanthus', amount: 1 },
      { id: 'riceflour', amount: 2 },
    ],
    coins: 208,
    prosperity: 5,
  },
  // 牧产菜：鸡蛋、牛奶、猪肉、羊肉都从牧场来
  {
    id: 'tomato-egg',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.coral,
    needs: [
      { id: 'tomato', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 140,
    prosperity: 3,
  },
  {
    id: 'egg-fried-rice',
    kind: 'dish',
    art: 'rice',
    tint: COLORS.gold,
    needs: [
      { id: 'rice', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 138,
    prosperity: 3,
  },
  {
    id: 'egg-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.honey,
    needs: [
      { id: 'noodle', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 170,
    prosperity: 4,
  },
  {
    id: 'milk-pudding',
    kind: 'dish',
    art: 'cake',
    tint: COLORS.cream,
    needs: [
      { id: 'milk', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 220,
    prosperity: 4,
  },
  {
    id: 'pork-bun',
    kind: 'dish',
    art: 'bun',
    tint: COLORS.paper,
    needs: [
      { id: 'bun', amount: 1 },
      { id: 'pork', amount: 1 },
    ],
    coins: 290,
    prosperity: 5,
  },
  {
    id: 'pork-cabbage',
    kind: 'dish',
    art: 'stirfry',
    tint: COLORS.leaf,
    needs: [
      { id: 'pork', amount: 1 },
      { id: 'cabbage', amount: 1 },
    ],
    coins: 270,
    prosperity: 5,
  },
  {
    id: 'mutton-soup',
    kind: 'dish',
    art: 'soup',
    tint: COLORS.peach,
    needs: [
      { id: 'mutton', amount: 1 },
      { id: 'mushroom', amount: 1 },
      { id: 'stock', amount: 1 },
    ],
    coins: 325,
    prosperity: 5,
  },
  {
    id: 'cheese-toast',
    kind: 'dish',
    art: 'plate',
    tint: COLORS.gold,
    needs: [
      { id: 'bread', amount: 1 },
      { id: 'cheese', amount: 1 },
    ],
    coins: 245,
    prosperity: 4,
  },
  // 深链面食：3×3 灶台的图案与半成品再加工
  {
    id: 'mixed-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.honey,
    needs: [
      { id: 'stock', amount: 1 },
      { id: 'noodle', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 210,
    prosperity: 5,
  },
  {
    id: 'three-delight-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.coral,
    needs: [
      { id: 'stock', amount: 1 },
      { id: 'noodle', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 230,
    prosperity: 5,
  },
  {
    id: 'casserole-family',
    kind: 'dish',
    art: 'soup',
    tint: COLORS.inkSoft,
    needs: [
      { id: 'mixed-noodle', amount: 1 },
      { id: 'stock', amount: 1 },
      { id: 'mushroom', amount: 1 },
      { id: 'egg', amount: 1 },
    ],
    coins: 320,
    prosperity: 6,
  },
  {
    id: 'four-treasure-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.peach,
    needs: [
      { id: 'mixed-noodle', amount: 1 },
      { id: 'pork-broth', amount: 1 },
      { id: 'egg', amount: 1 },
      { id: 'mushroom', amount: 1 },
    ],
    coins: 350,
    prosperity: 6,
  },
  {
    id: 'pork-noodle',
    kind: 'dish',
    art: 'noodle',
    tint: COLORS.honeyDeep,
    needs: [
      { id: 'pork-broth', amount: 1 },
      { id: 'noodle', amount: 1 },
    ],
    coins: 230,
    prosperity: 5,
  },
  // 茶饮
  {
    id: 'ricemilk',
    kind: 'drink',
    art: 'milk',
    tint: COLORS.cream,
    needs: [
      { id: 'rice', amount: 1 },
      { id: 'water', amount: 1 },
    ],
    coins: 40,
    prosperity: 1,
  },
  {
    id: 'soymilk',
    kind: 'drink',
    art: 'milk',
    tint: COLORS.honey,
    needs: [
      { id: 'soybean', amount: 1 },
      { id: 'water', amount: 1 },
    ],
    coins: 50,
    prosperity: 1,
  },
  {
    id: 'jasmine-tea',
    kind: 'drink',
    art: 'tea',
    tint: COLORS.mint,
    needs: [
      { id: 'jasmine', amount: 1 },
      { id: 'water', amount: 1 },
    ],
    coins: 88,
    prosperity: 2,
  },
  {
    id: 'chrys-tea',
    kind: 'drink',
    art: 'tea',
    tint: COLORS.honey,
    needs: [
      { id: 'chrysanthemum', amount: 1 },
      { id: 'water', amount: 1 },
    ],
    coins: 92,
    prosperity: 2,
  },
  {
    id: 'osmanthus-tea',
    kind: 'drink',
    art: 'tea',
    tint: COLORS.gold,
    needs: [
      { id: 'osmanthus', amount: 1 },
      { id: 'water', amount: 1 },
    ],
    coins: 96,
    prosperity: 2,
  },
] as const;

export const MENU: readonly MenuItemDef[] = SEEDS.map((seed) => ({
  ...seed,
  name: findIngredient(seed.id)?.name ?? seed.id,
}));

export const DISH_MENU: readonly MenuItemDef[] = MENU.filter((item) => item.kind === 'dish');
export const DRINK_MENU: readonly MenuItemDef[] = MENU.filter((item) => item.kind === 'drink');

export function findMenuItem(id: string): MenuItemDef | undefined {
  return MENU.find((item) => item.id === id);
}

/** 成菜仓卖价 = 菜价四折（取整），写死在 ingredients 里，这里只做校验用。 */
export function menuSellPrice(coins: number): number {
  return Math.round(coins * 0.4);
}
