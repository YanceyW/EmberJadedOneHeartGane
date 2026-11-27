import { describe, expect, it } from 'vitest';
import {
  INGREDIENTS,
  INGREDIENT_IDS,
  findIngredient,
  purchasePrice,
  restockCost,
} from '../src/shared/content/ingredients';
import { MENU, DISH_MENU, DRINK_MENU, menuSellPrice } from '../src/shared/content/menu';
import { MERGE_RECIPES } from '../src/games/merge/data/recipes';
import { COMBO_RECIPES } from '../src/games/restaurant/data/combos';
import { CROPS } from '../src/games/farm/data/crops';
import { FLOWERS } from '../src/games/garden/data/flowers';

function needsValue(needs: readonly { id: string; amount: number }[]): number {
  return needs.reduce((sum, need) => sum + (findIngredient(need.id)?.sellPrice ?? 0) * need.amount, 0);
}

describe('content economy', () => {
  it('keeps every goods id unique', () => {
    expect(new Set(INGREDIENT_IDS).size).toBe(INGREDIENT_IDS.length);
    expect(CROPS).toHaveLength(18);
    expect(FLOWERS).toHaveLength(9);
  });

  it('keeps farm and garden prices aligned with the warehouse', () => {
    for (const crop of CROPS) {
      expect(crop.sellPrice).toBe(findIngredient(crop.id)?.sellPrice);
    }
    for (const flower of FLOWERS) {
      expect(flower.sellPrice).toBe(findIngredient(flower.id)?.sellPrice);
    }
  });

  it('never makes processing profitable on its own', () => {
    for (const recipe of MERGE_RECIPES) {
      const output = findIngredient(recipe.gives.id);
      expect(output, recipe.id).toBeDefined();
      expect(output!.kind).toBe('processed');
      const inputValue = needsValue(recipe.needs);
      if (output!.sellPrice >= inputValue) {
        throw new Error(`${recipe.name}: 产出 ${output!.sellPrice} >= 原料 ${inputValue}`);
      }
    }
  });

  it('keeps dishes worth more than their ingredients', () => {
    for (const item of MENU) {
      const inputValue = needsValue(item.needs);
      if (item.coins <= inputValue) {
        throw new Error(`${item.name}: 菜价 ${item.coins} <= 食材 ${inputValue}`);
      }
      // 仓卖 = 四折，必须低于食材直卖，否则会出现「做了再卖」的套利。
      const warehousePrice = findIngredient(item.id)?.sellPrice ?? 0;
      expect(warehousePrice).toBe(menuSellPrice(item.coins));
      if (warehousePrice >= inputValue) {
        throw new Error(`${item.name}: 仓卖 ${warehousePrice} >= 食材 ${inputValue}`);
      }
    }
  });

  it('makes buying every ingredient lose money', () => {
    for (const item of MENU) {
      let cost = 0;
      for (const need of item.needs) cost += purchasePrice(need.id) * need.amount;
      if (cost <= item.coins * 1.2) {
        throw new Error(`${item.name}: 全采购 ${cost} 不够贵（菜价 ${item.coins}）`);
      }
    }
  });

  it('prices restock at the missing amount only', () => {
    const item = DISH_MENU[0];
    const empty: Record<string, number> = {};
    const full: Record<string, number> = {};
    for (const need of item.needs) full[need.id] = need.amount;
    expect(restockCost(full, item.needs)).toBe(0);
    expect(restockCost(empty, item.needs)).toBeGreaterThan(needsValue(item.needs));
  });

  it('ships drink recipes alongside dishes', () => {
    expect(DISH_MENU.length).toBe(31);
    expect(DRINK_MENU.length).toBe(5);
    for (const drink of DRINK_MENU) {
      expect(findIngredient(drink.id)?.kind).toBe('drink');
    }
    expect(INGREDIENTS.length).toBe(1 + 18 + 9 + 4 + 14 + 5 + 31);
  });

  it('never lets a restaurant combo be sold for more than its inputs', () => {
    for (const recipe of COMBO_RECIPES) {
      const output = findIngredient(recipe.output);
      expect(output, recipe.id).toBeDefined();
      const inputValue = needsValue(
        recipe.inputs.map((id) => ({ id, amount: 1 })),
      );
      if (output!.sellPrice >= inputValue) {
        throw new Error(
          `${recipe.inputs.join('+')}→${recipe.output}: 仓卖 ${output!.sellPrice} >= 原料 ${inputValue}`,
        );
      }
    }
  });

  it('keeps ranch products and feed inside the shared warehouse economy', () => {
    for (const id of ['egg', 'milk', 'pork', 'mutton']) {
      expect(findIngredient(id)?.kind).toBe('ranch');
      expect(findIngredient(id)!.sellPrice).toBeGreaterThan(0);
    }
    const feed = findIngredient('feed');
    expect(feed?.kind).toBe('processed');
    expect(feed!.sellPrice).toBeLessThan(
      findIngredient('corn')!.sellPrice * 2 + findIngredient('wheat')!.sellPrice,
    );
    expect(findIngredient('water')?.kind).toBe('base');
  });
});
