import { drawText, drawWangduCoin, Rect } from '../shared/design-system/draw';
import { drawGoods } from '../shared/design-system/goods-art';
import { inkRoundRect } from '../shared/design-system/paint';
import {
  drawPaperPanel,
  drawSegmented,
  drawStickerButton,
} from '../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../shared/design-system/tokens';
import { GOODS_TABS, GoodsKind, INGREDIENTS, sellableValue } from '../shared/content/ingredients';
import { compactNumber } from '../shared/format';

export interface StorageState {
  coins: number;
  prosperity: number;
  pantry: Record<string, number>;
  selected: readonly string[];
  tab: GoodsKind;
  /** 曾经获得过的食材；有值时给营业可用的原材料加标记。 */
  ingredientUnlocks?: readonly string[];
}

export type StorageHit =
  | { kind: 'close' }
  | { kind: 'tab'; tab: GoodsKind }
  | { kind: 'goods'; id: string }
  | { kind: 'select-all' }
  | { kind: 'clear' }
  | { kind: 'sell' };

export interface StorageTarget {
  hit: StorageHit;
  rect: Rect;
}

const PANEL_H = 920;
const COLUMNS = 4;

/** 王都仓库面板：分页看货、点格子挑要卖的，底部结算。 */
export function drawStoragePanel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: StorageState,
): StorageTarget[] {
  const targets: StorageTarget[] = [];
  ctx.fillStyle = 'rgba(58,46,42,0.35)';
  ctx.fillRect(0, 0, width, height);

  const panel: Rect = {
    x: 36,
    y: Math.max(50, height / 2 - PANEL_H / 2),
    w: width - 72,
    h: PANEL_H,
  };
  drawPaperPanel(ctx, panel, {
    fill: COLORS.paper,
    radius: RADIUS.xl,
    stitch: true,
    seed: 2401,
  });

  drawText(ctx, '王都仓库', panel.x + 32, panel.y + 52, {
    size: FONT.title,
    weight: '700',
    color: COLORS.ink,
  });
  drawText(ctx, '点格子挑要卖的，其余留在仓库', panel.x + 32, panel.y + 86, {
    size: 15,
    color: COLORS.inkSoft,
    maxWidth: panel.w - 260,
  });

  drawWangduCoin(ctx, panel.x + panel.w - 158, panel.y + 44, 13);
  drawText(ctx, compactNumber(state.coins), panel.x + panel.w - 138, panel.y + 44, {
    size: 16,
    weight: '700',
    color: COLORS.ink,
  });
  drawText(ctx, `繁荣 ${compactNumber(state.prosperity)}`, panel.x + panel.w - 32, panel.y + 76, {
    size: 14,
    color: COLORS.jade,
    align: 'right',
  });

  const tabRects = drawSegmented(
    ctx,
    { x: panel.x + 32, y: panel.y + 108, w: panel.w - 64, h: 44 },
    GOODS_TABS.map((tab) => tab.label),
    GOODS_TABS.findIndex((tab) => tab.kind === state.tab),
    COLORS.jade,
  );
  GOODS_TABS.forEach((tab, index) => {
    const rect = tabRects[index];
    if (rect) targets.push({ hit: { kind: 'tab', tab: tab.kind }, rect });
  });

  const kindItems = INGREDIENTS.filter((item) => item.kind === state.tab);
  const allIds = INGREDIENTS.map((item) => item.id);
  const total = sellableValue(state.pantry, allIds);
  const kindTotal = sellableValue(
    state.pantry,
    kindItems.map((item) => item.id),
  );
  drawText(
    ctx,
    `库存总价值 ${compactNumber(total.coins)} · 本类 ${compactNumber(kindTotal.coins)}`,
    panel.x + 32,
    panel.y + 178,
    { size: 13, color: COLORS.inkSoft, maxWidth: panel.w - 64 },
  );

  const chipW = (panel.w - 64 - (COLUMNS - 1) * 10) / COLUMNS;
  // 成菜扩到 31 种后是 8 行；压一点高度，底部动作区仍然放得下。
  const chipH = kindItems.length > 20 ? 60 : 72;
  kindItems.forEach((item, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const rect: Rect = {
      x: panel.x + 32 + col * (chipW + 10),
      y: panel.y + 196 + row * (chipH + 8),
      w: chipW,
      h: chipH,
    };
    const amount = state.pantry[item.id] ?? 0;
    const selected = state.selected.includes(item.id);
    const empty = amount <= 0;
    ctx.save();
    ctx.globalAlpha = empty ? 0.42 : 1;
    inkRoundRect(
      ctx,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      RADIUS.md,
      selected ? 'rgba(168,230,207,0.55)' : 'rgba(255,253,248,0.9)',
      {
        stroke: selected ? COLORS.jade : 'rgba(58,46,42,0.14)',
        width: selected ? 2.4 : 1.4,
        seed: 2421 + index,
      },
    );
    drawGoods(ctx, item.id, rect.x + 26, rect.y + rect.h / 2, 34);
    drawText(ctx, item.name, rect.x + 48, rect.y + 26, {
      size: 13,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 54,
    });
    drawText(ctx, `×${compactNumber(amount)}`, rect.x + 48, rect.y + 44, {
      size: 12,
      weight: '700',
      color: amount > 0 ? COLORS.honeyDeep : COLORS.inkSoft,
    });
    drawText(ctx, `${item.sellPrice}/个`, rect.x + 48, rect.y + 60, {
      size: 10,
      color: COLORS.inkSoft,
    });
    const raw =
      item.kind === 'crop' || item.kind === 'flower' || item.kind === 'ranch';
    const restaurantReady =
      raw &&
      (state.ingredientUnlocks
        ? state.ingredientUnlocks.includes(item.id)
        : amount > 0);
    if (restaurantReady) {
      drawText(ctx, '营业', rect.x + rect.w - 8, rect.y + rect.h - 7, {
        size: 9,
        weight: '700',
        color: COLORS.jade,
        align: 'right',
      });
    }
    if (selected) {
      ctx.beginPath();
      ctx.arc(rect.x + rect.w - 14, rect.y + 14, 9, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.jade;
      ctx.fill();
      drawText(ctx, '✓', rect.x + rect.w - 14, rect.y + 14, {
        size: 11,
        weight: '700',
        color: COLORS.paper,
        align: 'center',
      });
    }
    ctx.restore();
    if (!empty) targets.push({ hit: { kind: 'goods', id: item.id }, rect });
  });

  const selectedIds = state.selected.filter((id) => (state.pantry[id] ?? 0) > 0);
  const preview = sellableValue(state.pantry, selectedIds);
  const rows = Math.ceil(kindItems.length / COLUMNS);
  const actionsY = panel.y + 196 + rows * (chipH + 8) + 10;

  const allRect: Rect = { x: panel.x + 32, y: actionsY, w: 104, h: 40 };
  drawStickerButton(ctx, allRect, '全选本类', {
    fill: COLORS.paper,
    textColor: COLORS.ink,
    fontSize: 13,
    radius: RADIUS.md,
    seed: 2441,
  });
  targets.push({ hit: { kind: 'select-all' }, rect: allRect });

  const clearRect: Rect = { x: panel.x + 146, y: actionsY, w: 80, h: 40 };
  drawStickerButton(ctx, clearRect, '清空', {
    fill: COLORS.paper,
    textColor: COLORS.inkSoft,
    fontSize: 13,
    radius: RADIUS.md,
    seed: 2443,
  });
  targets.push({ hit: { kind: 'clear' }, rect: clearRect });

  drawText(
    ctx,
    preview.count > 0
      ? `已选 ${selectedIds.length} 种 · ${preview.count} 件 · +${compactNumber(preview.coins)} 王都币`
      : '还没有选中任何货物',
    panel.x + panel.w - 32,
    actionsY + 20,
    {
      size: 13,
      color: preview.count > 0 ? COLORS.jade : COLORS.inkSoft,
      align: 'right',
      maxWidth: 280,
    },
  );

  const sellable = preview.count > 0;
  const sellRect: Rect = { x: panel.x + 32, y: actionsY + 52, w: panel.w - 64, h: 52 };
  drawStickerButton(
    ctx,
    sellRect,
    sellable ? `卖出选中 +${compactNumber(preview.coins)} 王都币` : '仓库里没有可卖的',
    {
      fill: sellable ? COLORS.gold : 'rgba(58,46,42,0.08)',
      textColor: sellable ? COLORS.honeyDeep : COLORS.inkSoft,
      fontSize: 16,
      radius: RADIUS.md,
      disabled: !sellable,
      seed: 2445,
    },
  );
  if (sellable) targets.push({ hit: { kind: 'sell' }, rect: sellRect });

  const closeRect: Rect = { x: panel.x + 32, y: panel.y + panel.h - 58, w: panel.w - 64, h: 44 };
  drawStickerButton(ctx, closeRect, '关闭', { fontSize: FONT.body, seed: 2447 });
  targets.push({ hit: { kind: 'close' }, rect: closeRect });

  return targets;
}
