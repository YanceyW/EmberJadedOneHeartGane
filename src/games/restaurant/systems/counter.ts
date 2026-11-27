import { findIngredient } from '../../../shared/content/ingredients';

/** 备料台：5×3，每格只放一件物品，不叠放、不在格内合成。 */
export const COUNTER_COLS = 5;
export const COUNTER_ROWS = 3;
export const COUNTER_SLOTS = COUNTER_COLS * COUNTER_ROWS;

export type CounterCells = Array<string | null>;

export type CounterAction = 'placed' | 'moved' | 'blocked' | 'missing';

export function emptyCounter(): CounterCells {
  return new Array<string | null>(COUNTER_SLOTS).fill(null);
}

export function migrateCounter(input: unknown): CounterCells {
  const cells = emptyCounter();
  if (!Array.isArray(input)) return cells;
  for (let i = 0; i < COUNTER_SLOTS; i += 1) {
    const raw = input[i];
    const id =
      typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).id === 'string'
          ? ((raw as Record<string, unknown>).id as string)
          : null;
    if (id && findIngredient(id)) cells[i] = id;
  }
  return cells;
}

export function firstEmptyCell(cells: CounterCells): number {
  return cells.findIndex((id) => !id);
}

export function addToCounter(cells: CounterCells, index: number, id: string): CounterAction {
  if (!findIngredient(id)) return 'missing';
  if (index < 0 || index >= cells.length) return 'missing';
  if (cells[index]) return 'blocked';
  cells[index] = id;
  return 'placed';
}

export function moveInCounter(cells: CounterCells, from: number, to: number): CounterAction {
  if (from === to) return 'blocked';
  if (from < 0 || to < 0 || from >= cells.length || to >= cells.length) return 'missing';
  const source = cells[from];
  if (!source) return 'missing';
  const target = cells[to];
  cells[to] = source;
  cells[from] = target ?? null;
  return 'moved';
}

export function removeFromCounter(cells: CounterCells, index: number): string | null {
  const id = cells[index] ?? null;
  if (!id) return null;
  cells[index] = null;
  return id;
}

export function counterCount(cells: CounterCells): number {
  return cells.filter(Boolean).length;
}
