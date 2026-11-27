import { findMenuItem } from '../../shared/content/menu';
import {
  ShiftState,
  serveFromPrepared,
  serveFromStove,
} from './systems/shift';

export interface ServeHost {
  shift(): ShiftState | null;
  selectedPrepared(): number | null;
  selectedStove(): number | null;
  clearPrepared(): void;
  clearStove(): void;
  reward(): void;
  select(): void;
  invalid(): void;
  toast(text: string): void;
}

/** 上菜结果到 UI/反馈的翻译，和纯逻辑的 shift 系统分开。 */
export function serveCustomerOnShift(
  host: ServeHost,
  customerId: number,
  source: { kind: 'prepared'; index: number } | { kind: 'stove'; index: number },
): void {
  const shift = host.shift();
  if (!shift) return;
  const result =
    source.kind === 'prepared'
      ? serveFromPrepared(shift, customerId, source.index)
      : serveFromStove(shift, customerId, source.index);
  if (result === 'ok') {
    host.clearPrepared();
    host.clearStove();
    host.reward();
    host.toast('上齐了，客人开始用餐');
    return;
  }
  if (result === 'partial') {
    host.clearPrepared();
    host.clearStove();
    host.select();
    host.toast('上了一道，还差几道');
    return;
  }
  if (result === 'mismatch') {
    const customer = shift.customers.find((item) => item.id === customerId);
    const pending = customer?.orders.find(
      (_id, index) => customer.servedQuality[index] === null,
    );
    host.invalid();
    host.toast(`客人还在等${pending ? findMenuItem(pending)?.name ?? '别的菜' : '别的菜'}`);
    return;
  }
  if (result === 'eating') {
    host.toast('这位客人已经在吃了');
    return;
  }
  if (result === 'empty') {
    host.toast('这道还没出锅，或已经焦了');
    host.invalid();
    return;
  }
  if (result === 'done') host.toast('已经打烊了');
}
