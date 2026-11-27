/**
 * 王都仓库（唯一库存）：农场的作物、花园的花卉、加工屋的半成品、厨房的茶饮与成菜，
 * 全部是同一份字典里的一种「货物」，共用一个 id 空间。
 *
 * 价格只在这里定义：农场/花园的卖价、加工屋产出、餐厅菜价都必须从这里取，
 * 由 tests/content-economy.test.ts 校验，避免同一件东西出现两个价。
 */

export type GoodsKind = 'base' | 'crop' | 'flower' | 'ranch' | 'processed' | 'drink' | 'dish';

export interface IngredientDef {
  id: string;
  name: string;
  kind: GoodsKind;
  /** 在仓库里直接卖出的单价；采购价 = 这个价 × PURCHASE_MARKUP。 */
  sellPrice: number;
}

/** 缺料时在餐厅/加工屋当场补齐的加价倍数：便利税，永远比自己做贵。 */
export const PURCHASE_MARKUP = 3;

export const PANTRY_CAP = 999;

/** 王都自来水：餐厅备料台/灶台与营业无限供应，不占仓库，也没有套利空间。 */
const BASES: readonly IngredientDef[] = [
  { id: 'water', name: '清水', kind: 'base', sellPrice: 1 },
] as const;

const CROPS: readonly IngredientDef[] = [
  { id: 'lettuce', name: '小白菜', kind: 'crop', sellPrice: 12 },
  { id: 'wheat', name: '小麦', kind: 'crop', sellPrice: 14 },
  { id: 'rice', name: '水稻', kind: 'crop', sellPrice: 16 },
  { id: 'soybean', name: '大豆', kind: 'crop', sellPrice: 20 },
  { id: 'tomato', name: '番茄', kind: 'crop', sellPrice: 20 },
  { id: 'radish', name: '白萝卜', kind: 'crop', sellPrice: 22 },
  { id: 'carrot', name: '胡萝卜', kind: 'crop', sellPrice: 24 },
  { id: 'cucumber', name: '黄瓜', kind: 'crop', sellPrice: 26 },
  { id: 'garlic', name: '大蒜', kind: 'crop', sellPrice: 28 },
  { id: 'berry', name: '草莓', kind: 'crop', sellPrice: 30 },
  { id: 'potato', name: '土豆', kind: 'crop', sellPrice: 32 },
  { id: 'onion', name: '洋葱', kind: 'crop', sellPrice: 34 },
  { id: 'corn', name: '玉米', kind: 'crop', sellPrice: 36 },
  { id: 'cabbage', name: '大白菜', kind: 'crop', sellPrice: 40 },
  { id: 'mushroom', name: '蘑菇', kind: 'crop', sellPrice: 44 },
  { id: 'pumpkin', name: '南瓜', kind: 'crop', sellPrice: 50 },
  { id: 'eggplant', name: '茄子', kind: 'crop', sellPrice: 54 },
  { id: 'grape', name: '葡萄', kind: 'crop', sellPrice: 58 },
] as const;

const FLOWERS: readonly IngredientDef[] = [
  { id: 'daisy', name: '雏菊', kind: 'flower', sellPrice: 18 },
  { id: 'tulip', name: '郁金香', kind: 'flower', sellPrice: 34 },
  { id: 'sunflower', name: '向日葵', kind: 'flower', sellPrice: 44 },
  { id: 'rose', name: '玫瑰', kind: 'flower', sellPrice: 56 },
  { id: 'jasmine', name: '茉莉', kind: 'flower', sellPrice: 72 },
  { id: 'chrysanthemum', name: '菊花', kind: 'flower', sellPrice: 76 },
  { id: 'lilac', name: '风信子', kind: 'flower', sellPrice: 82 },
  { id: 'osmanthus', name: '桂花', kind: 'flower', sellPrice: 84 },
  { id: 'lotus', name: '荷花', kind: 'flower', sellPrice: 104 },
] as const;

/** 牧场产物：只由动物产出，不能直接买。 */
const RANCH: readonly IngredientDef[] = [
  { id: 'egg', name: '鸡蛋', kind: 'ranch', sellPrice: 46 },
  { id: 'milk', name: '牛奶', kind: 'ranch', sellPrice: 58 },
  { id: 'pork', name: '猪肉', kind: 'ranch', sellPrice: 88 },
  { id: 'mutton', name: '羊肉', kind: 'ranch', sellPrice: 96 },
] as const;

const PROCESSED: readonly IngredientDef[] = [
  { id: 'feed', name: '饲料', kind: 'processed', sellPrice: 26 },
  { id: 'flour', name: '面粉', kind: 'processed', sellPrice: 26 },
  { id: 'riceflour', name: '米粉', kind: 'processed', sellPrice: 30 },
  { id: 'noodle', name: '挂面', kind: 'processed', sellPrice: 26 },
  { id: 'tofu', name: '豆腐', kind: 'processed', sellPrice: 38 },
  { id: 'cornmeal', name: '玉米面', kind: 'processed', sellPrice: 44 },
  { id: 'garlicpaste', name: '蒜蓉', kind: 'processed', sellPrice: 46 },
  { id: 'bread', name: '面包', kind: 'processed', sellPrice: 48 },
  { id: 'bun', name: '馒头', kind: 'processed', sellPrice: 52 },
  { id: 'pickle', name: '酸菜', kind: 'processed', sellPrice: 40 },
  { id: 'beanpaste', name: '豆沙', kind: 'processed', sellPrice: 38 },
  { id: 'stock', name: '菌菇高汤', kind: 'processed', sellPrice: 44 },
  { id: 'pork-broth', name: '猪肉高汤', kind: 'processed', sellPrice: 70 },
  { id: 'cheese', name: '奶酪', kind: 'processed', sellPrice: 64 },
] as const;

const DRINKS: readonly IngredientDef[] = [
  { id: 'ricemilk', name: '米浆', kind: 'drink', sellPrice: 16 },
  { id: 'soymilk', name: '豆浆', kind: 'drink', sellPrice: 20 },
  { id: 'jasmine-tea', name: '茉莉花茶', kind: 'drink', sellPrice: 35 },
  { id: 'chrys-tea', name: '菊花茶', kind: 'drink', sellPrice: 37 },
  { id: 'osmanthus-tea', name: '桂花茶', kind: 'drink', sellPrice: 38 },
  { id: 'daisy-tea', name: '雏菊茶', kind: 'drink', sellPrice: 18 },
  { id: 'tulip-tea', name: '郁金香茶', kind: 'drink', sellPrice: 32 },
  { id: 'sunflower-tea', name: '向日葵茶', kind: 'drink', sellPrice: 42 },
  { id: 'lilac-tea', name: '风信子茶', kind: 'drink', sellPrice: 78 },
  { id: 'lotus-tea', name: '荷花茶', kind: 'drink', sellPrice: 98 },
] as const;

const DISHES: readonly IngredientDef[] = [
  { id: 'veggie-stir', name: '清炒小白菜', kind: 'dish', sellPrice: 38 },
  { id: 'spring-noodle', name: '阳春面', kind: 'dish', sellPrice: 35 },
  { id: 'pumpkin-cake', name: '南瓜饼', kind: 'dish', sellPrice: 45 },
  { id: 'tomato-tofu', name: '番茄豆腐', kind: 'dish', sellPrice: 47 },
  { id: 'tomato-noodle', name: '番茄面', kind: 'dish', sellPrice: 45 },
  { id: 'pickle-noodle', name: '酸菜面', kind: 'dish', sellPrice: 50 },
  { id: 'potato-pancake', name: '洋葱土豆饼', kind: 'dish', sellPrice: 55 },
  { id: 'potato-shreds', name: '土豆丝', kind: 'dish', sellPrice: 54 },
  { id: 'veggie-rice', name: '蔬菜焖饭', kind: 'dish', sellPrice: 43 },
  { id: 'corn-potage', name: '玉米羹', kind: 'dish', sellPrice: 59 },
  { id: 'home-tofu', name: '家常豆腐', kind: 'dish', sellPrice: 67 },
  { id: 'mushroom-soup', name: '菌菇汤', kind: 'dish', sellPrice: 62 },
  { id: 'fruit-plate', name: '葡萄果盘', kind: 'dish', sellPrice: 62 },
  { id: 'beans-bun', name: '豆沙包', kind: 'dish', sellPrice: 65 },
  { id: 'berry-cake', name: '草莓豆沙糕', kind: 'dish', sellPrice: 66 },
  { id: 'rose-cake', name: '玫瑰鲜花饼', kind: 'dish', sellPrice: 79 },
  { id: 'radish-cake', name: '萝卜糕', kind: 'dish', sellPrice: 44 },
  { id: 'cucumber-salad', name: '拍黄瓜', kind: 'dish', sellPrice: 64 },
  { id: 'garlic-eggplant', name: '蒜蓉茄子', kind: 'dish', sellPrice: 71 },
  { id: 'osmanthus-cake', name: '桂花米糕', kind: 'dish', sellPrice: 83 },
  { id: 'tomato-egg', name: '番茄炒蛋', kind: 'dish', sellPrice: 56 },
  { id: 'egg-fried-rice', name: '蛋炒饭', kind: 'dish', sellPrice: 55 },
  { id: 'egg-noodle', name: '鸡蛋面', kind: 'dish', sellPrice: 68 },
  { id: 'milk-pudding', name: '奶香布丁', kind: 'dish', sellPrice: 88 },
  { id: 'pork-bun', name: '鲜肉包', kind: 'dish', sellPrice: 116 },
  { id: 'pork-cabbage', name: '猪肉炖白菜', kind: 'dish', sellPrice: 108 },
  { id: 'mutton-soup', name: '羊肉菌菇汤', kind: 'dish', sellPrice: 130 },
  { id: 'cheese-toast', name: '奶酪吐司', kind: 'dish', sellPrice: 98 },
  { id: 'mixed-noodle', name: '什锦汤面', kind: 'dish', sellPrice: 84 },
  { id: 'three-delight-noodle', name: '三鲜烩面', kind: 'dish', sellPrice: 92 },
  { id: 'casserole-family', name: '砂锅全家福', kind: 'dish', sellPrice: 128 },
  { id: 'four-treasure-noodle', name: '四宝汤面', kind: 'dish', sellPrice: 140 },
  { id: 'pork-noodle', name: '卤肉面', kind: 'dish', sellPrice: 92 },
] as const;

export const INGREDIENTS: readonly IngredientDef[] = [
  ...BASES,
  ...CROPS,
  ...FLOWERS,
  ...RANCH,
  ...PROCESSED,
  ...DRINKS,
  ...DISHES,
];

export const INGREDIENT_IDS: readonly string[] = INGREDIENTS.map((item) => item.id);

/** 王都仓库面板的分页顺序。 */
export const GOODS_TABS: ReadonlyArray<{ kind: GoodsKind; label: string }> = [
  { kind: 'base', label: '基础' },
  { kind: 'crop', label: '作物' },
  { kind: 'flower', label: '花卉' },
  { kind: 'ranch', label: '牧产' },
  { kind: 'processed', label: '半成品' },
  { kind: 'drink', label: '茶饮' },
  { kind: 'dish', label: '成菜' },
];

export interface IngredientNeed {
  id: string;
  amount: number;
}

export function findIngredient(id: string): IngredientDef | undefined {
  return INGREDIENTS.find((item) => item.id === id);
}

export function ingredientName(id: string): string {
  return findIngredient(id)?.name ?? id;
}

export function goodsOfKind(kind: GoodsKind): readonly IngredientDef[] {
  return INGREDIENTS.filter((item) => item.kind === kind);
}

/** 需求列表是否都能从仓库里凑齐。 */
export function hasIngredients(
  pantry: Record<string, number>,
  needs: readonly IngredientNeed[],
): boolean {
  return needs.every((need) => (pantry[need.id] ?? 0) >= need.amount);
}

/** 缺哪几样、各缺多少。 */
export function missingNeeds(
  pantry: Record<string, number>,
  needs: readonly IngredientNeed[],
): IngredientNeed[] {
  const missing: IngredientNeed[] = [];
  for (const need of needs) {
    const lack = need.amount - (pantry[need.id] ?? 0);
    if (lack > 0) missing.push({ id: need.id, amount: lack });
  }
  return missing;
}

/** 这些货物按仓库卖价一共值多少；用于「库存总价值」与卖出前预览。 */
export function sellableValue(
  pantry: Record<string, number>,
  ids: readonly string[],
): { coins: number; count: number } {
  let coins = 0;
  let count = 0;
  for (const id of ids) {
    const amount = Math.max(0, Math.floor(pantry[id] ?? 0));
    const price = findIngredient(id)?.sellPrice ?? 0;
    if (amount <= 0 || price <= 0) continue;
    coins += amount * price;
    count += amount;
  }
  return { coins, count };
}

/** 卖出选中的货物：原子扣减，返回进账。未选中的货物一律不动。 */
export function sellSelection(
  pantry: Record<string, number>,
  ids: readonly string[],
): { coins: number; count: number } {
  const result = sellableValue(pantry, ids);
  for (const id of ids) {
    if ((pantry[id] ?? 0) > 0) pantry[id] = 0;
  }
  return result;
}

function roundTo5(value: number): number {
  return Math.max(10, Math.round(value / 5) * 5);
}

/** 缺料补齐的单价：卖价 × PURCHASE_MARKUP，凑到 5 的倍数。 */
export function purchasePrice(id: string): number {
  const price = findIngredient(id)?.sellPrice ?? 0;
  return price > 0 ? roundTo5(price * PURCHASE_MARKUP) : 0;
}

/** 把一整套需求全买齐要多少钱（含已经够的部分，仅用于展示口径）。 */
export function purchaseCost(needs: readonly IngredientNeed[]): number {
  let cost = 0;
  for (const need of needs) {
    cost += purchasePrice(need.id) * Math.max(0, need.amount);
  }
  return cost;
}

/** 只买缺口：已够的部分不花钱。 */
export function restockCost(
  pantry: Record<string, number>,
  needs: readonly IngredientNeed[],
): number {
  let cost = 0;
  for (const need of missingNeeds(pantry, needs)) {
    cost += purchasePrice(need.id) * need.amount;
  }
  return cost;
}
