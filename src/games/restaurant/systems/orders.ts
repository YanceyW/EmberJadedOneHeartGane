import { MENU, MenuItemDef, findMenuItem } from '../../../shared/content/menu';
import { RestaurantSave } from './save';

export interface OrderServeResult {
  item: MenuItemDef;
  coins: number;
  prosperity: number;
}

/** 点菜页：每桌点一道菜，从成品柜里取一份上桌。 */
export function tableItem(save: RestaurantSave, index: number): MenuItemDef | null {
  const id = save.tables[index];
  return id ? (findMenuItem(id) ?? null) : null;
}

export function canServeTable(
  save: RestaurantSave,
  index: number,
  pantry: Record<string, number>,
): boolean {
  const item = tableItem(save, index);
  return Boolean(item && (pantry[item.id] ?? 0) >= 1);
}

/** 上菜：只扣成品，按菜价结算，桌上换成下一道菜。 */
export function serveTable(
  save: RestaurantSave,
  index: number,
  pantry: Record<string, number>,
): OrderServeResult | null {
  const item = tableItem(save, index);
  if (!item) return null;
  if ((pantry[item.id] ?? 0) < 1) return null;
  pantry[item.id] = Math.max(0, (pantry[item.id] ?? 0) - 1);
  const next = MENU[save.nextItem % MENU.length];
  save.tables[index] = next.id;
  save.nextItem += 1;
  save.served += 1;
  save.totalCoins += item.coins;
  return { item, coins: item.coins, prosperity: item.prosperity };
}
