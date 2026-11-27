import {
  INGREDIENTS,
  IngredientDef,
} from '../../../shared/content/ingredients';
import { MENU, MenuItemDef } from '../../../shared/content/menu';
import { COMBO_INPUT_IDS, ComboRecipe } from '../data/combos';
import { AdviceCard } from '../systems/advice';
import { CounterCells } from '../systems/counter';
import { RESTAURANT_TABLES, RestaurantSave } from '../systems/save';
import { ShiftSupplySlot } from '../systems/shift';
import { StoveState } from '../systems/stove';
import { tableItem } from '../systems/orders';

export type CraftTab = 'farm' | 'ranch' | 'processed';
export type RestaurantPage = 'kitchen' | 'order' | 'shift';

export const SUPPLY_COLUMNS = 7;
export const SUPPLY_GAP = 6;
export const SUPPLY_PAD = 12;

export interface SupplyRailMetrics {
  chipW: number;
  contentWidth: number;
  viewportWidth: number;
  maxScroll: number;
}

/** 两行横向供应轨的尺寸计算；控制器和绘制共用同一份。 */
export function supplyRailMetrics(count: number, panelWidth: number): SupplyRailMetrics {
  const viewportWidth = Math.max(1, panelWidth - SUPPLY_PAD * 2);
  const chipW =
    (viewportWidth - (SUPPLY_COLUMNS - 1) * SUPPLY_GAP) / SUPPLY_COLUMNS;
  const columns = Math.max(1, Math.ceil(count / 2));
  const contentWidth = columns * chipW + (columns - 1) * SUPPLY_GAP;
  return {
    chipW,
    contentWidth,
    viewportWidth,
    maxScroll: Math.max(0, contentWidth - viewportWidth),
  };
}

/** 横向滑动按列吸附；边界处允许停在最大滚动量。 */
export function snapSupplyScroll(
  scroll: number,
  count: number,
  panelWidth: number,
): number {
  const metrics = supplyRailMetrics(count, panelWidth);
  const step = metrics.chipW + SUPPLY_GAP;
  const snapped = Math.round(scroll / step) * step;
  return Math.max(0, Math.min(metrics.maxScroll, snapped));
}

export const CRAFT_TABS: ReadonlyArray<{ id: CraftTab; label: string }> = [
  { id: 'farm', label: '农产' },
  { id: 'ranch', label: '牧产' },
  { id: 'processed', label: '加工' },
];

/** 视图只需要这些只读数据，算好再传进来，避免每帧重算。 */
export interface RestaurantViewState {
  save: RestaurantSave;
  store: Record<string, number>;
  coins: number;
  message: string;
  /** 厨房备料台（营业时用 shift.counter，不读这里）。 */
  counter: CounterCells;
  /** 厨房灶台（营业时用 shift.stoves，不读这里）。 */
  stoves: StoveState[];
  /** 当前拖拽/点选产生的上下文建议。 */
  suggestions: AdviceCard[];
  /** 空灶台上的半透明摆法预览。 */
  ghost: { index: number; recipe: ComboRecipe } | null;
  selectedCounter: number | null;
  selectedStove: number | null;
  exitPanel: boolean;
  /** 当前营业若直接离开的预计赔偿。 */
  exitPenalty: number;
  /** 营业供应轨：已解锁在前，未解锁灰显在后。 */
  supplyRail: ShiftSupplySlot[];
  supplyScroll: number;
  supplyScrollMax: number;
}

export function craftInputs(tab: CraftTab): readonly IngredientDef[] {
  return INGREDIENTS.filter((item) => {
    if (!COMBO_INPUT_IDS.includes(item.id)) return false;
    if (tab === 'ranch') return item.kind === 'ranch';
    if (tab === 'processed') {
      return item.kind === 'processed' || item.kind === 'drink' || item.kind === 'dish';
    }
    return item.kind === 'base' || item.kind === 'crop' || item.kind === 'flower';
  });
}

export function tableList(save: RestaurantSave): MenuItemDef[] {
  const list: MenuItemDef[] = [];
  for (let i = 0; i < RESTAURANT_TABLES; i += 1) {
    const item = tableItem(save, i);
    if (item) list.push(item);
  }
  return list;
}

/** 成品柜里有货的菜（按菜单顺序，最多 limit 个）。 */
export function stockedDishes(
  store: Record<string, number>,
  limit = 12,
): Array<{ item: MenuItemDef; amount: number }> {
  const result: Array<{ item: MenuItemDef; amount: number }> = [];
  for (const item of MENU) {
    const amount = store[item.id] ?? 0;
    if (amount <= 0) continue;
    result.push({ item, amount });
    if (result.length >= limit) break;
  }
  return result;
}
