import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkEllipse, inkRoundRect, softShadow } from '../../../shared/design-system/paint';
import { drawPaperPanel } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { findMenuItem } from '../../../shared/content/menu';
import { ShiftCustomer } from '../systems/shift';

export function drawCustomerRow(
  ctx: CanvasRenderingContext2D,
  rects: readonly Rect[],
  shiftCustomers: readonly ShiftCustomer[],
): Array<{ id: number; rect: Rect }> {
  const hits: Array<{ id: number; rect: Rect }> = [];
  rects.forEach((rect, seat) => {
    const customer = shiftCustomers.find((item) => item.seat === seat);
    drawPaperPanel(ctx, rect, {
      fill: customer ? 'rgba(255,253,248,0.96)' : 'rgba(255,253,248,0.5)',
      radius: RADIUS.lg,
      stitch: Boolean(customer),
      seed: 2101 + seat,
    });
    drawText(ctx, `${seat + 1} 号位`, rect.x + 10, rect.y + 16, {
      size: 9.5,
      color: 'rgba(107,91,84,0.65)',
    });
    if (!customer) {
      drawText(ctx, '空位', rect.x + rect.w / 2, rect.y + rect.h / 2 + 4, {
        size: 12,
        color: 'rgba(107,91,84,0.45)',
        align: 'center',
      });
      return;
    }
    hits.push({ id: customer.id, rect });
    const eating = customer.eating > 0;
    const remaining = customer.servedQuality.filter((quality) => quality === null).length;
    drawText(ctx, eating ? '用餐中' : `还差 ${remaining} 道`, rect.x + rect.w - 10, rect.y + 16, {
      size: 9.5,
      weight: '700',
      color: eating ? COLORS.jade : COLORS.coral,
      align: 'right',
    });

    const faceY = rect.y + 42;
    softShadow(ctx, rect.x + 26, faceY + 15, 16, 4, 0.12, 2);
    inkEllipse(ctx, rect.x + 26, faceY, 15, 15, COLORS.skin, {
      stroke: 'rgba(58,46,42,0.22)',
      width: 1.4,
      seed: 2111 + seat,
    });
    inkRoundRect(ctx, rect.x + 12, faceY + 14, 28, 18, 8, COLORS.mint, {
      stroke: 'rgba(58,46,42,0.18)',
      width: 1.2,
      seed: 2113 + seat,
    });
    for (const side of [-1, 1]) {
      inkEllipse(ctx, rect.x + 26 + side * 4, faceY - 2, 1.6, 2, COLORS.ink, { width: 0 });
    }

    const iconSize = 24;
    const iconGap = 4;
    const iconStart = rect.x + 52;
    customer.orders.forEach((orderId, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = iconStart + col * (iconSize + iconGap);
      const y = rect.y + 30 + row * (iconSize + 2);
      const quality = customer.servedQuality[index];
      inkRoundRect(ctx, x, y, iconSize, iconSize, 6, quality !== null ? 'rgba(214,238,224,0.9)' : 'rgba(255,253,248,0.9)', {
        stroke: quality !== null ? COLORS.jade : 'rgba(58,46,42,0.12)',
        width: quality !== null ? 1.8 : 1,
        seed: 2121 + seat * 10 + index,
      });
      drawGoods(ctx, orderId, x + iconSize / 2, y + iconSize / 2, 19);
      if (quality !== null) {
        drawText(ctx, quality >= 0.99 ? '✓' : `${Math.round(quality * 100)}%`, x + iconSize - 3, y + iconSize - 3, {
          size: 7.5,
          weight: '700',
          color: quality >= 0.5 ? COLORS.jade : COLORS.coral,
          align: 'right',
        });
      }
    });
    const total = customer.orders.reduce((sum, id) => sum + (findMenuItem(id)?.coins ?? 0), 0);
    drawText(ctx, `总价 ${total}`, rect.x + 52, rect.y + rect.h - 27, {
      size: 8.5,
      color: COLORS.honeyDeep,
      maxWidth: rect.w - 64,
    });

    const ratio = Math.max(0, Math.min(1, customer.patience / Math.max(1, customer.patienceMax)));
    const barX = rect.x + 10;
    const barY = rect.y + rect.h - 12;
    const barW = rect.w - 20;
    inkRoundRect(ctx, barX, barY, barW, 7, 4, 'rgba(58,46,42,0.12)', { width: 0 });
    inkRoundRect(ctx, barX, barY, Math.max(5, barW * ratio), 7, 4, ratio < 0.3 ? COLORS.coral : COLORS.jade, {
      width: 0,
    });
  });
  return hits;
}
