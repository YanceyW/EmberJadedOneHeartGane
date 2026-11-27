import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { drawPaperPanel, drawStickerButton, drawTapeNote } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import {
  RESTAURANT_DAILY_GOAL,
  RESTAURANT_DAILY_REWARD,
} from '../systems/save';
import { RestaurantViewState, stockedDishes, tableList } from './restaurant-view-data';

export function drawOrderPage(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
  state: RestaurantViewState,
): Rect[] {
  const tables = tableList(state.save);
  const tableRects: Rect[] = [];
  const cardH = 132;
  const gap = 10;
  tables.forEach((entry, index) => {
    const rect: Rect = { x: 48, y: top + index * (cardH + gap), w: width - 96, h: cardH };
    tableRects.push(rect);
    drawPaperPanel(ctx, rect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1861 + index,
    });
    drawText(ctx, `${index + 1} 号桌`, rect.x + 18, rect.y + 22, {
      size: 12,
      color: COLORS.inkSoft,
    });
    drawGoods(ctx, entry.id, rect.x + 62, rect.y + 70, 54);
    drawText(ctx, entry.name, rect.x + 106, rect.y + 46, {
      size: 20,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 280,
    });
    drawText(ctx, `菜价 ${entry.coins} 王都币 · 繁荣 +${entry.prosperity}`, rect.x + 106, rect.y + 72, {
      size: 12.5,
      color: COLORS.honeyDeep,
      maxWidth: rect.w - 280,
    });
    const stock = state.store[entry.id] ?? 0;
    drawText(ctx, `成品柜 ${stock} 份`, rect.x + 106, rect.y + 98, {
      size: 12.5,
      weight: '700',
      color: stock > 0 ? COLORS.jade : COLORS.inkSoft,
    });
    const button: Rect = { x: rect.x + rect.w - 150, y: rect.y + 42, w: 130, h: 48 };
    const ok = stock > 0;
    drawStickerButton(ctx, button, ok ? '上菜' : '成品不足', {
      fill: ok ? COLORS.coral : 'rgba(58,46,42,0.08)',
      textColor: ok ? COLORS.paper : COLORS.inkSoft,
      fontSize: 15,
      radius: RADIUS.md,
      disabled: !ok,
      seed: 1881 + index,
    });
  });

  const noteY = top + tables.length * (cardH + gap) + 2;
  if (bottom - noteY > 70) {
    drawTapeNote(
      ctx,
      { x: (width - 620) / 2, y: noteY, w: 620, h: 58 },
      [
        '点菜只认备料台/灶台做出来的成品；没有就去现做',
        '营业按火候品质结算；点菜按标准品质结算',
      ],
      { align: 'center' },
    );
  }

  const stockTop = noteY + 72;
  const stockH = Math.min(160, bottom - stockTop - 6);
  if (stockH > 90) {
    const panel: Rect = { x: 48, y: stockTop, w: width - 96, h: stockH };
    drawPaperPanel(ctx, panel, {
      fill: 'rgba(255,253,248,0.86)',
      radius: RADIUS.lg,
      stitch: true,
      seed: 1885,
    });
    drawText(ctx, '成品柜', panel.x + 16, panel.y + 24, {
      size: 13,
      weight: '700',
      color: COLORS.ink,
    });
    const stocked = stockedDishes(state.store, 12);
    if (stocked.length === 0) {
      drawText(ctx, '还没有成品，去备料台做几份吧', panel.x + 16, panel.y + 54, {
        size: 12,
        color: COLORS.inkSoft,
      });
    } else {
      const cellW = (panel.w - 32 - 5 * 6) / 6;
      stocked.slice(0, 12).forEach((entry, index) => {
        const col = index % 6;
        const row = Math.floor(index / 6);
        const cx = panel.x + 16 + col * (cellW + 6);
        const cy = panel.y + 38 + row * 58;
        if (cy + 52 > panel.y + panel.h) return;
        inkRoundRect(ctx, cx, cy, cellW, 52, RADIUS.md, 'rgba(255,253,248,0.92)', {
          stroke: 'rgba(58,46,42,0.12)',
          width: 1.2,
          seed: 1887 + index,
        });
        drawGoods(ctx, entry.item.id, cx + 20, cy + 26, 30);
        drawText(ctx, `×${entry.amount}`, cx + cellW - 7, cy + 26, {
          size: 11,
          weight: '700',
          color: COLORS.honeyDeep,
          align: 'right',
        });
      });
    }
  }

  const dailyTop = stockTop + stockH + 10;
  if (stockH > 90 && bottom - dailyTop > 132) {
    const panel: Rect = {
      x: 48,
      y: dailyTop,
      w: width - 96,
      h: Math.min(132, bottom - dailyTop - 4),
    };
    drawPaperPanel(ctx, panel, {
      fill: 'rgba(255,253,248,0.9)',
      radius: RADIUS.lg,
      stitch: true,
      seed: 1897,
    });
    const daily = state.save;
    drawText(ctx, '今日点菜目标', panel.x + 16, panel.y + 24, {
      size: 13,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(
      ctx,
      `${Math.min(daily.dailyServed, RESTAURANT_DAILY_GOAL)} / ${RESTAURANT_DAILY_GOAL}`,
      panel.x + panel.w - 16,
      panel.y + 24,
      {
        size: 11,
        weight: '700',
        color: daily.dailyClaimed ? COLORS.jade : COLORS.honeyDeep,
        align: 'right',
      },
    );
    const ratio = Math.min(1, daily.dailyServed / RESTAURANT_DAILY_GOAL);
    const barY = panel.y + 36;
    inkRoundRect(ctx, panel.x + 16, barY, panel.w - 32, 9, 5, 'rgba(58,46,42,0.12)', {
      width: 0,
    });
    inkRoundRect(
      ctx,
      panel.x + 16,
      barY,
      Math.max(6, (panel.w - 32) * ratio),
      9,
      5,
      daily.dailyClaimed ? COLORS.jade : COLORS.gold,
      { width: 0 },
    );
    drawText(
      ctx,
      daily.dailyClaimed
        ? '今日目标已完成，奖励已发放'
        : `再上 ${Math.max(0, RESTAURANT_DAILY_GOAL - daily.dailyServed)} 道，奖励 ${RESTAURANT_DAILY_REWARD.coins} 王都币 +${RESTAURANT_DAILY_REWARD.prosperity} 繁荣`,
      panel.x + 16,
      panel.y + 68,
      {
        size: 12,
        weight: '700',
        color: daily.dailyClaimed ? COLORS.jade : COLORS.inkSoft,
        maxWidth: panel.w - 32,
      },
    );
    drawText(ctx, `营业最佳 ${compactNumber(daily.bestRevenue)} 王都币`, panel.x + 16, panel.y + 96, {
      size: 11,
      color: COLORS.honeyDeep,
    });
    drawText(ctx, '点菜和营业共用同一份成品与繁荣；营业更适合冲高价', panel.x + 16, panel.y + 118, {
      size: 10.5,
      color: COLORS.inkSoft,
      maxWidth: panel.w - 32,
    });
  }
  return tableRects;
}
