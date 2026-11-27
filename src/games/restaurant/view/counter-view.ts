import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { drawPaperPanel } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { IngredientDef, ingredientName } from '../../../shared/content/ingredients';
import { CounterCells } from '../systems/counter';
import { PreparedDish } from '../systems/shift';

export function drawCounter(
  ctx: CanvasRenderingContext2D,
  rects: readonly Rect[],
  cells: CounterCells,
  selected: number | null,
): void {
  rects.forEach((rect, index) => {
    const id = cells[index];
    inkRoundRect(
      ctx,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      RADIUS.md,
      id ? 'rgba(255,253,248,0.96)' : 'rgba(255,253,248,0.36)',
      {
        stroke: selected === index ? COLORS.gold : id ? 'rgba(58,46,42,0.18)' : 'rgba(58,46,42,0.12)',
        width: selected === index ? 2.6 : 1.4,
        seed: 1851 + index,
      },
    );
    if (!id) return;
    drawGoods(ctx, id, rect.x + rect.w / 2, rect.y + rect.h * 0.42, Math.min(42, rect.h * 0.48));
    drawText(ctx, ingredientName(id), rect.x + rect.w / 2, rect.y + rect.h - 16, {
      size: Math.min(12, rect.w * 0.11),
      weight: '700',
      color: COLORS.ink,
      align: 'center',
      maxWidth: rect.w - 8,
    });
  });
}

export function drawPalette(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  items: readonly IngredientDef[],
  store: Record<string, number>,
  infiniteWater: boolean,
  columns: number,
  title: string,
  stacked = false,
): Array<{ id: string; rect: Rect }> {
  drawPaperPanel(ctx, rect, {
    fill: 'rgba(255,253,248,0.72)',
    radius: RADIUS.lg,
    stitch: false,
    seed: 1891,
  });
  drawText(ctx, title, rect.x + 12, rect.y + 18, {
    size: 11.5,
    weight: '700',
    color: COLORS.inkSoft,
  });
  const gap = 6;
  const chipW = (rect.w - 24 - (columns - 1) * gap) / columns;
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const chipH = stacked
    ? Math.max(38, Math.min(48, (rect.h - 30 - (rows - 1) * gap) / rows))
    : Math.max(26, Math.min(38, (rect.h - 30 - (rows - 1) * gap) / rows));
  const result: Array<{ id: string; rect: Rect }> = [];
  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const chip: Rect = {
      x: rect.x + 12 + col * (chipW + gap),
      y: rect.y + 26 + row * (chipH + gap),
      w: chipW,
      h: chipH,
    };
    const amount = item.id === 'water' && infiniteWater ? Infinity : (store[item.id] ?? 0);
    const usable = amount > 0;
    ctx.save();
    ctx.globalAlpha = usable ? 1 : 0.4;
    inkRoundRect(ctx, chip.x, chip.y, chip.w, chip.h, RADIUS.sm, 'rgba(255,253,248,0.94)', {
      stroke: usable ? 'rgba(58,46,42,0.12)' : 'rgba(58,46,42,0.07)',
      width: 1.2,
      seed: 1893 + index,
    });
    if (stacked) {
      drawGoods(ctx, item.id, chip.x + chip.w / 2, chip.y + chip.h * 0.36, Math.min(24, chip.h * 0.52));
      drawText(ctx, item.name, chip.x + chip.w / 2, chip.y + chip.h - 7, {
        size: 9.5,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
        maxWidth: chip.w - 6,
      });
      drawText(ctx, amount === Infinity ? '∞' : `×${amount}`, chip.x + chip.w - 5, chip.y + 11, {
        size: 9,
        weight: '700',
        color: amount === Infinity ? COLORS.jade : COLORS.honeyDeep,
        align: 'right',
      });
    } else {
      drawGoods(ctx, item.id, chip.x + chip.h * 0.5, chip.y + chip.h / 2, chip.h * 0.7);
      drawText(ctx, item.name, chip.x + chip.h + 2, chip.y + chip.h / 2 - 4, {
        size: 10,
        weight: '700',
        color: COLORS.ink,
        maxWidth: chip.w - chip.h - 28,
      });
      drawText(ctx, amount === Infinity ? '∞' : `×${amount}`, chip.x + chip.w - 4, chip.y + chip.h / 2 - 3, {
        size: 9.5,
        weight: '700',
        color: amount === Infinity ? COLORS.jade : COLORS.honeyDeep,
        align: 'right',
      });
    }
    ctx.restore();
    if (usable) result.push({ id: item.id, rect: chip });
  });
  return result;
}

export function drawPreparedShelf(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  dishes: ReadonlyArray<PreparedDish | null>,
  selected: number | null,
): Rect[] {
  drawPaperPanel(ctx, rect, {
    fill: 'rgba(255,253,248,0.82)',
    radius: RADIUS.lg,
    stitch: false,
    seed: 1921,
  });
  drawText(ctx, '成品柜 · 品质锁定，暂停焦糊', rect.x + 12, rect.y + 17, {
    size: 10.5,
    color: COLORS.inkSoft,
  });
  const cellW = (rect.w - 24 - 5 * 5) / Math.max(1, dishes.length);
  const result: Rect[] = [];
  dishes.forEach((dish, index) => {
    const cell: Rect = {
      x: rect.x + 12 + index * (cellW + 5),
      y: rect.y + 22,
      w: cellW,
      h: rect.h - 28,
    };
    result.push(cell);
    const active = selected === index;
    inkRoundRect(ctx, cell.x, cell.y, cell.w, cell.h, RADIUS.sm, dish ? COLORS.cream : 'rgba(58,46,42,0.06)', {
      stroke: active ? COLORS.gold : 'rgba(58,46,42,0.12)',
      width: active ? 2.2 : 1,
      seed: 1923 + index,
    });
    if (!dish) {
      drawText(ctx, '空', cell.x + cell.w / 2, cell.y + cell.h / 2 + 3, {
        size: 10,
        color: 'rgba(107,91,84,0.4)',
        align: 'center',
      });
      return;
    }
    drawGoods(ctx, dish.id, cell.x + 15, cell.y + cell.h / 2, Math.min(26, cell.h * 0.66));
    drawText(ctx, ingredientName(dish.id), cell.x + 28, cell.y + 12, {
      size: 9,
      weight: '700',
      color: COLORS.ink,
      maxWidth: cell.w - 30,
    });
    drawQualityBadge(ctx, cell.x + cell.w - 5, cell.y + cell.h - 5, dish.quality, 'right');
  });
  return result;
}

export function drawQualityBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  quality: number,
  align: 'left' | 'right' = 'left',
): void {
  const text = quality >= 0.99 ? '100%' : `${Math.round(quality * 100)}%`;
  const color =
    quality >= 0.99 ? COLORS.jade : quality >= 0.5 ? COLORS.honeyDeep : COLORS.coral;
  drawText(ctx, text, x, y, {
    size: 9,
    weight: '700',
    color,
    align,
  });
}
