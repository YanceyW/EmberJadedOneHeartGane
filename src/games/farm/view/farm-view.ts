import { Renderer } from '../../../core/render/renderer';
import { drawStar, drawText, drawWangduCoin, Rect } from '../../../shared/design-system/draw';
import { inkLine, inkRoundRect } from '../../../shared/design-system/paint';
import {
  drawPaperPanel,
  drawStickerButton,
  drawTapeNote,
} from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS, TOWN_COLORS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import { CROPS, FARM_PLOT_COSTS, findCrop } from '../data/crops';
import {
  canFulfillOrder,
  currentOrder,
  FarmSave,
  FarmStore,
  nextPlotCost,
  plotView,
  remainingSeconds,
} from '../systems/farm';
import { drawCrop, drawReadyTag, drawSeedPacket, drawSoilPlot } from './crop-art';

export type FarmHit =
  | { kind: 'back' }
  | { kind: 'seed'; cropId: string }
  | { kind: 'plot'; index: number }
  | { kind: 'order' }
  | { kind: 'sell' }
  | { kind: 'unlock' }
  | { kind: 'harvest-all' };

interface FarmLayout {
  back: Rect;
  title: Rect;
  coin: Rect;
  plots: Rect[];
  seeds: Array<{ cropId: string; rect: Rect }>;
  order: Rect;
  sell: Rect;
  unlock: Rect;
  harvestAll: Rect;
}

const EMPTY_RECT: Rect = { x: 0, y: 0, w: 0, h: 0 };

/**
 * QQ 农场式田地：3×3 方块土地 + 底部种子篮 + 订单条。
 * 视角仍是纸雕俯视，不做真 3D；所有土地/作物共用 crop-art 的画法。
 */
export class FarmView {
  private layout: FarmLayout = {
    back: { ...EMPTY_RECT },
    title: { ...EMPTY_RECT },
    coin: { ...EMPTY_RECT },
    plots: [],
    seeds: [],
    order: { ...EMPTY_RECT },
    sell: { ...EMPTY_RECT },
    unlock: { ...EMPTY_RECT },
    harvestAll: { ...EMPTY_RECT },
  };

  render(
    renderer: Renderer,
    save: FarmSave,
    store: FarmStore,
    selectedCrop: string,
    now: number,
    message: string,
    coins: number,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;
    const bottom = renderer.height - renderer.safeBottom - 18;
    const compact = bottom - top < 1150;

    this.drawBackdrop(ctx, width, top, bottom, compact);
    this.drawHeader(ctx, renderer, top, coins);

    const gap = compact ? 10 : 14;
    const seedColumns = 5;
    const seedRows = Math.ceil(CROPS.length / seedColumns);
    const seedChipH = compact ? 54 : 60;
    const seedRowGap = 8;
    const seedH = seedRows * seedChipH + (seedRows - 1) * seedRowGap;
    const orderH = compact ? 134 : 146;
    const btnH = 52;
    const sceneH = compact ? 96 : 124;
    const gridTop = top + 66 + 16 + sceneH;
    const gridBottom = bottom - (seedH + orderH + btnH + gap * 4);
    const plotGap = compact ? 8 : 12;
    const plotW = (width - 88 - plotGap * 2) / 3;
    const plotH = Math.min(plotW + 8, (gridBottom - gridTop - plotGap * 2) / 3);
    const gridH = plotH * 3 + plotGap * 2;
    const gridX = (width - (plotW * 3 + plotGap * 2)) / 2;
    const gridY = gridTop + Math.max(0, (gridBottom - gridTop - gridH) / 2);

    this.drawSceneBand(ctx, width, gridTop, sceneH);
    this.drawFieldFrame(ctx, gridX, gridY, plotW * 3 + plotGap * 2, gridH);

    this.layout.plots = [];
    for (let index = 0; index < 9; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const rect: Rect = {
        x: gridX + col * (plotW + plotGap),
        y: gridY + row * (plotH + plotGap),
        w: plotW,
        h: plotH,
      };
      this.layout.plots.push(rect);
      this.drawPlot(ctx, rect, index, save, selectedCrop, now);
    }

    const seedY = gridY + gridH + gap + 10;
    this.layout.seeds = [];
    const seedW = (width - 96 - (seedColumns - 1) * 10) / seedColumns;
    CROPS.forEach((crop, index) => {
      const row = Math.floor(index / seedColumns);
      const col = index % seedColumns;
      const rect: Rect = {
        x: 48 + col * (seedW + 10),
        y: seedY + row * (seedChipH + seedRowGap),
        w: seedW,
        h: seedChipH,
      };
      this.layout.seeds.push({ cropId: crop.id, rect });
      drawSeedPacket(ctx, rect, crop, selectedCrop === crop.id, store[crop.id] ?? 0);
    });

    const orderY = seedY + seedH + gap;
    this.layout.order = { x: 48, y: orderY, w: width - 96, h: orderH };
    this.drawOrder(ctx, this.layout.order, save, store);

    const btnY = orderY + orderH + gap;
    const btnW = (width - 96 - 16) / 3;
    this.layout.harvestAll = { x: 48, y: btnY, w: btnW, h: btnH };
    this.layout.sell = { x: 48 + btnW + 8, y: btnY, w: btnW, h: btnH };
    this.layout.unlock = { x: 48 + (btnW + 8) * 2, y: btnY, w: btnW, h: btnH };
    this.drawActions(ctx, save, store, now);

    if (message) {
      const noteW = Math.min(520, width - 220);
      drawTapeNote(
        ctx,
        { x: (width - noteW) / 2, y: top + 74, w: noteW, h: 44 },
        [message],
      );
    }
  }

  plotCenter(index: number): { x: number; y: number } {
    const rect = this.layout.plots[index];
    if (!rect) return { x: 375, y: 400 };
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  hitTest(x: number, y: number): FarmHit | null {
    if (inside(x, y, this.layout.back)) return { kind: 'back' };
    for (const seed of this.layout.seeds) {
      if (inside(x, y, seed.rect)) return { kind: 'seed', cropId: seed.cropId };
    }
    for (let index = 0; index < this.layout.plots.length; index += 1) {
      if (inside(x, y, this.layout.plots[index])) return { kind: 'plot', index };
    }
    if (inside(x, y, this.layout.order)) return { kind: 'order' };
    if (inside(x, y, this.layout.sell)) return { kind: 'sell' };
    if (inside(x, y, this.layout.unlock)) return { kind: 'unlock' };
    if (inside(x, y, this.layout.harvestAll)) return { kind: 'harvest-all' };
    return null;
  }

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    top: number,
    bottom: number,
    compact: boolean,
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, bottom);
    gradient.addColorStop(0, COLORS.cream);
    gradient.addColorStop(0.4, 'rgba(168,230,207,0.5)');
    gradient.addColorStop(1, COLORS.grass);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, bottom);

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(width - 82, top + 40, compact ? 40 : 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COLORS.paper;
    for (const [dx, dy, radius] of [
      [0, 0, 30],
      [32, -10, 38],
      [68, 4, 26],
    ] as const) {
      ctx.beginPath();
      ctx.arc(108 + dx, top + 62 + dy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHeader(
    ctx: CanvasRenderingContext2D,
    renderer: Renderer,
    top: number,
    coins: number,
  ): void {
    this.layout.back = { x: 40, y: top, w: 96, h: 56 };
    drawStickerButton(ctx, this.layout.back, '←', {
      fill: COLORS.paper,
      textColor: COLORS.ink,
      fontSize: 30,
      radius: RADIUS.md,
      seed: 1001,
    });

    this.layout.title = { x: 150, y: top - 4, w: 370, h: 66 };
    drawPaperPanel(ctx, this.layout.title, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1003,
    });
    drawText(ctx, '王都农场', this.layout.title.x + this.layout.title.w / 2, top + 24, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '九块田地 · 种子用王都币买', this.layout.title.x + this.layout.title.w / 2, top + 48, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });

    this.layout.coin = { x: renderer.width - 206, y: top + 2, w: 166, h: 52 };
    inkRoundRect(
      ctx,
      this.layout.coin.x,
      this.layout.coin.y,
      this.layout.coin.w,
      this.layout.coin.h,
      26,
      COLORS.paper,
      { stroke: 'rgba(58,46,42,0.24)', width: 2, seed: 1005 },
    );
    drawWangduCoin(ctx, this.layout.coin.x + 30, this.layout.coin.y + 26, 14);
    drawText(ctx, compactNumber(coins), this.layout.coin.x + 54, this.layout.coin.y + 26, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });
  }

  /** 田地后方的小景：谷仓、风车、篱笆和树，把首页王都的纸雕语言延伸过来。 */
  private drawSceneBand(
    ctx: CanvasRenderingContext2D,
    width: number,
    gridTop: number,
    sceneH: number,
  ): void {
    const base = gridTop - 8;
    const scale = Math.min(1, sceneH / 124);

    // 远处篱笆
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = TOWN_COLORS.wood;
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 14; i += 1) {
      const x = 40 + i * 54;
      ctx.beginPath();
      ctx.moveTo(x, base - 18 * scale);
      ctx.lineTo(x, base - 40 * scale);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(30, base - 30 * scale);
    ctx.lineTo(width - 30, base - 30 * scale);
    ctx.stroke();
    ctx.restore();

    // 左侧风车
    const millX = 92;
    const millBase = base - 4;
    ctx.save();
    ctx.translate(millX, millBase);
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.cream;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-12, -64);
    ctx.lineTo(12, -64);
    ctx.lineTo(22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, -64);
    ctx.lineTo(0, -80);
    ctx.lineTo(18, -64);
    ctx.closePath();
    ctx.fillStyle = COLORS.berry;
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.translate(0, -74);
      ctx.rotate((Math.PI / 2) * i + 0.35);
      ctx.fillStyle = COLORS.paper;
      ctx.strokeStyle = COLORS.inkSoft;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-5, -24);
      ctx.lineTo(8, -27);
      ctx.lineTo(10, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, -74, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.honeyDeep;
    ctx.fill();
    ctx.restore();

    // 右侧谷仓
    const barnX = width - 150;
    ctx.save();
    ctx.translate(barnX, base);
    ctx.scale(scale, scale);
    inkRoundRect(ctx, -46, -62, 92, 62, 8, COLORS.cream, {
      stroke: COLORS.ink,
      width: 2.4,
      seed: 1081,
    });
    ctx.beginPath();
    ctx.moveTo(-56, -58);
    ctx.lineTo(0, -92);
    ctx.lineTo(56, -58);
    ctx.closePath();
    ctx.fillStyle = COLORS.berry;
    ctx.fill();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    inkRoundRect(ctx, -16, -40, 32, 40, 4, TOWN_COLORS.wood, {
      stroke: TOWN_COLORS.woodDeep,
      width: 2,
      seed: 1083,
    });
    inkLine(ctx, [{ x: -12, y: -36 }, { x: 12, y: -6 }], {
      stroke: TOWN_COLORS.woodDeep,
      width: 3,
      seed: 1085,
      wobble: 0.1,
    });
    ctx.restore();

    // 两棵小树
    for (const [x, s] of [
      [210, 0.9],
      [width - 250, 0.8],
    ] as const) {
      const y = base - 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale * s, scale * s);
      inkLine(ctx, [{ x: 0, y: 0 }, { x: 0, y: -26 }], {
        stroke: TOWN_COLORS.woodDeep,
        width: 5,
        seed: 1091 + x,
        wobble: 0.2,
      });
      ctx.beginPath();
      ctx.arc(0, -38, 18, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.leaf;
      ctx.fill();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-7, -44, 9, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.mint;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFieldFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    inkRoundRect(ctx, x - 16, y - 16, width + 32, height + 32, 24, 'rgba(168,230,207,0.42)', {
      stroke: 'rgba(90,130,74,0.35)',
      width: 2,
      seed: 1095,
      wobble: 0.3,
    });
    // 木桩围栏：只在上下各一排，避免挡住土地。
    ctx.save();
    ctx.strokeStyle = TOWN_COLORS.woodDeep;
    ctx.fillStyle = TOWN_COLORS.wood;
    ctx.lineWidth = 2;
    for (const edgeY of [y - 14, y + height + 14]) {
      for (let i = 0; i <= 6; i += 1) {
        const px = x + (i * width) / 6;
        inkRoundRect(ctx, px - 5, edgeY - 12, 10, 20, 4, TOWN_COLORS.wood, {
          stroke: TOWN_COLORS.woodDeep,
          width: 1.6,
          seed: 1101 + i + Math.round(edgeY),
        });
      }
      ctx.beginPath();
      ctx.moveTo(x - 6, edgeY);
      ctx.lineTo(x + width + 6, edgeY);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlot(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    index: number,
    save: FarmSave,
    selectedCrop: string,
    now: number,
  ): void {
    const view = plotView(save, index, now);
    drawSoilPlot(ctx, rect, view === 'locked' ? 'locked' : 'normal', 1021 + index);

    if (view === 'locked') {
      // 只有紧挨着已开垦区域的那块能买，后面的先显示「待开垦」。
      const isNext = index === save.plotsUnlocked;
      const cost = FARM_PLOT_COSTS[index] ?? 0;
      this.drawLock(ctx, rect.x + rect.w / 2, rect.y + rect.h / 2 - 18);
      drawText(ctx, isNext ? '扩建土地' : '待开垦', rect.x + rect.w / 2, rect.y + rect.h / 2 + 26, {
        size: 17,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
      });
      drawText(
        ctx,
        isNext ? `${cost} 王都币` : '先开上一块',
        rect.x + rect.w / 2,
        rect.y + rect.h / 2 + 52,
        {
          size: 15,
          weight: '700',
          color: isNext ? COLORS.honeyDeep : COLORS.inkSoft,
          align: 'center',
        },
      );
      return;
    }

    if (view === 'empty') {
      const crop = findCrop(selectedCrop);
      ctx.save();
      ctx.globalAlpha = 0.42;
      inkRoundRect(
        ctx,
        rect.x + rect.w * 0.24,
        rect.y + rect.h * 0.2,
        rect.w * 0.52,
        rect.h * 0.42,
        14,
        'rgba(255,253,248,0.5)',
        { stroke: COLORS.paper, width: 2, seed: 1121 + index },
      );
      ctx.restore();
      drawText(ctx, '＋', rect.x + rect.w / 2, rect.y + rect.h * 0.46, {
        size: 40,
        color: COLORS.paper,
        align: 'center',
      });
      drawText(ctx, `点一下种${crop?.name ?? '小麦'}`, rect.x + rect.w / 2, rect.y + rect.h - 34, {
        size: 15,
        weight: '700',
        color: COLORS.paper,
        align: 'center',
      });
      drawText(ctx, `−${crop?.seedCost ?? 0} 币`, rect.x + rect.w / 2, rect.y + rect.h - 14, {
        size: 12,
        weight: '700',
        color: COLORS.paper,
        align: 'center',
      });
      return;
    }

    const plot = save.plots[index];
    const crop = plot ? findCrop(plot.cropId) : undefined;
    if (!crop || !plot) return;

    const progress =
      view === 'ready' ? 1 : Math.min(0.97, (now - plot.plantedAt) / (crop.growSeconds * 1000));
    const centerY = rect.y + rect.h * 0.52;
    const bob = view === 'ready' ? Math.sin(now / 190) * 2.5 : 0;

    if (view === 'ready') {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(now / 180) * 0.08;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(rect.x + rect.w / 2, centerY, rect.w * 0.36, rect.h * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawStar(ctx, rect.x + rect.w - 32, rect.y + 40, 7, 3, COLORS.gold);
      drawReadyTag(ctx, rect.x + rect.w / 2, rect.y + 22);
    }

    drawCrop(ctx, rect.x + rect.w / 2, centerY + bob, rect.w * 0.44, crop, progress);

    const bar: Rect = {
      x: rect.x + 18,
      y: rect.y + rect.h - 22,
      w: rect.w - 36,
      h: 8,
    };
    inkRoundRect(ctx, bar.x, bar.y, bar.w, bar.h, 4, 'rgba(58,46,42,0.18)', { width: 0 });
    inkRoundRect(
      ctx,
      bar.x,
      bar.y,
      bar.w * (view === 'ready' ? 1 : progress),
      bar.h,
      4,
      view === 'ready' ? COLORS.gold : COLORS.mint,
      { width: 0 },
    );

    if (view !== 'ready') {
      drawText(ctx, `${remainingSeconds(save, index, now)}s`, rect.x + rect.w - 18, bar.y - 8, {
        size: 14,
        weight: '700',
        color: COLORS.paper,
        align: 'right',
      });
    }
  }

  private drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    inkRoundRect(ctx, cx - 15, cy - 4, 30, 26, 7, COLORS.paper, {
      stroke: COLORS.inkSoft,
      width: 2,
      seed: 1131,
    });
    ctx.strokeStyle = COLORS.inkSoft;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 10, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fill();
  }

  private drawOrder(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    save: FarmSave,
    store: FarmStore,
  ): void {
    drawPaperPanel(ctx, rect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1041,
    });
    const order = currentOrder(save);
    const compact = rect.h < 140;
    drawText(ctx, '今日订单', rect.x + 18, rect.y + 22, {
      size: 13,
      color: COLORS.inkSoft,
    });
    drawText(ctx, order.title, rect.x + 18, rect.y + (compact ? 46 : 48), {
      size: compact ? 17 : FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    let needX = rect.x + 18;
    const needY = rect.y + (compact ? 78 : 84);
    for (const need of order.needs) {
      const crop = findCrop(need.cropId);
      if (!crop) continue;
      const have = store[need.cropId] ?? 0;
      const ready = have >= need.amount;
      drawCrop(ctx, needX + 16, needY, 30, crop, 1);
      drawText(ctx, `${crop.name} ${have}/${need.amount}`, needX + 36, needY, {
        size: 14,
        color: ready ? COLORS.jade : COLORS.inkSoft,
        weight: ready ? '700' : 'normal',
      });
      needX += 168;
    }

    drawWangduCoin(ctx, rect.x + 20, rect.y + rect.h - 24, 12);
    drawText(ctx, `+${order.coins}`, rect.x + 38, rect.y + rect.h - 24, {
      size: 18,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, `繁荣 +${order.prosperity}`, rect.x + 96, rect.y + rect.h - 24, {
      size: 14,
      color: COLORS.inkSoft,
    });

    const ready = canFulfillOrder(save, store);
    const button: Rect = {
      x: rect.x + rect.w - 140,
      y: rect.y + rect.h - 70,
      w: 120,
      h: 46,
    };
    drawStickerButton(ctx, button, ready ? '交付订单' : '缺食材', {
      fill: ready ? COLORS.jade : 'rgba(58,46,42,0.10)',
      textColor: ready ? COLORS.paper : COLORS.inkSoft,
      fontSize: 16,
      radius: RADIUS.md,
      disabled: !ready,
      seed: 1043,
    });
  }

  private drawActions(
    ctx: CanvasRenderingContext2D,
    save: FarmSave,
    store: FarmStore,
    now: number,
  ): void {
    let readyCount = 0;
    for (let index = 0; index < save.plots.length; index += 1) {
      if (plotView(save, index, now) === 'ready') readyCount += 1;
    }
    drawStickerButton(ctx, this.layout.harvestAll, `一键收获 ${readyCount || ''}`.trim(), {
      fill: readyCount > 0 ? COLORS.jade : 'rgba(58,46,42,0.08)',
      textColor: readyCount > 0 ? COLORS.paper : COLORS.inkSoft,
      fontSize: 16,
      radius: RADIUS.md,
      seed: 1141,
    });

    let value = 0;
    let count = 0;
    for (const crop of CROPS) {
      const amount = store[crop.id] ?? 0;
      value += amount * crop.sellPrice;
      count += amount;
    }
    drawStickerButton(ctx, this.layout.sell, count > 0 ? `卖出 +${value}` : '仓库空', {
      fill: count > 0 ? COLORS.gold : 'rgba(58,46,42,0.08)',
      textColor: count > 0 ? COLORS.honeyDeep : COLORS.inkSoft,
      fontSize: 16,
      radius: RADIUS.md,
      seed: 1151,
    });

    const cost = nextPlotCost(save);
    drawStickerButton(ctx, this.layout.unlock, cost === null ? '土地全开' : `开垦 ${cost}`, {
      fill: cost === null ? 'rgba(58,46,42,0.08)' : COLORS.peach,
      textColor: cost === null ? COLORS.inkSoft : COLORS.ink,
      fontSize: 16,
      radius: RADIUS.md,
      seed: 1161,
    });
  }
}

function inside(x: number, y: number, rect: Rect): boolean {
  return rect.w > 0 && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
