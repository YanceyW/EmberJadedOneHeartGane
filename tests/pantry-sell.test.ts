import { describe, expect, it } from 'vitest';
import {
  findIngredient,
  purchaseCost,
  purchasePrice,
  sellSelection,
  sellableValue,
} from '../src/shared/content/ingredients';

describe('pantry selling', () => {
  it('only sells what the player picked', () => {
    const pantry: Record<string, number> = { wheat: 3, tomato: 2, flour: 4, bun: 1 };
    const result = sellSelection(pantry, ['wheat']);
    expect(result).toEqual({ coins: 3 * 14, count: 3 });
    expect(pantry.wheat).toBe(0);
    expect(pantry.tomato).toBe(2);
    expect(pantry.flour).toBe(4);
    expect(pantry.bun).toBe(1);
  });

  it('handles several kinds, including dishes and flowers', () => {
    const pantry: Record<string, number> = { rose: 2, 'rose-cake': 1, tofu: 2 };
    const preview = sellableValue(pantry, ['rose', 'rose-cake', 'tofu']);
    const rosePrice = findIngredient('rose')!.sellPrice;
    const cakePrice = findIngredient('rose-cake')!.sellPrice;
    const tofuPrice = findIngredient('tofu')!.sellPrice;
    expect(preview.coins).toBe(rosePrice * 2 + cakePrice + tofuPrice * 2);
    expect(preview.count).toBe(5);
    expect(sellSelection(pantry, ['rose', 'rose-cake', 'tofu'])).toEqual(preview);
    expect(pantry.rose).toBe(0);
    expect(pantry['rose-cake']).toBe(0);
    expect(pantry.tofu).toBe(0);
  });

  it('ignores empty selections, unknown ids and zero amounts', () => {
    const pantry: Record<string, number> = { wheat: 0 };
    expect(sellSelection(pantry, [])).toEqual({ coins: 0, count: 0 });
    expect(sellSelection(pantry, ['wheat'])).toEqual({ coins: 0, count: 0 });
    expect(sellSelection(pantry, ['not-a-good'])).toEqual({ coins: 0, count: 0 });
    expect(pantry.wheat).toBe(0);
  });
});

describe('restocking prices', () => {
  it('charges three times the sell price, rounded to fives', () => {
    for (const item of ['wheat', 'flour', 'rose', 'osmanthus-cake']) {
      const price = purchasePrice(item);
      const sell = findIngredient(item)!.sellPrice;
      expect(price).toBeGreaterThanOrEqual(sell * 2.5);
      expect(price % 5).toBe(0);
    }
  });

  it('sums the whole need list for a full purchase', () => {
    const needs = [
      { id: 'wheat', amount: 2 },
      { id: 'garlic', amount: 1 },
    ];
    expect(purchaseCost(needs)).toBe(purchasePrice('wheat') * 2 + purchasePrice('garlic'));
  });
});
