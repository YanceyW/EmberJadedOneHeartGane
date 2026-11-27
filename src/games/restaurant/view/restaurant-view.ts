import { Renderer } from '../../../core/render/renderer';
import { Rect, drawText, drawWangduCoin } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { drawPaperPanel, drawSegmented, drawStickerButton, drawTapeNote } from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import { ShiftState, ShiftSummary } from '../systems/shift';
import { CraftTab, RestaurantPage, RestaurantViewState } from './restaurant-view-data';
import { DragGhost, KitchenPageLayout, RestaurantHit, ShiftPageLayout } from './restaurant-types';
import { drawKitchenPage } from './kitchen-page';
import { drawOrderPage } from './order-view';
import { drawShiftPage } from './shift-page';
import { drawExitOverlay, drawSettleOverlay } from './overlay-view';

interface Layout {
  back: Rect;
  pages: Record<RestaurantPage, Rect>;
  craftTabs: Record<CraftTab, Rect>;
  counter: Rect[];
  stoves: KitchenPageLayout['stoves'];
  palette: Array<{ id: string; rect: Rect; locked?: boolean }>;
  paletteBin: Rect;
  palettePrev: Rect;
  paletteNext: Rect;
  prepared: Rect[];
  customers: Array<{ id: number; rect: Rect }>;
  tables: Rect[];
  suggestions: Rect[];
  closeShift: Rect;
  settle: Rect;
  exitPanel: Rect;
  exitContinue: Rect;
  exitClose: Rect;
  exitLeave: Rect;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

function emptyLayout(): Layout {
  return {
    back: { ...EMPTY },
    pages: { kitchen: { ...EMPTY }, order: { ...EMPTY }, shift: { ...EMPTY } },
    craftTabs: { farm: { ...EMPTY }, ranch: { ...EMPTY }, processed: { ...EMPTY } },
    counter: [],
    stoves: [],
    palette: [],
    paletteBin: { ...EMPTY },
    palettePrev: { ...EMPTY },
    paletteNext: { ...EMPTY },
    prepared: [],
    customers: [],
    tables: [],
    suggestions: [],
    closeShift: { ...EMPTY },
    settle: { ...EMPTY },
    exitPanel: { ...EMPTY },
    exitContinue: { ...EMPTY },
    exitClose: { ...EMPTY },
    exitLeave: { ...EMPTY },
  };
}

export class RestaurantView {
  private layout: Layout = emptyLayout();
  private page: RestaurantPage = 'kitchen';

  render(
    renderer: Renderer,
    state: RestaurantViewState,
    page: RestaurantPage,
    craftTab: CraftTab,
    shift: ShiftState | null,
    selectedPrepared: number | null,
    drag: DragGhost | null,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;
    const bottom = renderer.height - renderer.safeBottom - 18;
    this.page = page;
    this.layout = emptyLayout();

    const gradient = ctx.createLinearGradient(0, 0, 0, bottom);
    gradient.addColorStop(0, '#FFF3E4');
    gradient.addColorStop(1, 'rgba(242,125,114,0.24)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, bottom);

    this.layout.back = { x: 40, y: top, w: 96, h: 56 };
    drawStickerButton(ctx, this.layout.back, '←', {
      fill: COLORS.paper,
      textColor: COLORS.ink,
      fontSize: 30,
      radius: RADIUS.md,
      seed: 1801,
    });

    const title: Rect = { x: 150, y: top - 4, w: 370, h: 66 };
    drawPaperPanel(ctx, title, { fill: COLORS.paper, radius: RADIUS.lg, stitch: true, seed: 1803 });
    drawText(ctx, '王都餐厅', title.x + title.w / 2, top + 24, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '备料 · 灶台 · 营业', title.x + title.w / 2, top + 48, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });

    const coinRect: Rect = { x: width - 206, y: top + 2, w: 166, h: 52 };
    inkRoundRect(ctx, coinRect.x, coinRect.y, coinRect.w, coinRect.h, 26, COLORS.paper, {
      stroke: 'rgba(58,46,42,0.24)',
      width: 2,
      seed: 1805,
    });
    drawWangduCoin(ctx, coinRect.x + 30, coinRect.y + 26, 14);
    drawText(ctx, compactNumber(state.coins), coinRect.x + 54, coinRect.y + 26, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    const pageRects = drawSegmented(
      ctx,
      { x: 40, y: top + 74, w: width - 80, h: 46 },
      ['备料台', '点菜', '营业'],
      page === 'kitchen' ? 0 : page === 'order' ? 1 : 2,
      COLORS.coral,
    );
    this.layout.pages = { kitchen: pageRects[0], order: pageRects[1], shift: pageRects[2] };

    const bodyTop = top + 140;
    if (page === 'kitchen') {
      const layout = drawKitchenPage(ctx, width, bodyTop, bottom, state, craftTab);
      this.layout.craftTabs = layout.craftTabs;
      this.layout.counter = layout.counter;
      this.layout.stoves = layout.stoves;
      this.layout.suggestions = layout.suggestions;
      this.layout.palette = layout.palette;
      this.layout.paletteBin = layout.paletteBin;
    } else if (page === 'order') {
      this.layout.tables = drawOrderPage(ctx, width, bodyTop, bottom, state);
    } else {
      const layout = drawShiftPage(
        ctx,
        width,
        bodyTop,
        bottom,
        shift,
        state,
        selectedPrepared,
      );
      this.applyShiftLayout(layout);
    }

    if (state.message) {
      drawTapeNote(
        ctx,
        {
          x: (width - 600) / 2,
          y: page === 'shift' ? bottom - 165 : bottom - 52,
          w: 600,
          h: 44,
        },
        [state.message],
        { align: 'center' },
      );
    }

    if (state.exitPanel) {
      const rects = drawExitOverlay(ctx, width, renderer.height, state.exitPenalty);
      this.layout.exitPanel = rects.panel;
      this.layout.exitContinue = rects.continue;
      this.layout.exitClose = rects.close;
      this.layout.exitLeave = rects.leave;
    }

    if (drag) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      drawGoods(ctx, drag.id, drag.point.x, drag.point.y, 62);
      ctx.restore();
    }
  }

  private applyShiftLayout(layout: ShiftPageLayout): void {
    this.layout.closeShift = layout.closeShift;
    this.layout.customers = layout.customers;
    this.layout.prepared = layout.prepared;
    this.layout.stoves = layout.stoves;
    this.layout.suggestions = layout.suggestions;
    this.layout.counter = layout.counter;
    this.layout.palette = layout.palette;
    this.layout.paletteBin = layout.paletteBin;
    this.layout.palettePrev = layout.palettePrev;
    this.layout.paletteNext = layout.paletteNext;
  }

  supplyBinRect(): Rect {
    return this.layout.paletteBin;
  }

  drawSettle(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    summary: ShiftSummary | null,
    perfectCloses = 0,
  ): void {
    const settle = drawSettleOverlay(ctx, width, height, summary, perfectCloses);
    this.layout.settle = settle ?? { ...EMPTY };
  }

  hitTest(x: number, y: number): RestaurantHit | null {
    const inside = (rect: Rect) =>
      x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    if (this.layout.settle.w > 0 && inside(this.layout.settle)) return { kind: 'settle' };
    if (this.layout.settle.w > 0) return null;
    if (this.layout.exitPanel.w > 0) {
      if (inside(this.layout.exitContinue)) return { kind: 'exit-continue' };
      if (inside(this.layout.exitClose)) return { kind: 'exit-close' };
      if (inside(this.layout.exitLeave)) return { kind: 'exit-leave' };
      return null;
    }
    if (inside(this.layout.back)) return { kind: 'back' };
    for (const page of ['kitchen', 'order', 'shift'] as RestaurantPage[]) {
      if (inside(this.layout.pages[page])) return { kind: 'page', page };
    }
    for (let index = 0; index < this.layout.suggestions.length; index += 1) {
      if (inside(this.layout.suggestions[index])) return { kind: 'suggestion', index };
    }
    if (this.page === 'kitchen') {
      for (const tab of ['farm', 'ranch', 'processed'] as CraftTab[]) {
        if (inside(this.layout.craftTabs[tab])) return { kind: 'craft-tab', tab };
      }
      for (const chip of this.layout.palette) {
        if (inside(chip.rect)) return { kind: 'palette', id: chip.id };
      }
      if (inside(this.layout.paletteBin)) return { kind: 'palette-bin' };
      for (let index = 0; index < this.layout.counter.length; index += 1) {
        if (inside(this.layout.counter[index])) return { kind: 'counter', index };
      }
      for (let index = 0; index < this.layout.stoves.length; index += 1) {
        const stove = this.layout.stoves[index];
        if (inside(stove.fire)) return { kind: 'stove-fire', index };
        for (let cell = 0; cell < stove.cells.length; cell += 1) {
          if (inside(stove.cells[cell])) return { kind: 'stove', index, cell };
        }
        if (inside(stove.card)) return { kind: 'stove', index };
      }
      return null;
    }
    if (this.page === 'order') {
      for (let index = 0; index < this.layout.tables.length; index += 1) {
        if (inside(this.layout.tables[index])) return { kind: 'serve-table', index };
      }
      return null;
    }
    if (inside(this.layout.closeShift)) return { kind: 'close-shift' };
    if (this.layout.palettePrev.w > 0 && inside(this.layout.palettePrev)) {
      return { kind: 'supply-arrow', direction: -1 };
    }
    if (this.layout.paletteNext.w > 0 && inside(this.layout.paletteNext)) {
      return { kind: 'supply-arrow', direction: 1 };
    }
    for (const chip of this.layout.palette) {
      if (inside(chip.rect)) return { kind: 'palette', id: chip.id, locked: chip.locked };
    }
    if (inside(this.layout.paletteBin)) return { kind: 'palette-bin' };
    for (let index = 0; index < this.layout.counter.length; index += 1) {
      if (inside(this.layout.counter[index])) return { kind: 'counter', index };
    }
    for (let index = 0; index < this.layout.stoves.length; index += 1) {
      const stove = this.layout.stoves[index];
      if (inside(stove.fire)) return { kind: 'stove-fire', index };
      for (let cell = 0; cell < stove.cells.length; cell += 1) {
        if (inside(stove.cells[cell])) return { kind: 'stove', index, cell };
      }
      if (inside(stove.card)) return { kind: 'stove', index };
    }
    for (let index = 0; index < this.layout.prepared.length; index += 1) {
      if (inside(this.layout.prepared[index])) return { kind: 'prepared', index };
    }
    for (const customer of this.layout.customers) {
      if (inside(customer.rect)) return { kind: 'customer', id: customer.id };
    }
    return null;
  }
}
