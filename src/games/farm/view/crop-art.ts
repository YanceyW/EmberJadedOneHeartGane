import { drawStar, drawText, Rect } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { COLORS, RADIUS, TOWN_COLORS } from '../../../shared/design-system/tokens';
import { CropDef } from '../data/crops';

/**
 * 农场的作物/土地/种子卡都从这里画，保证田里、种子栏、订单卡是同一套形象。
 * 每块地是「木框 + 土面 + 垄沟」的 QQ 农场式小方块。
 */
export function drawSoilPlot(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  state: 'normal' | 'locked',
  seed: number,
): void {
  if (state === 'locked') {
    inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, 'rgba(143,191,106,0.45)', {
      stroke: TOWN_COLORS.woodDeep,
      width: 2.4,
      seed,
      wobble: 0.4,
    });
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = COLORS.grassDeep;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i += 1) {
      const x = rect.x + 22 + i * ((rect.w - 44) / 5);
      const y = rect.y + rect.h * 0.46 + (i % 2) * 10;
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.quadraticCurveTo(x + 4, y - 2, x + 10, y - 10);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, TOWN_COLORS.soilDeep, {
    stroke: TOWN_COLORS.woodDeep,
    width: 3,
    seed,
    wobble: 0.35,
  });
  const soil: Rect = { x: rect.x + 7, y: rect.y + 7, w: rect.w - 14, h: rect.h - 14 };
  inkRoundRect(ctx, soil.x, soil.y, soil.w, soil.h, 13, TOWN_COLORS.soil, {
    stroke: 'rgba(154,101,56,0.45)',
    width: 1.6,
    seed: seed + 1,
  });

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = TOWN_COLORS.woodDeep;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const y = soil.y + soil.h * 0.2 + i * (soil.h * 0.2);
    ctx.beginPath();
    ctx.moveTo(soil.x + 14, y);
    ctx.quadraticCurveTo(soil.x + soil.w / 2, y + 6, soil.x + soil.w - 14, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = TOWN_COLORS.stone;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      rect.x + 22 + ((i * 53) % Math.max(20, rect.w - 44)),
      rect.y + rect.h - 26 - (i % 2) * 16,
      5,
      3.4,
      0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

export function drawSeedPacket(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  crop: CropDef,
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
      seed: 1031 + crop.seedCost,
    },
  );
  if (selected) {
    if (rect.h < 80) {
      drawStar(ctx, rect.x + rect.w - 14, rect.y + 13, 6, 2.6, COLORS.honeyDeep);
    } else {
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w / 2 - 8, rect.y - 9);
      ctx.lineTo(rect.x + rect.w / 2 + 8, rect.y - 9);
      ctx.lineTo(rect.x + rect.w / 2, rect.y - 1);
      ctx.closePath();
      ctx.fillStyle = COLORS.honeyDeep;
      ctx.fill();
    }
  }

  if (rect.h < 80) {
    // 18 种作物的紧凑种子卡：图左，右侧三行（名字 / 持有 / 价格）。
    drawCrop(ctx, rect.x + 26, rect.y + rect.h / 2, rect.h * 0.62, crop, 1);
    drawText(ctx, crop.name, rect.x + 50, rect.y + 18, {
      size: 14,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 56,
    });
    drawText(ctx, `持有 ${owned}`, rect.x + 50, rect.y + 35, {
      size: 11,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 56,
    });
    drawText(ctx, `${crop.seedCost} 币`, rect.x + 50, rect.y + rect.h - 10, {
      size: 11,
      color: COLORS.honeyDeep,
      maxWidth: rect.w - 56,
    });
    return;
  }

  drawCrop(ctx, rect.x + rect.w / 2, rect.y + 34, 40, crop, 1);
  drawText(ctx, crop.name, rect.x + rect.w / 2, rect.y + 64, {
    size: 16,
    weight: '700',
    color: COLORS.ink,
    align: 'center',
  });
  drawText(ctx, `${crop.seedCost} 币`, rect.x + rect.w / 2, rect.y + 84, {
    size: 13,
    color: COLORS.honeyDeep,
    align: 'center',
  });
  if (rect.h >= 108) {
    drawText(ctx, `持有 ${owned}`, rect.x + rect.w / 2, rect.y + 102, {
      size: 12,
      color: COLORS.inkSoft,
      align: 'center',
    });
  }
}

/** 作物图形统一由 shared/design-system/goods-art.ts 提供，仓库与农场看到的是同一份。 */
export function drawCrop(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  crop: CropDef,
  stage: number,
): void {
  drawGoods(ctx, crop.id, cx, cy, size, stage);
  if (stage >= 0.98) drawStar(ctx, cx + size * 0.26, cy - size * 0.38, size * 0.08, size * 0.03, COLORS.gold);
}

/** 成熟地块上方的小纸签。 */
export function drawReadyTag(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
  const rect: Rect = { x: cx - 46, y: y - 14, w: 92, h: 26 };
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 13, COLORS.gold, {
    stroke: COLORS.honeyDeep,
    width: 1.8,
    seed: 1071,
  });
  drawText(ctx, '可收获', cx, y, {
    size: 15,
    weight: '700',
    color: COLORS.honeyDeep,
    align: 'center',
  });
}
