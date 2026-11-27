import { ingredientName } from '../../shared/content/ingredients';
import { RestaurantHit } from './view/restaurant-types';
import { CounterCells, moveInCounter, removeFromCounter } from './systems/counter';
import {
  StoveState,
  collectStove,
  moveInStove,
  removeFromStove,
} from './systems/stove';
import {
  ShiftState,
  discardPrepared,
  storePrepared,
} from './systems/shift';

export type DropSource =
  | { kind: 'palette'; id: string }
  | { kind: 'counter'; index: number }
  | { kind: 'prepared'; index: number }
  | { kind: 'stove'; index: number }
  | { kind: 'stove-cell'; stoveIndex: number; cell: number };

export interface DropHost {
  shift(): ShiftState | null;
  counter(): CounterCells;
  stoves(): StoveState[];
  addFromPaletteAt(id: string, index: number): void;
  returnStoveItem(stoveIndex: number, cell: number): void;
  moveCounterToStove(counterIndex: number, stoveIndex: number, cell?: number): void;
  movePreparedToStove(preparedIndex: number, stoveIndex: number, cell?: number): void;
  collectFromStove(stoveIndex: number): void;
  serveCustomer(
    customerId: number,
    source: { kind: 'prepared'; index: number } | { kind: 'stove'; index: number },
  ): void;
  restorePantry(id: string): void;
  clearCounterSelection(): void;
  clearPreparedSelection(): void;
  feedbackDrop(x: number, y: number): void;
  feedbackInvalid(x: number, y: number): void;
  feedbackReward(x: number, y: number): void;
  toast(text: string): void;
  persist(): void;
}

/** 餐厅拖放路由；把备料台/灶台/成品柜/客人之间的组合目标集中在一处。 */
export function dropOnRestaurant(
  host: DropHost,
  source: DropSource,
  hit: RestaurantHit | null,
  x: number,
  y: number,
): void {
  if (!hit) return;
  if (hit.kind === 'counter') {
    if (source.kind === 'palette') {
      host.addFromPaletteAt(source.id, hit.index);
    } else if (source.kind === 'counter') {
      if (moveInCounter(host.counter(), source.index, hit.index) === 'moved') {
        host.clearCounterSelection();
        host.feedbackDrop(x, y);
        host.persist();
      }
    } else if (source.kind === 'stove-cell') {
      host.returnStoveItem(source.stoveIndex, source.cell);
    }
    return;
  }
  if (hit.kind === 'stove' || hit.kind === 'stove-fire') {
    const stoveIndex = hit.index;
    if (source.kind === 'palette') {
      host.toast('先把材料放到备料台，再拖进灶眼');
      host.feedbackInvalid(x, y);
      return;
    }
    if (source.kind === 'counter') {
      host.moveCounterToStove(
        source.index,
        stoveIndex,
        hit.kind === 'stove' ? hit.cell : undefined,
      );
      return;
    }
    if (source.kind === 'stove-cell') {
      const target = hit.kind === 'stove' ? hit.cell : undefined;
      if (source.stoveIndex === stoveIndex && target !== undefined) {
        const result = moveInStove(host.stoves()[stoveIndex], source.cell, target);
        if (result === 'placed' || result === 'matched') {
          host.feedbackDrop(x, y);
          host.persist();
        }
      }
      return;
    }
    if (source.kind === 'prepared' && host.shift()) {
      host.movePreparedToStove(
        source.index,
        stoveIndex,
        hit.kind === 'stove' ? hit.cell : undefined,
      );
      return;
    }
    if (source.kind === 'stove' && hit.kind === 'stove-fire') {
      host.collectFromStove(source.index);
    }
    return;
  }
  if (hit.kind === 'prepared') {
    const shift = host.shift();
    if (source.kind === 'stove' && shift) {
      const result = storePrepared(shift, source.index, hit.index);
      if (result) {
        host.feedbackReward(x, y);
        host.toast(`${ingredientName(result.dish.id)} 放进成品柜`);
      } else {
        host.toast('成品柜满了');
        host.feedbackInvalid(x, y);
      }
      return;
    }
    if (source.kind === 'prepared' && shift) {
      const from = shift.prepared[source.index];
      const to = shift.prepared[hit.index];
      if (from && !to) {
        shift.prepared[hit.index] = from;
        shift.prepared[source.index] = null;
        host.clearPreparedSelection();
        host.feedbackDrop(x, y);
      }
    }
    return;
  }
  if (hit.kind === 'customer') {
    if (source.kind === 'prepared' || source.kind === 'stove') {
      host.serveCustomer(hit.id, source);
    }
    return;
  }
  if (hit.kind === 'palette' || hit.kind === 'palette-bin') {
    const shift = host.shift();
    if (source.kind === 'counter') {
      const id = removeFromCounter(host.counter(), source.index);
      if (!id) return;
      if (!shift && id !== 'water') host.restorePantry(id);
      host.clearCounterSelection();
      host.feedbackDrop(x, y);
      host.toast(shift ? `丢掉 ${ingredientName(id)}` : `放回仓库：${ingredientName(id)}`);
      host.persist();
    } else if (source.kind === 'prepared' && shift) {
      const dish = discardPrepared(shift, source.index);
      if (dish) {
        host.clearPreparedSelection();
        host.feedbackDrop(x, y);
        host.toast(`丢掉 ${ingredientName(dish.id)}`);
      }
    } else if (source.kind === 'stove-cell') {
      const id = removeFromStove(host.stoves()[source.stoveIndex], source.cell);
      if (id) {
        host.feedbackDrop(x, y);
        host.toast(`丢掉 ${ingredientName(id)}`);
        host.persist();
      }
    } else if (source.kind === 'stove' && shift) {
      const dish = collectStove(host.stoves()[source.index]);
      if (dish) {
        host.feedbackDrop(x, y);
        host.toast(`丢掉 ${ingredientName(dish.id)}`);
      }
    }
  }
}
