import { IngredientNeed, hasIngredients } from '../../../shared/content/ingredients';

export interface MergeRecipe {
  id: string;
  name: string;
  /** 一句话说明，显示在卡片上。 */
  hint: string;
  needs: IngredientNeed[];
  gives: { id: string; amount: number };
  /** 加工要用的王都币；研磨类是 0。 */
  coinCost: number;
}

/**
 * 加工屋的「原料间」：把仓库里的作物做成半成品，全部进王都仓库，餐厅直接用。
 * 中式面点 / 豆制品 / 腌菜 / 高汤四条线，缺料可以当场补齐（卖价 ×3）。
 */
export const MERGE_RECIPES: readonly MergeRecipe[] = [
  {
    id: 'flour',
    name: '磨面粉',
    hint: '小麦磨成面粉，面食都要它',
    needs: [{ id: 'wheat', amount: 2 }],
    gives: { id: 'flour', amount: 1 },
    coinCost: 0,
  },
  {
    id: 'riceflour',
    name: '碾米粉',
    hint: '水稻碾成米粉，做糕与羹',
    needs: [{ id: 'rice', amount: 2 }],
    gives: { id: 'riceflour', amount: 1 },
    coinCost: 2,
  },
  {
    id: 'noodle',
    name: '压挂面',
    hint: '面粉压成挂面，煮面用',
    needs: [{ id: 'flour', amount: 2 }],
    gives: { id: 'noodle', amount: 1 },
    coinCost: 2,
  },
  {
    id: 'cornmeal',
    name: '磨玉米面',
    hint: '玉米磨面，做饼与窝头',
    needs: [{ id: 'corn', amount: 2 }],
    gives: { id: 'cornmeal', amount: 1 },
    coinCost: 2,
  },
  {
    id: 'garlicpaste',
    name: '捣蒜蓉',
    hint: '大蒜捣成蒜蓉，炒菜提香',
    needs: [{ id: 'garlic', amount: 3 }],
    gives: { id: 'garlicpaste', amount: 1 },
    coinCost: 2,
  },
  {
    id: 'bun',
    name: '蒸馒头',
    hint: '面粉发面蒸成馒头',
    needs: [{ id: 'flour', amount: 3 }],
    gives: { id: 'bun', amount: 1 },
    coinCost: 3,
  },
  {
    id: 'pickle',
    name: '腌酸菜',
    hint: '大白菜腌一坛酸菜',
    needs: [{ id: 'cabbage', amount: 2 }],
    gives: { id: 'pickle', amount: 1 },
    coinCost: 2,
  },
  {
    id: 'beanpaste',
    name: '熬豆沙',
    hint: '大豆熬成豆沙，做甜点',
    needs: [{ id: 'soybean', amount: 3 }],
    gives: { id: 'beanpaste', amount: 1 },
    coinCost: 3,
  },
  {
    id: 'bread',
    name: '烤面包',
    hint: '面粉烤成面包，早点与点心',
    needs: [{ id: 'flour', amount: 2 }],
    gives: { id: 'bread', amount: 1 },
    coinCost: 3,
  },
  {
    id: 'tofu',
    name: '点豆腐',
    hint: '大豆磨浆点成豆腐',
    needs: [{ id: 'soybean', amount: 2 }],
    gives: { id: 'tofu', amount: 1 },
    coinCost: 2,
  },
  {
    id: 'stock',
    name: '熬菌菇高汤',
    hint: '蘑菇加洋葱熬一锅高汤',
    needs: [
      { id: 'mushroom', amount: 2 },
      { id: 'onion', amount: 1 },
    ],
    gives: { id: 'stock', amount: 1 },
    coinCost: 3,
  },
  {
    id: 'feed',
    name: '配饲料',
    hint: '玉米拌小麦，牧场动物爱吃',
    needs: [
      { id: 'corn', amount: 2 },
      { id: 'wheat', amount: 1 },
    ],
    gives: { id: 'feed', amount: 1 },
    coinCost: 2,
  },
] as const;

export type CraftResult = 'ok' | 'missing' | 'poor';

export function findRecipe(id: string): MergeRecipe | undefined {
  return MERGE_RECIPES.find((recipe) => recipe.id === id);
}

export function canCraft(
  pantry: Record<string, number>,
  recipe: MergeRecipe,
  coins: number,
): boolean {
  return hasIngredients(pantry, recipe.needs) && coins >= recipe.coinCost;
}
