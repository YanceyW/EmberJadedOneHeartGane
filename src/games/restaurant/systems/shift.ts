import {
  INGREDIENTS,
  IngredientDef,
  findIngredient,
} from '../../../shared/content/ingredients';
import { MENU, MenuItemDef, findMenuItem } from '../../../shared/content/menu';
import { COMBO_RECIPES, recipeSteps } from '../data/combos';
import { CounterCells, emptyCounter } from './counter';
import {
  StoveEvent,
  StoveState,
  collectStove,
  createStoves,
  qualityForStove,
  tickStove,
} from './stove';

/**
 * 营业：客人排成一排，吧台无限供应清水与已解锁原材料。
 * 玩家在备料台/3×3 灶眼现做，成品先放配料区，或直接拖给客人。
 * 营业仍然不读写王都仓库，避免小游戏掏空玩家囤货。
 */

export const SHIFT_SEATS = 3;
export const SHIFT_EAT_SECONDS = 2.5;
export const SHIFT_LEAVE_PENALTY = 8;
export const SHIFT_PREPARED_SLOTS = 6;

/** 新号只有清水；其余原材料要靠农牧场首次收获解锁。 */
export const SHIFT_BASE_SUPPLY: readonly string[] = ['water'];

export type ShiftSupplySource = 'base' | 'farm' | 'garden' | 'ranch';

export interface ShiftSupplySlot {
  id: string;
  unlocked: boolean;
  source: ShiftSupplySource;
}

/** 营业可无限取用的原材料：作物、花卉、牧场产物；半成品/成菜必须现做。 */
export const SHIFT_RAW_IDS: readonly string[] = INGREDIENTS
  .filter((item) => item.kind === 'crop' || item.kind === 'flower' || item.kind === 'ranch')
  .map((item) => item.id);

/** 默认完整供应，仅为测试/旧调用保留；实际营业由 profile 解锁列表决定。 */
export const SHIFT_SUPPLY: readonly string[] = ['water', ...SHIFT_RAW_IDS];

/** 旧版牧场供应常量，保留给外部引用；新逻辑不再直接使用。 */
export const SHIFT_RANCH_SUPPLY: readonly string[] = ['egg', 'milk'];

export function shiftSupplyFromUnlocks(unlocks: readonly string[]): string[] {
  const owned = new Set(unlocks);
  return ['water', ...SHIFT_RAW_IDS.filter((id) => owned.has(id))];
}

export function shiftSupplySlots(unlocks: readonly string[]): ShiftSupplySlot[] {
  const unlocked = new Set(shiftSupplyFromUnlocks(unlocks));
  const sourceOf = (item: IngredientDef): ShiftSupplySource => {
    if (item.id === 'water') return 'base';
    if (item.kind === 'flower') return 'garden';
    if (item.kind === 'ranch') return 'ranch';
    return 'farm';
  };
  const slot = (id: string): ShiftSupplySlot | null => {
    const item = findIngredient(id);
    return item ? { id, unlocked: unlocked.has(id), source: sourceOf(item) } : null;
  };
  const all = ['water', ...SHIFT_RAW_IDS]
    .map(slot)
    .filter((item): item is ShiftSupplySlot => Boolean(item));
  return [
    ...all.filter((item) => item.unlocked),
    ...all.filter((item) => !item.unlocked),
  ];
}

function canCraftFromSupply(
  id: string,
  supply: readonly string[],
  visiting = new Set<string>(),
): boolean {
  if (supply.includes(id)) return true;
  if (visiting.has(id)) return false;
  const recipe = COMBO_RECIPES.find((item) => item.output === id);
  if (!recipe) return false;
  visiting.add(id);
  const ok = recipe.inputs.every((input) => canCraftFromSupply(input, supply, visiting));
  visiting.delete(id);
  return ok;
}

export interface ShiftOrderDef {
  item: MenuItemDef;
  steps: number;
}

/** 只收能从给定供应递归做出来、且步数在 1–6 的菜。 */
export function buildShiftOrderPool(
  supply: readonly string[],
): ShiftOrderDef[] {
  return MENU
    .filter((item) => canCraftFromSupply(item.id, supply))
    .map((item) => ({ item, steps: recipeSteps(item.id) }))
    .filter((entry) => entry.steps >= 1 && entry.steps <= 6);
}

export const SHIFT_ORDER_POOL: readonly ShiftOrderDef[] = buildShiftOrderPool(SHIFT_SUPPLY);

export const SHIFT_ORDER_IDS: readonly string[] = SHIFT_ORDER_POOL.map((entry) => entry.item.id);

export function findShiftOrder(id: string): MenuItemDef | undefined {
  return SHIFT_ORDER_IDS.includes(id) ? findMenuItem(id) : undefined;
}

export interface PreparedDish {
  id: string;
  /** 1 / 0.75 / 0.5 / 0.25，成品柜锁定，不再继续焦糊。 */
  quality: number;
}

export interface ShiftCustomer {
  id: number;
  seat: number;
  /** 1–5 道菜/饮品；同一道菜可以点多份。 */
  orders: string[];
  /** 每道菜的上菜品质；null 表示还没上。 */
  servedQuality: Array<number | null>;
  patience: number;
  patienceMax: number;
  /** > 0 表示已经上齐，正在吃。 */
  eating: number;
}

export interface ShiftState {
  seed: number;
  rng: number;
  elapsed: number;
  spawnTimer: number;
  customers: ShiftCustomer[];
  nextId: number;
  /** 端出的菜数（含多道订单的每一道）。 */
  delivered: number;
  /** 完整接待的客人数。 */
  servedCustomers: number;
  lost: number;
  revenue: number;
  combo: number;
  bestCombo: number;
  finished: boolean;
  /** 打烊中：不再新增客人，服务完当前客人后结算。 */
  closing: boolean;
  /** 打烊期间客人流失累计的罚款，结算时一次性扣。 */
  closingPenalty: number;
  tier: number;
  /** 本局可无限取用的原材料：清水 + 已解锁 crop/flower/ranch。 */
  supply: readonly string[];
  orderPool: ShiftOrderDef[];
  counter: CounterCells;
  stoves: StoveState[];
  prepared: Array<PreparedDish | null>;
  /** 清掉的焦炭可以回收成饲料，打烊时统一入仓库。 */
  recycledFeed: number;
  burnt: number;
  qualitySum: number;
  qualityCount: number;
}

export type ShiftEvent =
  | { kind: 'spawn'; customer: ShiftCustomer }
  | { kind: 'paid'; customer: ShiftCustomer; coins: number; quality: number }
  | { kind: 'left'; customer: ShiftCustomer; penalty: number; paid: number }
  | { kind: 'stove'; index: number; event: StoveEvent };

function nextRandom(state: ShiftState): number {
  let value = state.rng | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rng = value | 0;
  return ((value >>> 0) % 100000) / 100000;
}

export function createShift(
  seed: number,
  supply: readonly string[] = SHIFT_SUPPLY,
): ShiftState {
  const safeSeed = (seed | 0) || 0x2f6b1a3d;
  const safeSupply = [...new Set(supply)];
  return {
    seed: safeSeed,
    rng: safeSeed,
    elapsed: 0,
    spawnTimer: 2.2,
    customers: [],
    nextId: 1,
    delivered: 0,
    servedCustomers: 0,
    lost: 0,
    revenue: 0,
    combo: 0,
    bestCombo: 0,
    finished: false,
    closing: false,
    closingPenalty: 0,
    tier: 0,
    supply: safeSupply,
    orderPool: buildShiftOrderPool(safeSupply),
    counter: emptyCounter(),
    stoves: createStoves(),
    prepared: new Array<PreparedDish | null>(SHIFT_PREPARED_SLOTS).fill(null),
    recycledFeed: 0,
    burnt: 0,
    qualitySum: 0,
    qualityCount: 0,
  };
}

export function shiftTier(state: ShiftState): number {
  if (state.servedCustomers < 3) return 0;
  return Math.min(5, Math.floor(state.elapsed / 150) + Math.floor(state.servedCustomers / 20));
}

function pickItemCount(state: ShiftState, tier: number): number {
  // 用 20 个槽位的权重表，避免 5 道订单出现得太频繁。
  const table: Record<number, number[]> = {
    0: [1],
    1: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
    2: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3],
    3: [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
    4: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5],
    5: [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5],
  };
  const values = table[Math.max(0, Math.min(5, tier))] ?? [1];
  return values[Math.min(values.length - 1, Math.floor(nextRandom(state) * values.length))];
}

function pickOrderId(state: ShiftState): string | null {
  const easy = state.servedCustomers < 3;
  const buckets: Array<{ min: number; max: number; weight: number }> = easy
    ? [{ min: 1, max: 2, weight: 1 }]
    : [
        { min: 1, max: 2, weight: 30 },
        { min: 3, max: 3, weight: 40 },
        { min: 4, max: 4, weight: 25 },
        { min: 5, max: 6, weight: 5 },
      ];
  const total = buckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  let roll = nextRandom(state) * total;
  let chosen = buckets[0];
  for (const bucket of buckets) {
    roll -= bucket.weight;
    if (roll <= 0) {
      chosen = bucket;
      break;
    }
  }
  const all = state.orderPool;
  const candidates = all.filter(
    (entry) => entry.steps >= chosen.min && entry.steps <= chosen.max,
  );
  const pool = candidates.length > 0 ? candidates : all;
  if (pool.length === 0) return null;
  const index = Math.min(pool.length - 1, Math.floor(nextRandom(state) * pool.length));
  return pool[index]?.item.id ?? null;
}

function spawnCustomer(state: ShiftState): ShiftCustomer | null {
  if (state.orderPool.length === 0) return null;
  const taken = new Set(state.customers.map((customer) => customer.seat));
  let seat = -1;
  for (let i = 0; i < SHIFT_SEATS; i += 1) {
    if (!taken.has(i)) {
      seat = i;
      break;
    }
  }
  if (seat < 0) return null;

  state.tier = shiftTier(state);
  const itemCount = pickItemCount(state, state.tier);
  const orders: string[] = [];
  for (let i = 0; i < itemCount; i += 1) {
    const id = pickOrderId(state);
    if (id) orders.push(id);
  }
  if (orders.length === 0) return null;
  const totalSteps = orders.reduce((sum, id) => sum + recipeSteps(id), 0);
  const patienceMax = Math.max(
    38,
    35 + totalSteps * 5 + itemCount * 5 - state.tier * 2,
  );
  const customer: ShiftCustomer = {
    id: state.nextId,
    seat,
    orders,
    servedQuality: new Array<number | null>(orders.length).fill(null),
    patience: patienceMax,
    patienceMax,
    eating: 0,
  };
  state.nextId += 1;
  return customer;
}

export type ServeShiftResult =
  | 'ok'
  | 'partial'
  | 'mismatch'
  | 'eating'
  | 'missing'
  | 'done'
  | 'empty';

function averageQuality(customer: ShiftCustomer): number {
  const served = customer.servedQuality.filter((quality): quality is number => quality !== null);
  if (served.length === 0) return 0;
  return served.reduce((sum, quality) => sum + quality, 0) / served.length;
}

function orderBaseValue(customer: ShiftCustomer): number {
  return customer.orders.reduce((sum, id) => sum + (findMenuItem(id)?.coins ?? 0), 0);
}

function serveDishToCustomer(
  state: ShiftState,
  customerId: number,
  dish: PreparedDish,
): ServeShiftResult {
  if (state.finished) return 'done';
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) return 'missing';
  if (customer.eating > 0) return 'eating';
  const index = customer.orders.findIndex(
    (id, orderIndex) => id === dish.id && customer.servedQuality[orderIndex] === null,
  );
  if (index < 0) return 'mismatch';
  customer.servedQuality[index] = dish.quality;
  customer.patience = Math.max(customer.patience, 8);
  state.delivered += 1;
  state.qualitySum += dish.quality;
  state.qualityCount += 1;
  if (dish.quality < 0.5) {
    state.combo = 0;
  } else {
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
  }
  const complete = customer.servedQuality.every((quality) => quality !== null);
  if (complete) {
    customer.eating = SHIFT_EAT_SECONDS;
    return 'ok';
  }
  return 'partial';
}

/** 从配料区取一份端给客人。 */
export function serveFromPrepared(
  state: ShiftState,
  customerId: number,
  slot: number,
): ServeShiftResult {
  if (state.finished) return 'done';
  const dish = state.prepared[slot];
  if (!dish) return 'empty';
  const result = serveDishToCustomer(state, customerId, dish);
  if (result === 'ok' || result === 'partial') state.prepared[slot] = null;
  return result;
}

/** 灶台上刚出锅的菜直接拖给客人。 */
export function serveFromStove(
  state: ShiftState,
  customerId: number,
  stoveIndex: number,
): ServeShiftResult {
  if (state.finished) return 'done';
  const stove = state.stoves[stoveIndex];
  if (!stove?.ready) return 'empty';
  const dish: PreparedDish = {
    id: stove.ready.output,
    quality: qualityForStove(stove),
  };
  if (dish.quality <= 0) {
    stove.ready = null;
    stove.burnt = true;
    return 'empty';
  }
  const result = serveDishToCustomer(state, customerId, dish);
  if (result === 'ok' || result === 'partial') stove.ready = null;
  return result;
}

/** 把灶台成品放进配料区；指定空格时优先放指定格。 */
export function storePrepared(
  state: ShiftState,
  stoveIndex: number,
  targetSlot?: number,
): { slot: number; dish: PreparedDish } | null {
  if (state.finished) return null;
  const preferred =
    targetSlot !== undefined &&
    targetSlot >= 0 &&
    targetSlot < state.prepared.length &&
    !state.prepared[targetSlot]
      ? targetSlot
      : -1;
  const emptySlot = preferred >= 0 ? preferred : state.prepared.findIndex((dish) => !dish);
  if (emptySlot < 0) return null;
  const stove = state.stoves[stoveIndex];
  if (!stove) return null;
  const dish = collectStove(stove);
  if (!dish) return null;
  state.prepared[emptySlot] = dish;
  return { slot: emptySlot, dish };
}

export function discardPrepared(state: ShiftState, slot: number): PreparedDish | null {
  const dish = state.prepared[slot];
  if (!dish) return null;
  state.prepared[slot] = null;
  return dish;
}

export interface ShiftSummary {
  revenue: number;
  penalty: number;
  /** 营业额 - 罚款；允许为负。 */
  netRevenue: number;
  /** 实际从王都币扣掉的金额，由控制器结算时填写。 */
  walletLoss: number;
  perfect: boolean;
  delivered: number;
  servedCustomers: number;
  bestCombo: number;
  lost: number;
  rating: 'S' | 'A' | 'B' | 'C';
  prosperity: number;
  averageQuality: number;
  burnt: number;
  recycledFeed: number;
}

export function unservedCustomers(state: ShiftState): number {
  return state.customers.filter((customer) =>
    customer.servedQuality.some((quality) => quality === null),
  ).length;
}

export function unservedValue(state: ShiftState): number {
  let total = 0;
  for (const customer of state.customers) {
    customer.orders.forEach((id, index) => {
      if (customer.servedQuality[index] !== null) return;
      total += findMenuItem(id)?.coins ?? 0;
    });
  }
  return total;
}

export function exitPenalty(state: ShiftState): number {
  return 5 * unservedCustomers(state) + Math.round(unservedValue(state) * 0.3);
}

/** 进入打烊中：停止新增客人，但保留现有客人。 */
export function startClosing(state: ShiftState): boolean {
  if (state.finished || state.closing) return false;
  state.closing = true;
  return true;
}

export function settleShift(state: ShiftState, penalized = false): ShiftSummary {
  state.finished = true;
  // 打烊时正在吃/已上齐的客人照常付款，不能因为关店吞掉这一单。
  for (const customer of [...state.customers]) {
    if (customer.eating > 0 || customer.servedQuality.every((quality) => quality !== null)) {
      state.revenue += payCustomer(state, customer);
      state.servedCustomers += 1;
      state.customers = state.customers.filter((item) => item.id !== customer.id);
    }
  }
  const revenue = Math.max(0, Math.floor(state.revenue));
  const penalty = state.closingPenalty + (penalized ? exitPenalty(state) : 0);
  const netRevenue = revenue - penalty;
  const perfect =
    state.closing && !penalized && state.lost === 0 && state.customers.length === 0;
  const minutes = Math.max(1 / 60, state.elapsed / 60);
  const revenuePerMinute = revenue / minutes;
  const serviceRate =
    state.servedCustomers + state.lost > 0
      ? state.servedCustomers / (state.servedCustomers + state.lost)
      : 1;
  const rating: ShiftSummary['rating'] =
    serviceRate >= 0.9 && revenuePerMinute >= 180
      ? 'S'
      : serviceRate >= 0.75 && revenuePerMinute >= 120
        ? 'A'
        : serviceRate >= 0.5
          ? 'B'
          : 'C';
  return {
    revenue,
    penalty,
    netRevenue,
    walletLoss: 0,
    perfect,
    delivered: state.delivered,
    servedCustomers: state.servedCustomers,
    bestCombo: state.bestCombo,
    lost: state.lost,
    rating,
    prosperity: Math.floor(state.servedCustomers / 3),
    averageQuality:
      state.qualityCount > 0 ? state.qualitySum / state.qualityCount : 0,
    burnt: state.burnt,
    recycledFeed: state.recycledFeed,
  };
}

function payCustomer(state: ShiftState, customer: ShiftCustomer): number {
  const base = customer.orders.reduce(
    (sum, id, index) => sum + (findMenuItem(id)?.coins ?? 0) * (customer.servedQuality[index] ?? 0),
    0,
  );
  const ratio = customer.patienceMax > 0 ? customer.patience / customer.patienceMax : 0;
  const avg = averageQuality(customer);
  const tip =
    avg < 0.5
      ? 0
      : Math.round(orderBaseValue(customer) * Math.max(0, ratio) * 0.3 * avg);
  const bonus = Math.min(18, state.combo * 2) + customer.orders.length * 6;
  return Math.max(0, Math.round(base + tip + bonus));
}

/** 推进一步（dt 秒），把发生的事按顺序返回给上层做动画/音效。 */
export function advanceShift(state: ShiftState, dt: number): ShiftEvent[] {
  const events: ShiftEvent[] = [];
  if (state.finished) return events;
  const step = Math.max(0, Math.min(0.5, dt));
  state.elapsed += step;

  state.stoves.forEach((stove, index) => {
    for (const event of tickStove(stove, step)) {
      if (event === 'burnt') state.burnt += 1;
      events.push({ kind: 'stove', index, event });
    }
  });

  for (const customer of [...state.customers]) {
    if (customer.eating > 0) {
      customer.eating -= step;
      if (customer.eating <= 0) {
        const coins = payCustomer(state, customer);
        state.revenue += coins;
        state.servedCustomers += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.customers = state.customers.filter((item) => item.id !== customer.id);
        events.push({
          kind: 'paid',
          customer,
          coins,
          quality: averageQuality(customer),
        });
      }
      continue;
    }

    customer.patience -= step;
    if (customer.patience <= 0) {
      let paid = 0;
      let unserved = 0;
      customer.orders.forEach((id, index) => {
        const quality = customer.servedQuality[index];
        if (quality === null) {
          unserved += findMenuItem(id)?.coins ?? 0;
          return;
        }
        paid += Math.round((findMenuItem(id)?.coins ?? 0) * quality * 0.5);
      });
      state.revenue += paid;
      state.lost += 1;
      state.combo = 0;
      const leavePenalty = state.closing
        ? Math.round(unserved * 0.3)
        : SHIFT_LEAVE_PENALTY;
      if (state.closing) state.closingPenalty += leavePenalty;
      else state.revenue = Math.max(0, state.revenue - leavePenalty);
      state.customers = state.customers.filter((item) => item.id !== customer.id);
      events.push({
        kind: 'left',
        customer,
        penalty: leavePenalty,
        paid,
      });
    }
  }

  state.tier = shiftTier(state);
  if (!state.closing) {
    state.spawnTimer -= step;
    if (state.spawnTimer <= 0) {
      const customer = spawnCustomer(state);
      if (customer) {
        state.customers.push(customer);
        events.push({ kind: 'spawn', customer });
        state.spawnTimer = Math.max(5, 8 - state.tier * 0.6);
      } else {
        state.spawnTimer = 1;
      }
    }
  }

  return events;
}

export function shiftAverageQuality(state: ShiftState): number {
  return state.qualityCount > 0 ? state.qualitySum / state.qualityCount : 0;
}

/** 一局用日期 + 场次做种子，可复现、可单测。 */
export function shiftSeed(dayKey: string, shifts: number): number {
  let value = 0x811c9dc5;
  const text = `shift:${dayKey}:${shifts}`;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value || 1;
}
