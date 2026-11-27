import { drawBerry, drawStar, drawText } from '../../../shared/design-system/draw';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { COLORS } from '../../../shared/design-system/tokens';
import { mergeItem } from '../data/items';

/** 四个加工等级各有一套轮廓：莓果、果酱罐、蛋糕、宴席。 */
export function drawMergeItem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  tier: number,
): void {
  const item = mergeItem(tier);
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 100;
  ctx.scale(s, s);
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.ink;

  if (tier === 0) {
    drawBerry(ctx, 0, 4, 28, item.color);
    ctx.beginPath();
    ctx.ellipse(0, -32, 12, 6, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.leaf;
    ctx.fill();
    ctx.stroke();
  } else if (tier === 1) {
    inkRoundRect(ctx, -24, -22, 48, 50, 12, item.color, {
      stroke: COLORS.ink,
      width: 3,
      seed: 1501,
    });
    inkRoundRect(ctx, -20, -34, 40, 14, 6, COLORS.inkSoft, { width: 0 });
    inkRoundRect(ctx, -14, -2, 28, 18, 6, COLORS.paper, { width: 0 });
    drawStar(ctx, 0, 7, 5, 2.2, COLORS.honeyDeep);
  } else if (tier === 2) {
    inkRoundRect(ctx, -30, -6, 60, 30, 9, item.color, {
      stroke: COLORS.ink,
      width: 3,
      seed: 1503,
    });
    inkRoundRect(ctx, -26, -26, 52, 22, 8, COLORS.cream, {
      stroke: COLORS.ink,
      width: 2.4,
      seed: 1505,
    });
    ctx.beginPath();
    ctx.arc(0, -26, 7, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.berry;
    ctx.fill();
    ctx.stroke();
  } else {
    inkRoundRect(ctx, -34, 8, 68, 16, 8, COLORS.pathDeep, {
      stroke: COLORS.ink,
      width: 2.4,
      seed: 1507,
    });
    inkRoundRect(ctx, -24, -14, 48, 24, 8, item.color, {
      stroke: COLORS.ink,
      width: 2.6,
      seed: 1509,
    });
    inkRoundRect(ctx, -18, -30, 36, 18, 7, COLORS.petal, {
      stroke: COLORS.ink,
      width: 2.2,
      seed: 1511,
    });
    drawStar(ctx, 0, -44, 9, 3.8, COLORS.gold);
    drawText(ctx, '宴', 0, 2, {
      size: 13,
      weight: '700',
      color: COLORS.honeyDeep,
      align: 'center',
    });
  }
  ctx.restore();
}
