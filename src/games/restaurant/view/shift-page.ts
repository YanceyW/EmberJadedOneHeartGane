import { Rect, drawText, drawWangduCoin } from '../../../shared/design-system/draw';
import { drawPaperPanel, drawStickerButton } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { findIngredient } from '../../../shared/content/ingredients';
import { compactNumber } from '../../../shared/format';
import {
  SHIFT_SEATS,
  ShiftState,
  shiftAverageQuality,
} from '../systems/shift';
import { RestaurantViewState } from './restaurant-view-data';
import { ShiftPageLayout } from './restaurant-types';
import { drawCounter, drawPalette, drawPreparedShelf } from './counter-view';
import { drawStove } from './stove-view';
import { drawSuggestions } from './suggestion-view';
import { drawCustomerRow } from './shift-view';

export function drawShiftPage(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
  shift: ShiftState | null,
  state: RestaurantViewState,
  selectedPrepared: number | null,
): ShiftPageLayout {
  const base: ShiftPageLayout = {
    closeShift: { x: 0, y: 0, w: 0, h: 0 },
    customers: [],
    prepared: [],
    stoves: [],
    suggestions: [],
    counter: [],
    palette: [],
    paletteBin: { x: 0, y: 0, w: 0, h: 0 },
  };
  const bar: Rect = { x: 48, y: top, w: width - 96, h: 52 };
  drawPaperPanel(ctx, bar, { fill: COLORS.paper, radius: RADIUS.lg, stitch: true, seed: 1901 });
  if (!shift) {
    drawText(ctx, '点「开张」：客人排队，吧台原料无限供应', bar.x + 16, bar.y + 30, {
      size: 13,
      color: COLORS.inkSoft,
      maxWidth: bar.w - 170,
    });
    const start: Rect = { x: bar.x + bar.w - 144, y: bar.y + 7, w: 132, h: 38 };
    base.closeShift = start;
    drawStickerButton(ctx, start, '开张', {
      fill: COLORS.coral,
      textColor: COLORS.paper,
      fontSize: 15,
      radius: RADIUS.md,
      seed: 1903,
    });
    return base;
  }

  drawText(ctx, `营业 ${formatDuration(shift.elapsed)}`, bar.x + 16, bar.y + 20, {
    size: 13,
    weight: '700',
    color: COLORS.ink,
  });
  drawText(ctx, `客流 Lv.${shift.tier}`, bar.x + 128, bar.y + 20, {
    size: 11,
    weight: '700',
    color: COLORS.honeyDeep,
  });
  drawText(ctx, `平均品质 ${Math.round(shiftAverageQuality(shift) * 100)}%`, bar.x + 208, bar.y + 20, {
    size: 10.5,
    color: COLORS.inkSoft,
  });
  drawWangduCoin(ctx, bar.x + 16, bar.y + 38, 9);
  drawText(ctx, compactNumber(shift.revenue), bar.x + 31, bar.y + 38, {
    size: 12,
    weight: '700',
    color: COLORS.honeyDeep,
  });
  drawText(ctx, `连击 ${shift.combo} · 端出 ${shift.delivered}`, bar.x + 118, bar.y + 38, {
    size: 10.5,
    color: COLORS.inkSoft,
  });
  const close: Rect = { x: bar.x + bar.w - 116, y: bar.y + 9, w: 104, h: 34 };
  base.closeShift = close;
  drawStickerButton(ctx, close, '打烊', {
    fill: COLORS.paper,
    textColor: COLORS.ink,
    fontSize: 13,
    radius: RADIUS.md,
    seed: 1905,
  });

  const custTop = top + 60;
  const custGap = 8;
  const custW = (width - 96 - custGap * 2) / 3;
  const custH = 150;
  const customerRects: Rect[] = [];
  for (let seat = 0; seat < SHIFT_SEATS; seat += 1) {
    customerRects.push({
      x: 48 + seat * (custW + custGap),
      y: custTop,
      w: custW,
      h: custH,
    });
  }
  base.customers = drawCustomerRow(ctx, customerRects, shift.customers);

  const prepTop = custTop + custH + 8;
  base.prepared = drawPreparedShelf(
    ctx,
    { x: 48, y: prepTop, w: width - 96, h: 70 },
    shift.prepared,
    selectedPrepared,
  );

  const stoveTop = prepTop + 78;
  const stoveGap = 10;
  const stoveW = (width - 96 - stoveGap) / 2;
  const stoveH = 290;
  base.stoves = shift.stoves.slice(0, 2).map((stove, index) =>
    drawStove(
      ctx,
      { x: 48 + index * (stoveW + stoveGap), y: stoveTop, w: stoveW, h: stoveH },
      stove,
      index,
      state.selectedStove === index,
      state.ghost?.index === index ? state.ghost.recipe : undefined,
    ),
  );

  const suggestionTop = stoveTop + stoveH + 6;
  const suggestionH = 50;
  base.suggestions = threeRects(48, width - 96, suggestionTop + 5, suggestionH - 10);
  drawSuggestions(
    ctx,
    { x: 48, y: suggestionTop, w: width - 96, h: suggestionH },
    state.suggestions,
    '从下面拿材料，先补备料台，再拖进灶眼；出锅后趁热上菜',
  );

  const supplyH = 112;
  const supplyTop = bottom - supplyH;
  const counterTop = suggestionTop + suggestionH + 6;
  const gap = 6;
  const cellW = (width - 96 - gap * 4) / 5;
  const cellH = Math.max(
    52,
    Math.min(150, Math.floor((supplyTop - counterTop - 2 * gap) / 3)),
  );
  const counter: Rect[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      counter.push({
        x: 48 + col * (cellW + gap),
        y: counterTop + row * (cellH + gap),
        w: cellW,
        h: cellH,
      });
    }
  }
  base.counter = counter;
  drawCounter(ctx, counter, shift.counter, state.selectedCounter);

  const infiniteStore: Record<string, number> = {};
  for (const id of shift.supply) infiniteStore[id] = Infinity;
  base.paletteBin = { x: 48, y: supplyTop, w: width - 96, h: supplyH };
  base.palette = drawPalette(
    ctx,
    base.paletteBin,
    shift.supply.map((id) => findIngredient(id)).filter(
      (item): item is NonNullable<typeof item> => Boolean(item),
    ),
    infiniteStore,
    true,
    7,
    '无限供应 · 点一下补位，拖到备料台',
    true,
  );

  return base;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function threeRects(left: number, width: number, y: number, height: number): Rect[] {
  const gap = 6;
  const cardW = (width - 20 - gap * 2) / 3;
  return [0, 1, 2].map((index) => ({
    x: left + 10 + index * (cardW + gap),
    y,
    w: cardW,
    h: height,
  }));
}

