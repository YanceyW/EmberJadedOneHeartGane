import {
  COMBO_RECIPES,
  ComboRecipe,
  RecipeShape,
  findRecipeForShape,
} from '../data/combos';
import { findIngredient } from '../../../shared/content/ingredients';

export const STOVE_COUNT = 2;
export const STOVE_COLS = 3;
export const STOVE_ROWS = 3;
export const STOVE_SLOTS = STOVE_COLS * STOVE_ROWS;
export const STOVE_MAX_INPUTS = 4;
export const STOVE_ASSEMBLY_UPGRADE = 1.5;
export const STOVE_ASSEMBLY_CONFIRM = 0.4;
export const STOVE_CHAR_SECONDS = 5;
export const STOVE_MAX_CHAR = 3;
export const STOVE_QUALITY_BY_CHAR = [1, 0.75, 0.5, 0.25] as const;

export interface StoveReady {
  output: string;
  /** 出锅后的秒数；品质由它和输入数推导。 */
  age: number;
  inputCount: number;
}

export interface StoveState {
  slots: Array<string | null>;
  assembling: boolean;
  assembleLeft: number;
  cooking: { output: string; left: number; inputCount: number } | null;
  ready: StoveReady | null;
  burnt: boolean;
}

export interface CollectedDish {
  id: string;
  quality: number;
}

export type StoveAction = 'placed' | 'matched' | 'blocked' | 'busy' | 'missing';

export function createStove(): StoveState {
  return {
    slots: new Array<string | null>(STOVE_SLOTS).fill(null),
    assembling: false,
    assembleLeft: 0,
    cooking: null,
    ready: null,
    burnt: false,
  };
}

export function createStoves(): StoveState[] {
  return Array.from({ length: STOVE_COUNT }, createStove);
}

export function migrateStoves(input: unknown): StoveState[] {
  const stoves = createStoves();
  if (!Array.isArray(input)) return stoves;
  for (let i = 0; i < STOVE_COUNT; i += 1) {
    const raw = input[i];
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const target = stoves[i];
    if (Array.isArray(item.slots)) {
      for (let slot = 0; slot < STOVE_SLOTS; slot += 1) {
        const id = item.slots[slot];
        if (typeof id === 'string' && findIngredient(id)) target.slots[slot] = id;
      }
    }
    target.assembling = item.assembling === true;
    target.assembleLeft = finite(item.assembleLeft, 0);
    const cooking = item.cooking as Record<string, unknown> | null | undefined;
    if (cooking && typeof cooking.output === 'string' && findIngredient(cooking.output)) {
      target.cooking = {
        output: cooking.output,
        left: Math.max(0, finite(cooking.left, 0)),
        inputCount: Math.max(2, Math.min(STOVE_MAX_INPUTS, finite(cooking.inputCount, 2))),
      };
    }
    const ready = item.ready as Record<string, unknown> | null | undefined;
    if (ready && typeof ready.output === 'string' && findIngredient(ready.output)) {
      target.ready = {
        output: ready.output,
        age: Math.max(0, finite(ready.age, 0)),
        inputCount: Math.max(2, Math.min(STOVE_MAX_INPUTS, finite(ready.inputCount, 2))),
      };
    }
    target.burnt = item.burnt === true;
  }
  return stoves;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function occupiedSlots(stove: StoveState): number[] {
  const result: number[] = [];
  for (let i = 0; i < stove.slots.length; i += 1) {
    if (stove.slots[i]) result.push(i);
  }
  return result;
}

export function stoveItems(stove: StoveState): string[] {
  return occupiedSlots(stove).map((index) => stove.slots[index] as string);
}

function row(index: number): number {
  return Math.floor(index / STOVE_COLS);
}

function col(index: number): number {
  return index % STOVE_COLS;
}

function orthAdjacent(a: number, b: number): boolean {
  return Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1;
}

function inSquareBlock(indices: number[], size: 2 | 3): boolean {
  const rows = indices.map(row);
  const cols = indices.map(col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  return maxRow - minRow + 1 === size && maxCol - minCol + 1 === size;
}

function isT4(indices: number[]): boolean {
  const set = new Set(indices);
  for (const index of indices) {
    let neighbors = 0;
    if (set.has(index - STOVE_COLS)) neighbors += 1;
    if (set.has(index + STOVE_COLS)) neighbors += 1;
    if (set.has(index - 1) && col(index) > 0) neighbors += 1;
    if (set.has(index + 1) && col(index) < STOVE_COLS - 1) neighbors += 1;
    if (neighbors === 3) return true;
  }
  return false;
}

/** 只看格子布局，不看材料；返回该布局对应的图案。 */
export function detectShape(slots: ReadonlyArray<string | null>): RecipeShape | null {
  const indices = slots
    .map((id, index) => (id ? index : -1))
    .filter((index) => index >= 0);
  if (indices.length === 2) {
    return orthAdjacent(indices[0], indices[1]) ? 'domino' : null;
  }
  if (indices.length === 3) {
    if (inSquareBlock(indices, 2)) return 'L3';
    const rows = indices.map(row);
    const cols = indices.map(col);
    const sameRow = rows.every((value) => value === rows[0]);
    const sameCol = cols.every((value) => value === cols[0]);
    if (sameRow) {
      const sorted = [...cols].sort((a, b) => a - b);
      if (sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1) return 'line3';
    }
    if (sameCol) {
      const sorted = [...rows].sort((a, b) => a - b);
      if (sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1) return 'line3';
    }
    return null;
  }
  if (indices.length === 4) {
    if (inSquareBlock(indices, 2)) return 'square4';
    if (isT4(indices)) return 'T4';
    return null;
  }
  return null;
}

export function matchStove(stove: StoveState): ComboRecipe | undefined {
  const shape = detectShape(stove.slots);
  if (!shape) return undefined;
  return findRecipeForShape(stoveItems(stove), shape);
}

/** 当前材料是否还存在「再加一件 / 两件」的更高级配方。 */
export function canUpgradeStove(stove: StoveState): boolean {
  const items = stoveItems(stove);
  if (items.length === 0 || items.length >= STOVE_MAX_INPUTS) return false;
  return stove.slots.some((id, index) => {
    if (id || !canPlaceShape(stove, index)) return false;
    return hasSupersetRecipe(items);
  });
}

function hasSupersetRecipe(items: string[]): boolean {
  // 这里只判断材料组合是否存在更长的配方；具体第三/第四件由玩家放。
  // 为了不把不相关的东西也当成可升级，遍历所有配方输入的多重集。
  for (const length of [3, 4]) {
    if (length <= items.length) continue;
    for (const recipe of COMBO_RECIPES) {
      if (recipe.inputs.length !== length) continue;
      if (containsMultiset(recipe.inputs, items)) return true;
    }
  }
  return false;
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

function canPlaceShape(stove: StoveState, index: number): boolean {
  if (stove.slots[index]) return false;
  const next = stove.slots.slice();
  next[index] = 'placeholder';
  return detectShape(next) !== null || occupiedSlots(stove).length < 2;
}

export function addToStove(stove: StoveState, index: number, id: string): StoveAction {
  if (!findIngredient(id)) return 'missing';
  if (stove.cooking || stove.ready || stove.burnt) return 'busy';
  if (index < 0 || index >= STOVE_SLOTS) return 'missing';
  if (stove.slots[index]) return 'blocked';
  if (occupiedSlots(stove).length >= STOVE_MAX_INPUTS) return 'blocked';
  stove.slots[index] = id;
  return refreshAssembly(stove);
}

export function moveInStove(stove: StoveState, from: number, to: number): StoveAction {
  if (stove.cooking || stove.ready || stove.burnt) return 'busy';
  if (from === to) return 'blocked';
  if (from < 0 || to < 0 || from >= STOVE_SLOTS || to >= STOVE_SLOTS) return 'missing';
  if (!stove.slots[from]) return 'missing';
  const temp = stove.slots[to];
  stove.slots[to] = stove.slots[from];
  stove.slots[from] = temp ?? null;
  return refreshAssembly(stove);
}

export function removeFromStove(stove: StoveState, index: number): string | null {
  if (stove.cooking || stove.ready || stove.burnt) return null;
  const id = stove.slots[index];
  if (!id) return null;
  stove.slots[index] = null;
  refreshAssembly(stove);
  return id;
}

function refreshAssembly(stove: StoveState): StoveAction {
  const recipe = matchStove(stove);
  if (!recipe) {
    stove.assembling = false;
    stove.assembleLeft = 0;
    return 'placed';
  }
  stove.assembling = true;
  stove.assembleLeft = canUpgradeStove(stove)
    ? STOVE_ASSEMBLY_UPGRADE
    : STOVE_ASSEMBLY_CONFIRM;
  return 'matched';
}

export function fireStove(stove: StoveState): boolean {
  if (!stove.assembling) return false;
  const recipe = matchStove(stove);
  if (!recipe) return false;
  stove.cooking = {
    output: recipe.output,
    left: cookSeconds(recipe),
    inputCount: recipe.inputs.length,
  };
  stove.slots.fill(null);
  stove.assembling = false;
  stove.assembleLeft = 0;
  return true;
}

export type StoveEvent = 'started' | 'ready' | 'burnt';

export function tickStove(stove: StoveState, dt: number): StoveEvent[] {
  const events: StoveEvent[] = [];
  const step = Math.max(0, Math.min(0.5, dt));
  if (step <= 0) return events;

  if (stove.assembling) {
    stove.assembleLeft = Math.max(0, stove.assembleLeft - step);
    if (stove.assembleLeft <= 0 && fireStove(stove)) events.push('started');
  }

  if (stove.cooking) {
    stove.cooking.left = Math.max(0, stove.cooking.left - step);
    if (stove.cooking.left <= 0) {
      stove.ready = {
        output: stove.cooking.output,
        age: 0,
        inputCount: stove.cooking.inputCount,
      };
      stove.cooking = null;
      events.push('ready');
    }
  }

  if (stove.ready) {
    stove.ready.age += step;
    if (stove.ready.age >= freshSeconds(stove.ready.inputCount) + STOVE_CHAR_SECONDS * (STOVE_MAX_CHAR + 1)) {
      stove.ready = null;
      stove.burnt = true;
      events.push('burnt');
    }
  }

  return events;
}

export function cookSeconds(recipe: ComboRecipe): number {
  return Math.max(3, recipe.seconds * 2.5);
}

export function freshSeconds(inputCount: number): number {
  if (inputCount >= 4) return 14;
  if (inputCount === 3) return 12;
  return 10;
}

export function qualityForStove(stove: StoveState): number {
  if (!stove.ready) return 0;
  const fresh = freshSeconds(stove.ready.inputCount);
  if (stove.ready.age <= fresh) return 1;
  const char = Math.floor((stove.ready.age - fresh) / STOVE_CHAR_SECONDS) + 1;
  if (char > STOVE_MAX_CHAR) return 0;
  return STOVE_QUALITY_BY_CHAR[char] ?? 0;
}

export function qualityLabel(quality: number): string {
  if (quality >= 0.99) return '正好 100%';
  if (quality >= 0.74) return '微焦 75%';
  if (quality >= 0.49) return '焦 50%';
  if (quality >= 0.24) return '糊 25%';
  return '焦炭';
}

export function collectStove(stove: StoveState): CollectedDish | null {
  if (!stove.ready) return null;
  const quality = qualityForStove(stove);
  const id = stove.ready.output;
  stove.ready = null;
  if (quality <= 0) {
    stove.burnt = true;
    return null;
  }
  return { id, quality };
}

export function clearBurnt(stove: StoveState): boolean {
  if (!stove.burnt) return false;
  stove.burnt = false;
  return true;
}

export function stoveBusy(stove: StoveState): boolean {
  return Boolean(stove.cooking || stove.ready || stove.burnt || stove.assembling);
}
