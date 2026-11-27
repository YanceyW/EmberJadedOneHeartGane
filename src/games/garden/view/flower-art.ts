import { drawText, Rect } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { COLORS, RADIUS, TOWN_COLORS } from '../../../shared/design-system/tokens';
import { FlowerDef } from '../data/flowers';

/** 花园苗床：木框 + 松软土面，和农场的田垄区分开。 */
export function drawFlowerBed(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  seed: number,
): void {
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 20, TOWN_COLORS.wood, {
    stroke: TOWN_COLORS.woodDeep,
    width: 3,
    seed,
    wobble: 0.3,
  });
  inkRoundRect(
    ctx,
    rect.x + 8,
    rect.y + 8,
    rect.w - 16,
    rect.h - 16,
    15,
    COLORS.path,
    { stroke: 'rgba(154,101,56,0.35)', width: 1.6, seed: seed + 1 },
  );
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = TOWN_COLORS.woodDeep;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i += 1) {
    const y = rect.y + rect.h * 0.3 + i * rect.h * 0.2;
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, y);
    ctx.quadraticCurveTo(rect.x + rect.w / 2, y + 5, rect.x + rect.w - 18, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** 花期进度：只改变花的大小与花瓣数量，不换画法。 */
/** 花的图形统一由 shared/design-system/goods-art.ts 提供，仓库与花园看到的是同一份。 */
export function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  flower: FlowerDef,
  progress: number,
): void {
  drawGoods(ctx, flower.id, x, y, size, Math.max(0.2, Math.min(1, progress)));
}


export function drawFlowerSeed(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  flower: FlowerDef,
  selected: boolean,
  owned: number,
): void {
  inkRoundRect(
    ctx,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    RADIUS.lg,
    selected ? COLORS.cream : COLORS.paper,
    {
      stroke: selected ? COLORS.honeyDeep : 'rgba(58,46,42,0.16)',
      width: selected ? 2.8 : 1.8,
      seed: 1711 + flower.seedCost,
    },
  );
  if (rect.h < 90) {
    drawFlower(ctx, rect.x + 26, rect.y + rect.h / 2, rect.h * 0.62, flower, 1);
    drawText(ctx, flower.name, rect.x + 50, rect.y + 18, {
      size: 13,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 56,
    });
    drawText(ctx, `持有 ${owned}`, rect.x + 50, rect.y + 35, {
      size: 11,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 56,
    });
    drawText(ctx, `${flower.seedCost} 币`, rect.x + 50, rect.y + rect.h - 10, {
      size: 11,
      color: COLORS.honeyDeep,
      maxWidth: rect.w - 56,
    });
    return;
  }

  drawFlower(ctx, rect.x + rect.w / 2, rect.y + 36, 42, flower, 1);
  drawText(ctx, flower.name, rect.x + rect.w / 2, rect.y + 70, {
    size: 15,
    weight: '700',
    color: COLORS.ink,
    align: 'center',
  });
  drawText(ctx, `${flower.seedCost} 币`, rect.x + rect.w / 2, rect.y + 92, {
    size: 12,
    color: COLORS.honeyDeep,
    align: 'center',
  });
  drawText(ctx, `持有 ${owned}`, rect.x + rect.w / 2, rect.y + 110, {
    size: 11,
    color: COLORS.inkSoft,
    align: 'center',
  });
}
