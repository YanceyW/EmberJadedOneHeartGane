import { describe, expect, it } from 'vitest';
import type { Renderer } from '../src/core/render/renderer';
import { COMBO_RECIPES } from '../src/games/restaurant/data/combos';
import { createRestaurantSave } from '../src/games/restaurant/systems/save';
import { createShift, shiftSupplySlots } from '../src/games/restaurant/systems/shift';
import { RestaurantView } from '../src/games/restaurant/view/restaurant-view';
import { createRanchSave } from '../src/games/ranch/systems/ranch';
import { RanchView } from '../src/games/ranch/view/ranch-view';

function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => gradient;
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'canvas') return {};
      if (prop in target) return target[prop];
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function fakeRenderer(height = 1624): Renderer {
  return {
    ctx: fakeContext(),
    width: 750,
    height,
    safeTop: 88,
    safeBottom: 68,
    capsuleBottom: 164,
  } as unknown as Renderer;
}

describe('game view render smoke', () => {
  it('renders every restaurant page without throwing', () => {
    const view = new RestaurantView();
    const renderer = fakeRenderer();
    const save = createRestaurantSave();
    const state = {
      save,
      store: { flour: 2, water: 1, egg: 2, tomato: 2, noodle: 1 },
      coins: 300,
      message: '测试提示',
      counter: save.counter,
      stoves: save.stoves,
      suggestions: [],
      ghost: null,
      selectedCounter: null,
      selectedStove: null,
      exitPanel: false,
      exitPenalty: 0,
      supplyRail: shiftSupplySlots(['wheat', 'egg']),
      supplyScroll: 0,
      supplyScrollMax: 0,
    };
    expect(() => {
      view.render(renderer, state, 'kitchen', 'farm', null, null, null);
      state.ghost = { index: 0, recipe: COMBO_RECIPES[0] };
      view.render(renderer, state, 'kitchen', 'farm', null, null, null);
      state.ghost = null;
      view.render(renderer, state, 'order', 'farm', null, null, null);
      const shift = createShift(42);
      shift.customers.push({
        id: 1,
        seat: 0,
        orders: ['tomato-egg', 'spring-noodle'],
        servedQuality: [null, null],
        patience: 30,
        patienceMax: 40,
        eating: 0,
      });
      shift.counter[0] = 'tomato';
      shift.stoves[0].ready = { output: 'tomato-egg', age: 0, inputCount: 2 };
      shift.prepared[0] = { id: 'spring-noodle', quality: 1 };
      view.render(renderer, state, 'shift', 'farm', shift, 0, null);
      expect(view.hitTest(90, 1470)?.kind).toBe('palette');
      expect(view.hitTest(646, 1430)).toEqual({ kind: 'supply-arrow', direction: -1 });
      expect(view.hitTest(678, 1430)).toEqual({ kind: 'supply-arrow', direction: 1 });
      const legacyState = {
        ...state,
        supplyRail: undefined,
        supplyScroll: undefined,
      } as unknown as typeof state;
      view.render(renderer, legacyState, 'shift', 'farm', shift, 0, null);
      view.drawSettle(renderer.ctx, renderer.width, renderer.height, {
        revenue: 120,
        penalty: 0,
        netRevenue: 120,
        walletLoss: 0,
        perfect: true,
        delivered: 3,
        servedCustomers: 2,
        bestCombo: 2,
        lost: 1,
        rating: 'B',
        prosperity: 1,
        averageQuality: 0.85,
        burnt: 1,
        recycledFeed: 2,
      });
    }).not.toThrow();

    const short = fakeRenderer(1334);
    expect(() => {
      view.render(short, state, 'kitchen', 'farm', null, null, null);
      const shift = createShift(43);
      shift.customers.push({
        id: 2,
        seat: 1,
        orders: ['mixed-noodle', 'spring-noodle', 'tomato-noodle', 'ricemilk', 'egg-noodle'],
        servedQuality: [null, 0.75, null, null, null],
        patience: 30,
        patienceMax: 60,
        eating: 0,
      });
      view.render(short, state, 'shift', 'farm', shift, null, null);
    }).not.toThrow();
  });

  it('renders the ranch and reports the buy hit targets', () => {
    const view = new RanchView();
    const renderer = fakeRenderer();
    const save = createRanchSave();
    expect(() =>
      view.render(renderer, save, { feed: 2 }, 500, Date.now(), 1, '测试', false),
    ).not.toThrow();
    expect(view.hitTest(400, 500)).not.toBeNull();
    expect(view.hitTest(0, 0)).toBeNull();
  });
});
