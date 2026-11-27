import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawSegmented, drawTapeNote } from '../../../shared/design-system/paper-ui';
import { COLORS } from '../../../shared/design-system/tokens';
import {
  CRAFT_TABS,
  CraftTab,
  RestaurantViewState,
  craftInputs,
} from './restaurant-view-data';
import { KitchenPageLayout } from './restaurant-types';
import { drawCounter, drawPalette } from './counter-view';
import { drawStove } from './stove-view';
import { drawSuggestions } from './suggestion-view';

export function drawKitchenPage(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  bottom: number,
  state: RestaurantViewState,
  craftTab: CraftTab,
): KitchenPageLayout {
  const tabRects = drawSegmented(
    ctx,
    { x: 48, y: top, w: width - 96, h: 42 },
    CRAFT_TABS.map((tab) => tab.label),
    Math.max(0, CRAFT_TABS.findIndex((tab) => tab.id === craftTab)),
    COLORS.jade,
  );
  const craftTabs: Record<CraftTab, Rect> = {
    farm: tabRects[0],
    ranch: tabRects[1],
    processed: tabRects[2],
  };

  drawTapeNote(
    ctx,
    { x: 48, y: top + 48, w: width - 96, h: 42 },
    ['每格只放一件：2 件相邻、3 件三连/L、4 件方块/T；摆好自动开火'],
    { align: 'center' },
  );

  const gap = 8;
  const extra = Math.max(0, bottom - top - 928);
  const counterTop = top + 98;
  const counterCellW = (width - 96 - gap * 4) / 5;
  const counterCellH = 96 + Math.min(28, Math.floor(extra * 0.1));
  const counter: Rect[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      counter.push({
        x: 48 + col * (counterCellW + gap),
        y: counterTop + row * (counterCellH + gap),
        w: counterCellW,
        h: counterCellH,
      });
    }
  }
  drawCounter(ctx, counter, state.counter, state.selectedCounter);
  if (state.counter.every((id) => !id)) {
    drawText(ctx, '把配料拖到这里', width / 2, counterTop + counterCellH * 1.5 + gap, {
      size: 15,
      weight: '700',
      color: 'rgba(107,91,84,0.42)',
      align: 'center',
    });
  }

  const stoveTop = counterTop + 3 * counterCellH + 2 * gap + 8;
  const stoveGap = 10;
  const stoveW = (width - 96 - stoveGap) / 2;
  const stoveH = 240 + Math.min(40, Math.floor(extra * 0.14));
  const stoves = state.stoves.slice(0, 2).map((stove, index) =>
    drawStove(
      ctx,
      { x: 48 + index * (stoveW + stoveGap), y: stoveTop, w: stoveW, h: stoveH },
      stove,
      index,
      state.selectedStove === index,
      state.ghost?.index === index ? state.ghost.recipe : undefined,
    ),
  );

  const suggestionTop = stoveTop + stoveH + 8;
  const suggestionH = 54 + Math.min(12, Math.floor(extra * 0.04));
  const suggestions = threeRects(48, width - 96, suggestionTop + 6, suggestionH - 12);
  drawSuggestions(
    ctx,
    { x: 48, y: suggestionTop, w: width - 96, h: suggestionH },
    state.suggestions,
    '拖动或点选物品，这里会出现半透明组合建议',
  );

  const paletteTop = suggestionTop + suggestionH + 8;
  const paletteBin = { x: 48, y: paletteTop, w: width - 96, h: Math.max(90, bottom - paletteTop - 6) };
  const palette = drawPalette(
    ctx,
    paletteBin,
    craftInputs(craftTab),
    state.store,
    true,
    5,
    '配料 · 点一下放进备料台，再从备料台拖到灶眼',
  );
  const contentBottom = palette.reduce(
    (max, chip) => Math.max(max, chip.rect.y + chip.rect.h),
    paletteBin.y + 30,
  );
  if (paletteBin.y + paletteBin.h - contentBottom > 86) {
    drawTapeNote(
      ctx,
      {
        x: paletteBin.x + 16,
        y: contentBottom + 12,
        w: paletteBin.w - 32,
        h: 58,
      },
      [
        `已发现 ${state.save.discovered.length} 种配方：拖动原料时才给当前可行建议，不塞配方簿`,
        '图案：2 件相邻 / 3 件三连或 L / 4 件方块或 T；摆好会自动开火',
      ],
      { align: 'center' },
    );
  } else if (paletteBin.h > 180) {
    drawText(
      ctx,
      `已发现 ${state.save.discovered.length} 种配方`,
      paletteBin.x + 12,
      paletteBin.y + paletteBin.h - 10,
      {
        size: 10,
        color: COLORS.inkSoft,
        maxWidth: paletteBin.w - 24,
      },
    );
  }

  return { craftTabs, counter, stoves, suggestions, palette, paletteBin };
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
