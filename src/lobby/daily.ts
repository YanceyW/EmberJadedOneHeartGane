import { drawText, drawWangduCoin, Rect } from '../shared/design-system/draw';
import { drawGoods } from '../shared/design-system/goods-art';
import { inkRoundRect } from '../shared/design-system/paint';
import { drawPaperPanel, drawStickerButton, drawTapeNote } from '../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../shared/design-system/tokens';
import { DailyOrderDef, DAILY_ORDER_COUNT } from '../shared/content/daily-orders';
import { ingredientName, missingNeeds } from '../shared/content/ingredients';
import { compactNumber } from '../shared/format';

export interface DailyState {
  coins: number;
  prosperity: number;
  pantry: Record<string, number>;
  orders: readonly DailyOrderDef[];
  claimed: readonly string[];
  streak: number;
}

export type DailyHit = { kind: 'close' } | { kind: 'claim'; id: string };

export interface DailyTarget {
  hit: DailyHit;
  rect: Rect;
}

const PANEL_H = 760;

/** 每日委托面板：必须点「交付」才会扣库存。 */
export function drawDailyPanel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: DailyState,
): DailyTarget[] {
  const targets: DailyTarget[] = [];
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
    seed: 2501,
  });

  drawText(ctx, '每日委托', panel.x + 32, panel.y + 52, {
    size: FONT.title,
    weight: '700',
    color: COLORS.ink,
  });
  const claimedToday = state.orders.filter((order) => state.claimed.includes(order.id)).length;
  drawText(ctx, `今日 ${claimedToday}/${DAILY_ORDER_COUNT} · 连续 ${state.streak} 天`, panel.x + 32, panel.y + 86, {
    size: 15,
    color: COLORS.inkSoft,
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

  drawText(ctx, '点「交付」才会从仓库扣货，不点就一直留着', panel.x + 32, panel.y + 122, {
    size: 13,
    color: COLORS.inkSoft,
    maxWidth: panel.w - 64,
  });

  const cardH = 144;
  const gap = 12;
  state.orders.forEach((order, index) => {
    const rect: Rect = {
      x: panel.x + 28,
      y: panel.y + 146 + index * (cardH + gap),
      w: panel.w - 56,
      h: cardH,
    };
    const claimed = state.claimed.includes(order.id);
    const missing = missingNeeds(state.pantry, order.needs);
    const ready = missing.length === 0;
    drawPaperPanel(ctx, rect, {
      fill: claimed ? 'rgba(168,230,207,0.28)' : 'rgba(255,253,248,0.92)',
      radius: RADIUS.lg,
      stitch: true,
      seed: 2511 + index,
    });
    drawText(ctx, order.title, rect.x + 20, rect.y + 30, {
      size: 19,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 190,
    });
    drawText(ctx, order.hint, rect.x + 20, rect.y + 54, {
      size: 12,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 190,
    });

    const chipGap = 8;
    const chipW = Math.min(140, (rect.w - 40 - 170 - (order.needs.length - 1) * chipGap) / order.needs.length);
    order.needs.forEach((need, slot) => {
      const x = rect.x + 20 + slot * (chipW + chipGap);
      const y = rect.y + 76;
      const have = state.pantry[need.id] ?? 0;
      const enough = have >= need.amount;
      inkRoundRect(
        ctx,
        x,
        y,
        chipW,
        46,
        RADIUS.md,
        enough ? 'rgba(168,230,207,0.42)' : 'rgba(58,46,42,0.06)',
        { width: 0 },
      );
      drawGoods(ctx, need.id, x + 20, y + 23, 28);
      drawText(ctx, ingredientName(need.id), x + 40, y + 18, {
        size: 12,
        color: COLORS.ink,
        maxWidth: chipW - 44,
      });
      drawText(ctx, `${have}/${need.amount}`, x + 40, y + 34, {
        size: 12,
        weight: '700',
        color: enough ? COLORS.jade : COLORS.coral,
      });
    });

    drawWangduCoin(ctx, rect.x + 26, rect.y + cardH - 22, 11);
    drawText(ctx, `+${order.coins}`, rect.x + 44, rect.y + cardH - 22, {
      size: 15,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, `繁荣 +${order.prosperity}`, rect.x + 110, rect.y + cardH - 22, {
      size: 12,
      color: COLORS.inkSoft,
    });

    const button: Rect = { x: rect.x + rect.w - 140, y: rect.y + cardH - 66, w: 120, h: 46 };
    const label = claimed ? '已交付' : ready ? '交付' : '缺货物';
    drawStickerButton(ctx, button, label, {
      fill: claimed ? 'rgba(58,46,42,0.08)' : ready ? COLORS.jade : 'rgba(58,46,42,0.08)',
      textColor: claimed || !ready ? COLORS.inkSoft : COLORS.paper,
      fontSize: 16,
      radius: RADIUS.md,
      disabled: claimed || !ready,
      seed: 2521 + index,
    });
    if (!claimed && ready) targets.push({ hit: { kind: 'claim', id: order.id }, rect: button });
  });

  const closeRect: Rect = { x: panel.x + 32, y: panel.y + panel.h - 62, w: panel.w - 64, h: 44 };
  // 提示条只在不挤到关闭按钮时才画：短屏宁可少一行说明
  const doneY = panel.y + 146 + state.orders.length * (cardH + gap) - 6;
  const noteSpace = closeRect.y - 10 - doneY;
  const fullClear = claimedToday >= DAILY_ORDER_COUNT;
  const lines = fullClear
    ? [`今日委托全部完成 · 连续 ${state.streak} 天`, '全清奖励已经发放，明天见']
    : ['3 单全交有额外奖励，并累计连续天数', '缺的货物可以去农场、加工屋或餐厅做'];
  const noteH = lines.length > 1 ? 72 : 52;
  if (noteSpace >= noteH) {
    drawTapeNote(ctx, { x: panel.x + 60, y: doneY, w: panel.w - 120, h: noteH }, lines, {
      align: 'center',
    });
  } else if (noteSpace >= 52) {
    drawTapeNote(
      ctx,
      { x: panel.x + 60, y: doneY, w: panel.w - 120, h: 52 },
      [fullClear ? `今日委托全部完成 · 连续 ${state.streak} 天` : lines[0]],
      { align: 'center' },
    );
  }

  drawStickerButton(ctx, closeRect, '关闭', { fontSize: FONT.body, seed: 2531 });
  targets.push({ hit: { kind: 'close' }, rect: closeRect });

  return targets;

  return targets;
}
