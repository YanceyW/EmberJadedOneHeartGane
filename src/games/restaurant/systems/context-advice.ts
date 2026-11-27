import { ComboRecipe } from '../data/combos';
import { AdviceCard, AdviceCustomer, adviceForDish, adviceForItem } from './advice';
import { CounterCells } from './counter';
import { PreparedDish, ShiftState } from './shift';
import { StoveState, qualityForStove, stoveItems } from './stove';

export interface AdviceDrag {
  kind: 'palette' | 'counter' | 'prepared' | 'stove' | 'stove-cell';
}

export interface ContextAdviceInput {
  counter: CounterCells;
  stoves: StoveState[];
  customers: readonly AdviceCustomer[];
  prepared: ReadonlyArray<PreparedDish | null>;
  selectedCounter: number | null;
  selectedPrepared: number | null;
  selectedStove: number | null;
  drag: AdviceDrag | null;
  dragId: string | null;
  dragQuality: number | undefined;
  available: ReadonlySet<string>;
}

export function collectAvailableIngredients(
  pantry: Record<string, number>,
  counter: CounterCells,
  stoves: readonly StoveState[],
  shift: ShiftState | null,
): ReadonlySet<string> {
  const available = new Set<string>(['water']);
  for (const [id, amount] of Object.entries(pantry)) {
    if (amount > 0) available.add(id);
  }
  for (const id of counter) if (id) available.add(id);
  for (const stove of stoves) {
    for (const id of stove.slots) if (id) available.add(id);
    if (stove.ready) available.add(stove.ready.output);
  }
  if (shift) {
    for (const id of shift.supply) available.add(id);
    for (const dish of shift.prepared) if (dish) available.add(dish.id);
  }
  return available;
}

export function ghostFor(
  itemId: string,
  cards: readonly AdviceCard[],
  stoves: readonly StoveState[],
): { index: number; recipe: ComboRecipe } | null {
  const card = cards.find((entry) => entry.recipe.inputs.includes(itemId));
  if (!card) return null;
  const index = stoves.findIndex(
    (stove) =>
      stoveItems(stove).length === 0 &&
      !stove.cooking &&
      !stove.ready &&
      !stove.burnt,
  );
  return index >= 0 ? { index, recipe: card.recipe } : null;
}

/** 把拖拽/点选状态翻译成最多 3 条上下文建议。 */
export function contextAdvice(input: ContextAdviceInput): AdviceCard[] {
  const {
    stoves,
    customers,
    prepared,
    selectedCounter,
    selectedPrepared,
    selectedStove,
    drag,
    dragId,
    dragQuality,
    available,
  } = input;

  if (drag) {
    if (!dragId) return [];
    if (drag.kind === 'prepared') {
      return adviceForPrepared(dragId, dragQuality ?? 1, stoves, customers, available);
    }
    if (drag.kind === 'stove') {
      return adviceForDish(dragId, dragQuality ?? 1, customers);
    }
    return adviceForItem(dragId, stoves, customers, available);
  }
  if (selectedCounter !== null) {
    const id = input.counter[selectedCounter];
    if (id) return adviceForItem(id, stoves, customers, available);
  }
  if (selectedPrepared !== null) {
    const dish = prepared[selectedPrepared];
    if (dish) return adviceForPrepared(dish.id, dish.quality, stoves, customers, available);
  }
  if (selectedStove !== null) {
    const stove = stoves[selectedStove];
    if (stove?.ready) {
      return adviceForDish(stove.ready.output, qualityForStove(stove), customers);
    }
    const first = stove ? stoveItems(stove)[0] : undefined;
    if (first) return adviceForItem(first, stoves, customers, available);
  }
  return [];
}

function adviceForPrepared(
  id: string,
  quality: number,
  stoves: readonly StoveState[],
  customers: readonly AdviceCustomer[],
  available: ReadonlySet<string>,
): AdviceCard[] {
  const merged = [
    ...adviceForItem(id, stoves, customers, available),
    ...adviceForDish(id, quality, customers),
  ];
  const seen = new Set<string>();
  return merged
    .sort((a, b) => b.score - a.score)
    .filter((card) => {
      const key = `${card.kind}:${card.recipe.id}:${card.stoveIndex ?? ''}:${card.customerId ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}
