import { COMBO_RECIPES, ComboRecipe, recipeHintText, recipesInTree } from '../data/combos';
import { findMenuItem } from '../../../shared/content/menu';
import { ingredientName } from '../../../shared/content/ingredients';
import { StoveState, stoveItems } from './stove';

export type AdviceKind = 'stove' | 'customer' | 'combo';

export interface AdviceCustomer {
  id: number;
  orders: readonly string[];
  servedQuality: ReadonlyArray<number | null>;
}

export interface AdviceCard {
  kind: AdviceKind;
  recipe: ComboRecipe;
  title: string;
  detail: string;
  score: number;
  stoveIndex?: number;
  customerId?: number;
}

function containsMultiset(inputs: readonly string[], items: readonly string[]): boolean {
  const counts = new Map<string, number>();
  for (const input of inputs) counts.set(input, (counts.get(input) ?? 0) + 1);
  for (const item of items) {
    const left = counts.get(item) ?? 0;
    if (left <= 0) return false;
    counts.set(item, left - 1);
  }
  return true;
}

function canCraft(
  id: string,
  available: ReadonlySet<string>,
  visiting: Set<string>,
): boolean {
  if (available.has(id)) return true;
  if (visiting.has(id)) return false;
  const recipe = COMBO_RECIPES.find((entry) => entry.output === id);
  if (!recipe) return false;
  visiting.add(id);
  const ok = recipe.inputs.every((input) => canCraft(input, available, visiting));
  visiting.delete(id);
  return ok;
}

function recipeReachable(
  recipe: ComboRecipe,
  available: ReadonlySet<string>,
): boolean {
  return recipe.inputs.every((input) => canCraft(input, available, new Set()));
}

function missingInputs(inputs: readonly string[], have: readonly string[]): string[] {
  const need = new Map<string, number>();
  for (const input of inputs) need.set(input, (need.get(input) ?? 0) + 1);
  for (const item of have) need.set(item, (need.get(item) ?? 0) - 1);
  const missing: string[] = [];
  for (const [id, count] of need) {
    for (let i = 0; i < count; i += 1) missing.push(id);
  }
  return missing;
}

function pushUnique(list: AdviceCard[], card: AdviceCard): void {
  const key = `${card.kind}:${card.recipe.id}:${card.stoveIndex ?? ''}:${card.customerId ?? ''}`;
  const exists = list.some(
    (item) =>
      `${item.kind}:${item.recipe.id}:${item.stoveIndex ?? ''}:${item.customerId ?? ''}` === key,
  );
  if (!exists) list.push(card);
}

/** 拖动/点选原料时的上下文建议，最多 3 条。 */
export function adviceForItem(
  itemId: string,
  stoves: readonly StoveState[],
  customers: readonly AdviceCustomer[],
  available?: ReadonlySet<string>,
): AdviceCard[] {
  const cards: AdviceCard[] = [];

  stoves.forEach((stove, index) => {
    if (stove.cooking || stove.ready || stove.burnt) return;
    const current = stoveItems(stove);
    // 空灶台不算「续接」，否则会盖掉客人订单路径；空灶的配方放在其它组合里。
    if (current.length === 0) return;
    for (const recipe of COMBO_RECIPES) {
      if (!recipe.inputs.includes(itemId)) continue;
      if (!containsMultiset(recipe.inputs, [...current, itemId])) continue;
      if (available && !recipeReachable(recipe, available)) continue;
      const missing = missingInputs(recipe.inputs, [...current, itemId]);
      pushUnique(cards, {
        kind: 'stove',
        recipe,
        stoveIndex: index,
        score: 100 + recipe.inputs.length,
        title: `灶台 ${index + 1} 可接着做`,
        detail:
          missing.length > 0
            ? `还差 ${missing.map(ingredientName).join('、')} → ${ingredientName(recipe.output)}`
            : recipeHintText(recipe),
      });
    }
  });

  for (const customer of customers) {
    customer.orders.forEach((orderId, orderIndex) => {
      if (customer.servedQuality[orderIndex] !== null) return;
      for (const recipe of recipesInTree(orderId)) {
        if (!recipe.inputs.includes(itemId)) continue;
        if (available && !recipeReachable(recipe, available)) continue;
        pushUnique(cards, {
          kind: 'customer',
          recipe,
          customerId: customer.id,
          score: 80 + (recipe.output === orderId ? 8 : 0),
          title: `客人 ${customer.id} 要${findMenuItem(orderId)?.name ?? orderId}`,
          detail: `下一步：${recipeHintText(recipe)}`,
        });
      }
    });
  }

  for (const recipe of COMBO_RECIPES) {
    if (!recipe.inputs.includes(itemId)) continue;
    if (available && !recipeReachable(recipe, available)) continue;
    pushUnique(cards, {
      kind: 'combo',
      recipe,
      score: 10 + recipe.inputs.length,
      title: '其它组合',
      detail: recipeHintText(recipe),
    });
  }

  return cards.sort((a, b) => b.score - a.score).slice(0, 3);
}

/** 拖动成品菜时的上菜建议。 */
export function adviceForDish(
  dishId: string,
  quality: number,
  customers: readonly AdviceCustomer[],
): AdviceCard[] {
  const cards: AdviceCard[] = [];
  const recipe = COMBO_RECIPES.find((item) => item.output === dishId);
  if (!recipe) return cards;
  for (const customer of customers) {
    customer.orders.forEach((orderId, index) => {
      if (orderId !== dishId || customer.servedQuality[index] !== null) return;
      const coins = Math.round((findMenuItem(dishId)?.coins ?? 0) * quality);
      pushUnique(cards, {
        kind: 'customer',
        recipe,
        customerId: customer.id,
        score: 100,
        title: `客人 ${customer.id} 正需要`,
        detail: `现在上菜约 ${coins} 王都币`,
      });
    });
  }
  return cards.sort((a, b) => b.score - a.score).slice(0, 3);
}
