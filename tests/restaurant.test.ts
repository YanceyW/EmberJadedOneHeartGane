import { describe, expect, it } from 'vitest';
import {
  COMBO_RECIPES,
  comboHintForOutput,
  comboKey,
  findCombo,
  findRecipeForShape,
  recipeSteps,
} from '../src/games/restaurant/data/combos';
import { DISH_MENU, MENU } from '../src/shared/content/menu';
import { findIngredient } from '../src/shared/content/ingredients';
import { canServeTable, serveTable, tableItem } from '../src/games/restaurant/systems/orders';
import {
  RESTAURANT_DAILY_GOAL,
  RESTAURANT_DAILY_REWARD,
  claimRestaurantDaily,
  createRestaurantSave,
  ensureRestaurantDaily,
  migrateRestaurantSave,
  restaurantScore,
} from '../src/games/restaurant/systems/save';
import {
  addToCounter,
  emptyCounter,
  moveInCounter,
  removeFromCounter,
} from '../src/games/restaurant/systems/counter';
import {
  StoveState,
  addToStove,
  canUpgradeStove,
  clearBurnt,
  collectStove,
  createStove,
  detectShape,
  fireStove,
  matchStove,
  qualityForStove,
  tickStove,
} from '../src/games/restaurant/systems/stove';
import {
  SHIFT_BASE_SUPPLY,
  SHIFT_ORDER_IDS,
  SHIFT_SUPPLY,
  advanceShift,
  buildShiftOrderPool,
  createShift,
  serveFromPrepared,
  settleShift,
  shiftSupplyFromUnlocks,
  shiftSupplySlots,
  shiftTier,
  startClosing,
  storePrepared,
} from '../src/games/restaurant/systems/shift';
import {
  snapSupplyScroll,
  supplyRailMetrics,
} from '../src/games/restaurant/view/restaurant-view-data';
import { adviceForDish, adviceForItem } from '../src/games/restaurant/systems/advice';
import { contextAdvice } from '../src/games/restaurant/systems/context-advice';

function stoveWith(slots: Record<number, string>): StoveState {
  const stove = createStove();
  for (const [index, id] of Object.entries(slots)) addToStove(stove, Number(index), id);
  return stove;
}

function runStove(stove: StoveState, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.5) tickStove(stove, 0.5);
}

function runShift(shift: ReturnType<typeof createShift>, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.5) advanceShift(shift, 0.5);
}

describe('restaurant recipes', () => {
  it('keeps recipes, shapes and menu needs aligned', () => {
    const keys = new Set<string>();
    for (const recipe of COMBO_RECIPES) {
      const key = `${recipe.shape}:${comboKey(recipe.inputs)}`;
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
      expect(recipe.inputs.length).toBeGreaterThanOrEqual(2);
      expect(recipe.inputs.length).toBeLessThanOrEqual(4);
      expect(recipe.inputs.every((id) => findIngredient(id))).toBe(true);
      expect(findIngredient(recipe.output), recipe.output).toBeDefined();
      expect(recipe.output).not.toBe(recipe.inputs[0]);
      expect(recipe.seconds).toBeGreaterThan(0);
    }
    for (const item of MENU) {
      const recipes = COMBO_RECIPES.filter((recipe) => recipe.output === item.id);
      expect(recipes.length, item.id).toBeGreaterThan(0);
      const menuInputs = item.needs
        .flatMap((need) => new Array<string>(need.amount).fill(need.id))
        .sort();
      expect(
        recipes.some((recipe) => comboKey(recipe.inputs) === comboKey(menuInputs)),
        item.id,
      ).toBe(true);
    }
    expect(DISH_MENU.length).toBe(33);
    expect(findCombo('flour', 'water')?.output).toBe('noodle');
    expect(comboHintForOutput('tomato-noodle')).toContain('面粉+清水→挂面');
    expect(recipeSteps('mixed-noodle')).toBe(4);
    expect(recipeSteps('casserole-family')).toBe(6);
    expect(recipeSteps('four-treasure-noodle')).toBe(7);
  });

  it('supports same ingredients in different shapes', () => {
    const line = findRecipeForShape(['stock', 'noodle', 'egg'], 'line3');
    const l = findRecipeForShape(['stock', 'noodle', 'egg'], 'L3');
    expect(line?.output).toBe('mixed-noodle');
    expect(l?.output).toBe('three-delight-noodle');
  });
});

describe('restaurant counter', () => {
  it('keeps one item per cell and only moves', () => {
    const cells = emptyCounter();
    expect(addToCounter(cells, 0, 'flour')).toBe('placed');
    expect(addToCounter(cells, 0, 'water')).toBe('blocked');
    expect(moveInCounter(cells, 0, 1)).toBe('moved');
    expect(cells[1]).toBe('flour');
    expect(removeFromCounter(cells, 1)).toBe('flour');
    expect(cells[1]).toBeNull();
  });
});

describe('restaurant 3x3 stove', () => {
  it('recognizes domino, line, L, square and T shapes', () => {
    const domino = stoveWith({ 0: 'flour', 1: 'water' });
    expect(detectShape(domino.slots)).toBe('domino');
    expect(matchStove(domino)?.output).toBe('noodle');

    const line = stoveWith({ 0: 'stock', 1: 'noodle', 2: 'egg' });
    expect(detectShape(line.slots)).toBe('line3');
    expect(matchStove(line)?.output).toBe('mixed-noodle');

    const l = stoveWith({ 0: 'stock', 1: 'noodle', 3: 'egg' });
    expect(detectShape(l.slots)).toBe('L3');
    expect(matchStove(l)?.output).toBe('three-delight-noodle');

    const square = stoveWith({ 0: 'mixed-noodle', 1: 'stock', 3: 'mushroom', 4: 'egg' });
    expect(detectShape(square.slots)).toBe('square4');
    expect(matchStove(square)?.output).toBe('casserole-family');

    const t = stoveWith({ 0: 'mixed-noodle', 1: 'pork-broth', 2: 'egg', 4: 'mushroom' });
    expect(detectShape(t.slots)).toBe('T4');
    expect(matchStove(t)?.output).toBe('four-treasure-noodle');
  });

  it('rejects diagonal or wrong patterns without consuming items', () => {
    const diagonal = stoveWith({ 0: 'flour', 4: 'water' });
    expect(detectShape(diagonal.slots)).toBeNull();
    expect(matchStove(diagonal)).toBeUndefined();
    expect(diagonal.slots[0]).toBe('flour');

    const wrong = stoveWith({ 0: 'stock', 1: 'mushroom', 2: 'noodle', 4: 'egg' });
    expect(detectShape(wrong.slots)).toBe('T4');
    expect(matchStove(wrong)).toBeUndefined();
  });

  it('waits for a 3-input upgrade before firing a 2-input recipe', () => {
    const stove = createStove();
    addToStove(stove, 0, 'egg');
    addToStove(stove, 1, 'noodle');
    expect(matchStove(stove)?.output).toBe('egg-noodle');
    expect(canUpgradeStove(stove)).toBe(true);
    expect(stove.assembleLeft).toBeCloseTo(1.5);

    addToStove(stove, 2, 'stock');
    expect(matchStove(stove)?.output).toBe('mixed-noodle');
    expect(stove.assembleLeft).toBeCloseTo(0.4);
    expect(fireStove(stove)).toBe(true);
    expect(stove.cooking?.output).toBe('mixed-noodle');
    expect(stove.slots.every((id) => id === null)).toBe(true);
  });

  it('cooks, chars by degree, and lets the player collect or clear', () => {
    const stove = createStove();
    stove.ready = { output: 'noodle', age: 0, inputCount: 2 };
    expect(qualityForStove(stove)).toBe(1);
    stove.ready.age = 10.1;
    expect(qualityForStove(stove)).toBe(0.75);
    stove.ready.age = 15.1;
    expect(qualityForStove(stove)).toBe(0.5);
    stove.ready.age = 20.1;
    expect(qualityForStove(stove)).toBe(0.25);
    expect(collectStove(stove)).toEqual({ id: 'noodle', quality: 0.25 });
    expect(stove.ready).toBeNull();

    stove.ready = { output: 'noodle', age: 29.9, inputCount: 2 };
    runStove(stove, 1);
    expect(stove.burnt).toBe(true);
    expect(clearBurnt(stove)).toBe(true);
  });

  it('ticks a full cook from assembling to ready', () => {
    const stove = stoveWith({ 0: 'flour', 1: 'water' });
    runStove(stove, 1);
    expect(stove.cooking?.output).toBe('noodle');
    runStove(stove, 10);
    expect(qualityForStove(stove)).toBe(1);
    const dish = collectStove(stove);
    expect(dish?.id).toBe('noodle');
  });
});

describe('restaurant orders and save', () => {
  it('serves only from the finished stock and rotates the table', () => {
    const save = createRestaurantSave();
    const item = tableItem(save, 0);
    expect(item).toBeTruthy();
    const store: Record<string, number> = {};
    expect(canServeTable(save, 0, store)).toBe(false);
    expect(serveTable(save, 0, store)).toBeNull();

    store[item!.id] = 1;
    expect(canServeTable(save, 0, store)).toBe(true);
    const result = serveTable(save, 0, store);
    expect(result).toEqual({ item: item!, coins: item!.coins, prosperity: item!.prosperity });
    expect(store[item!.id]).toBe(0);
    expect(tableItem(save, 0)?.id).not.toBe(item!.id);
    expect(save.served).toBe(1);
    save.bestRevenue = 320;
    expect(restaurantScore(save)).toBe(item!.coins + 320);
  });

  it('resets the daily goal on a new day and pays it once', () => {
    const save = createRestaurantSave();
    expect(ensureRestaurantDaily(save, '2026-11-27')).toBe(true);
    expect(ensureRestaurantDaily(save, '2026-11-27')).toBe(false);
    save.dailyServed = RESTAURANT_DAILY_GOAL;
    expect(RESTAURANT_DAILY_REWARD).toEqual({ coins: 150, prosperity: 3 });
    expect(claimRestaurantDaily(save)).toEqual(RESTAURANT_DAILY_REWARD);
    expect(claimRestaurantDaily(save)).toBeNull();
    expect(ensureRestaurantDaily(save, '2026-11-28')).toBe(true);
    expect(save.dailyServed).toBe(0);
    expect(save.dailyClaimed).toBe(false);
  });

  it('migrates v3 craft and old combo ids into v5', () => {
    const save = migrateRestaurantSave({
      schemaVersion: 3,
      tables: ['spring-noodle', 'ricemilk', 'milk-pudding'],
      craft: [{ id: 'noodle', cookLeft: 1.2 }, { id: 'ghost', cookLeft: 0 }],
      discovered: ['combo-2', 'bad'],
      served: 7,
      totalCoins: 640,
    });
    expect(save.schemaVersion).toBe(6);
    expect(save.perfectCloses).toBe(0);
    expect(save.dailyServed).toBe(0);
    expect(save.dailyClaimed).toBe(false);
    expect(save.served).toBe(7);
    expect(save.totalCoins).toBe(640);
    expect(save.counter[0]).toBe('noodle');
    expect(save.counter[1]).toBeNull();
    expect(save.stoves).toHaveLength(2);
    expect(save.discovered).toEqual(['noodle']);
    expect(save.tables[1]).toBe('ricemilk');
  });
});

describe('restaurant shift', () => {
  it('builds the supply only from harvested raw ingredients', () => {
    expect(SHIFT_BASE_SUPPLY).toEqual(['water']);
    expect(buildShiftOrderPool(SHIFT_BASE_SUPPLY)).toEqual([]);

    const supply = shiftSupplyFromUnlocks(['wheat', 'lettuce', 'egg', 'flour', 'rose']);
    expect(supply).toEqual(['water', 'lettuce', 'wheat', 'rose', 'egg']);
    expect(supply).not.toContain('flour');

    const orderIds = buildShiftOrderPool(supply).map((entry) => entry.item.id);
    expect(orderIds).toContain('spring-noodle');
    expect(orderIds).not.toContain('tomato-egg');

    const fullIds = buildShiftOrderPool(SHIFT_SUPPLY).map((entry) => entry.item.id);
    expect(fullIds).toContain('tomato-egg');

    const base = createShift(12, SHIFT_BASE_SUPPLY);
    expect(base.supply).toEqual(['water']);
    expect(base.orderPool).toEqual([]);
  });

  it('spawns a 1-5 item order from the supply pool and pays after eating', () => {
    const shift = createShift(12345);
    runShift(shift, 3);
    expect(shift.customers.length).toBe(1);
    const customer = shift.customers[0];
    expect(customer.orders.length).toBeGreaterThanOrEqual(1);
    expect(customer.orders.length).toBeLessThanOrEqual(5);
    expect(customer.orders.every((id) => SHIFT_ORDER_IDS.includes(id))).toBe(true);
    expect(SHIFT_ORDER_IDS).toContain('casserole-family');
    expect(SHIFT_ORDER_IDS).toContain('pork-noodle');
    expect(SHIFT_ORDER_IDS).not.toContain('four-treasure-noodle');

    shift.prepared[0] = { id: customer.orders[0], quality: 1 };
    expect(serveFromPrepared(shift, customer.id, 0)).toBe('ok');
    expect(shift.delivered).toBe(1);
    runShift(shift, 3);
    expect(shift.revenue).toBeGreaterThan(0);
    expect(shift.servedCustomers).toBe(1);
    expect(shift.bestCombo).toBeGreaterThan(0);
  });

  it('gives each spawned customer a unique id', () => {
    const shift = createShift(31415, ['water', 'wheat', 'lettuce']);
    runShift(shift, 25);
    const ids = shift.customers.map((customer) => customer.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pays less when the dish is charred', () => {
    const high = createShift(999);
    const low = createShift(999);
    runShift(high, 3);
    runShift(low, 3);
    const highCustomer = high.customers[0];
    const lowCustomer = low.customers[0];
    high.prepared[0] = { id: highCustomer.orders[0], quality: 1 };
    low.prepared[0] = { id: lowCustomer.orders[0], quality: 0.5 };
    serveFromPrepared(high, highCustomer.id, 0);
    serveFromPrepared(low, lowCustomer.id, 0);
    runShift(high, 3);
    runShift(low, 3);
    expect(low.revenue).toBeLessThan(high.revenue);
  });

  it('pays partially for served dishes when a multi-item customer times out', () => {
    const shift = createShift(4242);
    shift.customers.push({
      id: 99,
      seat: 0,
      orders: ['spring-noodle', 'tomato-egg'],
      servedQuality: [0.5, null],
      patience: 0.1,
      patienceMax: 40,
      eating: 0,
    });
    advanceShift(shift, 0.2);
    expect(shift.lost).toBe(1);
    expect(shift.revenue).toBeGreaterThan(0);
    expect(shift.combo).toBe(0);
  });

  it('never ends on a timer; only settlement finishes it', () => {
    const shift = createShift(31);
    runShift(shift, 200);
    expect(shift.finished).toBe(false);
    const summary = settleShift(shift, false);
    expect(summary.penalty).toBe(0);
    expect(shift.finished).toBe(true);
  });

  it('applies an exit penalty for unserved customers', () => {
    const shift = createShift(2024);
    shift.customers.push({
      id: 7,
      seat: 0,
      orders: ['spring-noodle', 'tomato-egg'],
      servedQuality: [null, null],
      patience: 30,
      patienceMax: 40,
      eating: 0,
    });
    const normal = settleShift(shift, false);
    expect(normal.penalty).toBe(0);
    const penalized = settleShift({ ...shift, finished: false }, true);
    expect(penalized.penalty).toBeGreaterThan(0);
    expect(penalized.netRevenue).toBeLessThan(0);
    expect(penalized.perfect).toBe(false);
    expect(penalized.walletLoss).toBe(0);
  });

  it('enters closing without adding customers and settles perfectly when empty', () => {
    const shift = createShift(51, ['water', 'wheat', 'lettuce']);
    expect(startClosing(shift)).toBe(true);
    expect(startClosing(shift)).toBe(false);
    const before = shift.nextId;
    runShift(shift, 20);
    expect(shift.nextId).toBe(before);
    const summary = settleShift(shift, false);
    expect(summary.perfect).toBe(true);
    expect(summary.penalty).toBe(0);
    expect(summary.netRevenue).toBe(0);
  });

  it('charges 30% of unserved orders when a closing customer leaves', () => {
    const shift = createShift(52, ['water', 'wheat', 'lettuce']);
    shift.customers.push({
      id: 77,
      seat: 0,
      orders: ['spring-noodle'],
      servedQuality: [null],
      patience: 0.1,
      patienceMax: 40,
      eating: 0,
    });
    startClosing(shift);
    advanceShift(shift, 0.2);
    expect(shift.lost).toBe(1);
    expect(shift.closingPenalty).toBe(26);
    const summary = settleShift(shift, false);
    expect(summary.perfect).toBe(false);
    expect(summary.penalty).toBe(26);
    expect(summary.netRevenue).toBe(-26);
  });

  it('carries recycled feed into settlement', () => {
    const shift = createShift(88);
    shift.recycledFeed = 3;
    const summary = settleShift(shift, false);
    expect(summary.recycledFeed).toBe(3);
  });

  it('stores a ready stove dish with locked quality', () => {
    const shift = createShift(321);
    shift.stoves[0].ready = { output: 'spring-noodle', age: 0, inputCount: 2 };
    const result = storePrepared(shift, 0);
    expect(result?.dish).toEqual({ id: 'spring-noodle', quality: 1 });
    expect(shift.prepared[0]?.quality).toBe(1);
    expect(shift.stoves[0].ready).toBeNull();
  });

  it('ramps tier slowly and keeps orders within 1-5 items', () => {
    const shift = createShift(777);
    shift.elapsed = 600;
    shift.servedCustomers = 20;
    expect(shiftTier(shift)).toBeGreaterThan(0);
    runShift(shift, 30);
    for (const customer of shift.customers) {
      expect(customer.orders.length).toBeGreaterThanOrEqual(1);
      expect(customer.orders.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('restaurant supply rail', () => {
  it('puts unlocked slots first and locks the rest', () => {
    const slots = shiftSupplySlots(['wheat', 'rose', 'egg']);
    expect(slots[0]).toMatchObject({ id: 'water', unlocked: true, source: 'base' });
    const firstLocked = slots.findIndex((slot) => !slot.unlocked);
    expect(firstLocked).toBeGreaterThan(1);
    expect(slots.slice(0, firstLocked).every((slot) => slot.unlocked)).toBe(true);
    expect(slots.slice(firstLocked).every((slot) => !slot.unlocked)).toBe(true);
    expect(slots.some((slot) => slot.id === 'wheat' && slot.unlocked)).toBe(true);
    expect(slots.some((slot) => slot.id === 'rose' && slot.unlocked)).toBe(true);
    expect(slots.some((slot) => slot.id === 'egg' && slot.unlocked)).toBe(true);
    expect(slots.some((slot) => slot.id === 'flour')).toBe(false);
  });

  it('computes a horizontal scroll range with a two-row rail', () => {
    const slots = shiftSupplySlots([]);
    const metrics = supplyRailMetrics(slots.length, 654);
    expect(metrics.maxScroll).toBeGreaterThan(0);
    expect(metrics.chipW).toBeGreaterThan(0);
    expect(supplyRailMetrics(1, 654).maxScroll).toBe(0);

    const step = metrics.chipW + 6;
    expect(snapSupplyScroll(step * 2 + 3, slots.length, 654)).toBeCloseTo(step * 2);
    expect(snapSupplyScroll(99999, slots.length, 654)).toBeCloseTo(metrics.maxScroll);
  });
});

describe('restaurant advice', () => {
  it('prioritizes stove continuation, then customer paths', () => {
    const stove = stoveWith({ 0: 'mushroom' });
    const customer = { id: 1, orders: ['mixed-noodle'], servedQuality: [null] };
    const cards = adviceForItem('water', [stove], [customer]);
    expect(cards[0]?.kind).toBe('stove');
    expect(cards.some((card) => card.kind === 'customer')).toBe(true);

    const path = adviceForItem('water', [], [customer]);
    expect(path.some((card) => card.kind === 'customer')).toBe(true);
  });

  it('suggests duplicate-input recipes and counts the remaining copies', () => {
    const wheatStove = stoveWith({ 0: 'wheat' });
    const flourCards = adviceForItem('wheat', [wheatStove], []);
    expect(flourCards.some((card) => card.recipe.output === 'flour')).toBe(true);

    const roseStove = stoveWith({ 0: 'rose' });
    const cakeCards = adviceForItem('flour', [roseStove], []);
    const cake = cakeCards.find((card) => card.recipe.output === 'rose-cake');
    expect(cake?.detail).toContain('还差 面粉');
  });

  it('builds context advice from the selected counter item', () => {
    const counter = emptyCounter();
    counter[0] = 'wheat';
    const cards = contextAdvice({
      counter,
      stoves: [],
      customers: [],
      prepared: [],
      selectedCounter: 0,
      selectedPrepared: null,
      selectedStove: null,
      drag: null,
      dragId: null,
      dragQuality: undefined,
      available: new Set(['wheat']),
    });
    expect(cards.some((card) => card.recipe.output === 'flour')).toBe(true);
  });

  it('filters suggestions that cannot be made from the current supply', () => {
    const empty = adviceForItem('water', [], [], new Set(['water']));
    expect(empty).toEqual([]);
    const flour = adviceForItem('wheat', [], [], new Set(['wheat']));
    expect(flour.some((card) => card.recipe.output === 'flour')).toBe(true);
  });

  it('shows expected income when dragging a finished dish', () => {
    const cards = adviceForDish('mixed-noodle', 0.75, [
      { id: 2, orders: ['mixed-noodle'], servedQuality: [null] },
    ]);
    expect(cards[0]?.kind).toBe('customer');
    expect(cards[0]?.detail).toContain('王都币');
  });
});
