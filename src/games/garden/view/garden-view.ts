import { Renderer } from '../../../core/render/renderer';
import { drawStar, drawText, drawWangduCoin, Rect } from '../../../shared/design-system/draw';
import { inkRoundRect } from '../../../shared/design-system/paint';
import {
  drawPaperPanel,
  drawStickerButton,
  drawTapeNote,
} from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS, TOWN_COLORS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import { FLOWERS, findFlower, GARDEN_PLOTS } from '../data/flowers';
import {
  canFulfillFlowerOrder,
  currentFlowerOrder,
  FlowerView,
  GardenSave,
  GardenStore,
  flowerView,
  needsWater,
  remainingSeconds,
} from '../systems/garden';
import { drawFlower, drawFlowerBed, drawFlowerSeed } from './flower-art';

export type GardenHit =
  | { kind: 'back' }
  | { kind: 'seed'; flowerId: string }
  | { kind: 'plot'; index: number }
  | { kind: 'harvest-all' }
  | { kind: 'water-all' }
  | { kind: 'sell' }
  | { kind: 'order' };

interface Layout {
  back: Rect;
  plots: Rect[];
  seeds: Array<{ flowerId: string; rect: Rect }>;
  order: Rect;
  harvestAll: Rect;
  waterAll: Rect;
  sell: Rect;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

export class GardenView {
  private layout: Layout = {
    back: { ...EMPTY },
    plots: [],
    seeds: [],
    order: { ...EMPTY },
    harvestAll: { ...EMPTY },
    waterAll: { ...EMPTY },
    sell: { ...EMPTY },
  };

  render(
    renderer: Renderer,
    save: GardenSave,
    store: GardenStore,
    selectedFlower: string,
    now: number,
    message: string,
    coins: number,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;
    const bottom = renderer.height - renderer.safeBottom - 18;

    const gradient = ctx.createLinearGradient(0, 0, 0, renderer.height);
    gradient.addColorStop(0, COLORS.cream);
    gradient.addColorStop(0.55, 'rgba(209,240,215,0.7)');
    gradient.addColorStop(1, COLORS.mint);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, renderer.height);

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
    drawText(ctx, '王都花园', title.x + title.w / 2, top + 24, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '播种 · 浇水 · 收获花束', title.x + title.w / 2, top + 48, {
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
    drawText(ctx, compactNumber(coins), coinRect.x + 54, coinRect.y + 26, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    const gap = 12;
    const plotW = (width - 88 - gap * 2) / 3;
    const plotH = Math.min(210, plotW * 0.96);
    const gridX = (width - (plotW * 3 + gap * 2)) / 2;
    const gridY = top + 94;
    this.layout.plots = [];
    for (let index = 0; index < GARDEN_PLOTS; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const rect: Rect = {
        x: gridX + col * (plotW + gap),
        y: gridY + row * (plotH + gap),
        w: plotW,
        h: plotH,
      };
      this.layout.plots.push(rect);
      this.drawPlot(ctx, rect, index, save, selectedFlower, now);
    }

    const seedY = gridY + plotH * 2 + gap + 18;
    this.layout.seeds = [];
    const seedColumns = 5;
    const seedChipH = 62;
    const seedGap = 8;
    const seedW = (width - 96 - (seedColumns - 1) * 10) / seedColumns;
    FLOWERS.forEach((flower, index) => {
      const row = Math.floor(index / seedColumns);
      const col = index % seedColumns;
      const rect: Rect = {
        x: 48 + col * (seedW + 10),
        y: seedY + row * (seedChipH + seedGap),
        w: seedW,
        h: seedChipH,
      };
      this.layout.seeds.push({ flowerId: flower.id, rect });
      drawFlowerSeed(ctx, rect, flower, selectedFlower === flower.id, store[flower.id] ?? 0);
    });

    const seedRows = Math.ceil(FLOWERS.length / seedColumns);
    const seedBlockH = seedRows * seedChipH + (seedRows - 1) * seedGap;
    const orderY = seedY + seedBlockH + 14;
    this.layout.order = { x: 48, y: orderY, w: width - 96, h: 140 };
    this.drawOrder(ctx, this.layout.order, save, store);

    const btnY = orderY + 152;
    const btnW = (width - 96 - 16) / 3;
    this.layout.harvestAll = { x: 48, y: btnY, w: btnW, h: 52 };
    this.layout.waterAll = { x: 48 + btnW + 8, y: btnY, w: btnW, h: 52 };
    this.layout.sell = { x: 48 + (btnW + 8) * 2, y: btnY, w: btnW, h: 52 };

    let readyCount = 0;
    let thirsty = 0;
    for (let index = 0; index < GARDEN_PLOTS; index += 1) {
      if (flowerView(save, index, now) === 'ready') readyCount += 1;
      if (needsWater(save, index, now)) thirsty += 1;
    }
    drawStickerButton(ctx, this.layout.harvestAll, readyCount > 0 ? `一键收获 ${readyCount}` : '一键收获', {
      fill: readyCount > 0 ? COLORS.jade : 'rgba(58,46,42,0.08)',
      textColor: readyCount > 0 ? COLORS.paper : COLORS.inkSoft,
      fontSize: 15,
      radius: RADIUS.md,
      seed: 1811,
    });
    drawStickerButton(ctx, this.layout.waterAll, thirsty > 0 ? `浇全部 ${thirsty}` : '都浇过了', {
      fill: thirsty > 0 ? COLORS.water : 'rgba(58,46,42,0.08)',
      textColor: thirsty > 0 ? COLORS.paper : COLORS.inkSoft,
      fontSize: 15,
      radius: RADIUS.md,
      seed: 1813,
    });
    let value = 0;
    let count = 0;
    for (const flower of FLOWERS) {
      const amount = store[flower.id] ?? 0;
      value += amount * flower.sellPrice;
      count += amount;
    }
    drawStickerButton(ctx, this.layout.sell, count > 0 ? `卖出 +${value}` : '花篮空', {
      fill: count > 0 ? COLORS.gold : 'rgba(58,46,42,0.08)',
      textColor: count > 0 ? COLORS.honeyDeep : COLORS.inkSoft,
      fontSize: 15,
      radius: RADIUS.md,
      seed: 1815,
    });

    if (message) {
      drawTapeNote(
        ctx,
        { x: (width - 520) / 2, y: btnY + 64, w: 520, h: 44 },
        [message],
        { align: 'center' },
      );
    }

    const sceneTop = btnY + (message ? 124 : 76);
    if (bottom - sceneTop > 190) this.drawGardenScene(ctx, width, sceneTop, bottom);
  }

  /** 高屏底部留白时补一条花园角落，避免界面像没画完。 */
  private drawGardenScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    top: number,
    bottom: number,
  ): void {
    const height = Math.min(360, bottom - top);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = COLORS.mint;
    ctx.beginPath();
    ctx.ellipse(width / 2, top + height * 0.72, width * 0.6, height * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = TOWN_COLORS.wood;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, top + height * 0.38);
    ctx.lineTo(width - 60, top + height * 0.38);
    ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const x = 80 + i * ((width - 160) / 6);
      ctx.beginPath();
      ctx.moveTo(x, top + height * 0.28);
      ctx.lineTo(x, top + height * 0.48);
      ctx.stroke();
    }

    const flowers = [FLOWERS[0], FLOWERS[1], FLOWERS[2]];
    flowers.forEach((flower, index) => {
      const x = width / 2 + (index - 1) * 190;
      const y = top + height * 0.66;
      drawFlowerBed(ctx, { x: x - 62, y: y - 14, w: 124, h: 88 }, 1861 + index);
      drawFlower(ctx, x, y + 4, 62, flower, 1);
    });

    drawText(ctx, '花园角落 · 花开了就有人来', width / 2, top + height * 0.95, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });
    ctx.restore();
  }

  hitTest(x: number, y: number): GardenHit | null {
    if (inside(x, y, this.layout.back)) return { kind: 'back' };
    for (const seed of this.layout.seeds) {
      if (inside(x, y, seed.rect)) return { kind: 'seed', flowerId: seed.flowerId };
    }
    for (let index = 0; index < this.layout.plots.length; index += 1) {
      if (inside(x, y, this.layout.plots[index])) return { kind: 'plot', index };
    }
    if (inside(x, y, this.layout.order)) return { kind: 'order' };
    if (inside(x, y, this.layout.harvestAll)) return { kind: 'harvest-all' };
    if (inside(x, y, this.layout.waterAll)) return { kind: 'water-all' };
    if (inside(x, y, this.layout.sell)) return { kind: 'sell' };
    return null;
  }

  private drawPlot(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    index: number,
    save: GardenSave,
    selectedFlower: string,
    now: number,
  ): void {
    const view: FlowerView = flowerView(save, index, now);
    drawFlowerBed(ctx, rect, 1821 + index);
    const plot = save.plots[index];
    const flower = plot ? findFlower(plot.flowerId) : undefined;

    if (!plot || !flower) {
      const seed = findFlower(selectedFlower);
      drawText(ctx, '＋', rect.x + rect.w / 2, rect.y + rect.h * 0.42, {
        size: 34,
        color: COLORS.inkSoft,
        align: 'center',
      });
      drawText(ctx, `种${seed?.name ?? '雏菊'}`, rect.x + rect.w / 2, rect.y + rect.h - 44, {
        size: 15,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
      });
      drawText(ctx, `${seed?.seedCost ?? 0} 币`, rect.x + rect.w / 2, rect.y + rect.h - 22, {
        size: 12,
        weight: '700',
        color: COLORS.honeyDeep,
        align: 'center',
      });
      return;
    }

    const progress =
      view === 'ready'
        ? 1
        : Math.min(0.97, (now - plot.plantedAt) / (flower.growSeconds * 1000));
    drawFlower(ctx, rect.x + rect.w / 2, rect.y + rect.h * 0.52, rect.w * 0.46, flower, progress);

    if (view === 'ready') {
      drawStar(ctx, rect.x + rect.w - 30, rect.y + 34, 8, 3.4, COLORS.gold);
      inkRoundRect(
        ctx,
        rect.x + rect.w / 2 - 40,
        rect.y + 12,
        80,
        26,
        13,
        COLORS.gold,
        { stroke: COLORS.honeyDeep, width: 1.6, seed: 1831 },
      );
      drawText(ctx, '可收获', rect.x + rect.w / 2, rect.y + 25, {
        size: 14,
        weight: '700',
        color: COLORS.honeyDeep,
        align: 'center',
      });
    } else {
      drawText(
        ctx,
        `${remainingSeconds(save, index, now)}s`,
        rect.x + rect.w - 16,
        rect.y + 24,
        { size: 13, weight: '700', color: COLORS.paper, align: 'right' },
      );
      if (plot.bonusMs <= 0) {
        drawText(ctx, '点一下浇水', rect.x + 16, rect.y + 24, {
          size: 12,
          color: COLORS.waterDeep,
        });
      }
    }

    const bar: Rect = { x: rect.x + 16, y: rect.y + rect.h - 20, w: rect.w - 32, h: 7 };
    inkRoundRect(ctx, bar.x, bar.y, bar.w, bar.h, 4, 'rgba(58,46,42,0.16)', { width: 0 });
    inkRoundRect(
      ctx,
      bar.x,
      bar.y,
      bar.w * progress,
      bar.h,
      4,
      view === 'ready' ? COLORS.gold : COLORS.mint,
      { width: 0 },
    );
  }

  private drawOrder(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    save: GardenSave,
    store: GardenStore,
  ): void {
    drawPaperPanel(ctx, rect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1841,
    });
    const order = currentFlowerOrder(save);
    drawText(ctx, '今日花单', rect.x + 18, rect.y + 22, {
      size: 13,
      color: COLORS.inkSoft,
    });
    drawText(ctx, order.title, rect.x + 18, rect.y + 48, {
      size: 18,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 200,
    });
    let x = rect.x + 18;
    for (const need of order.needs) {
      const flower = findFlower(need.flowerId);
      if (!flower) continue;
      const have = store[need.flowerId] ?? 0;
      drawFlower(ctx, x + 18, rect.y + 84, 30, flower, 1);
      drawText(ctx, `${flower.name} ${have}/${need.amount}`, x + 38, rect.y + 84, {
        size: 14,
        weight: have >= need.amount ? '700' : 'normal',
        color: have >= need.amount ? COLORS.jade : COLORS.inkSoft,
      });
      x += 158;
    }
    drawWangduCoin(ctx, rect.x + 20, rect.y + rect.h - 18, 11);
    drawText(ctx, `+${order.coins}`, rect.x + 38, rect.y + rect.h - 18, {
      size: 17,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, `繁荣 +${order.prosperity}`, rect.x + 96, rect.y + rect.h - 18, {
      size: 13,
      color: COLORS.inkSoft,
    });
    const ready = canFulfillFlowerOrder(save, store);
    const button: Rect = {
      x: rect.x + rect.w - 132,
      y: rect.y + rect.h - 58,
      w: 114,
      h: 42,
    };
    drawStickerButton(ctx, button, ready ? '交花束' : '缺花', {
      fill: ready ? COLORS.jade : 'rgba(58,46,42,0.08)',
      textColor: ready ? COLORS.paper : COLORS.inkSoft,
      fontSize: 15,
      radius: RADIUS.md,
      disabled: !ready,
      seed: 1843,
    });
  }
}

function inside(x: number, y: number, rect: Rect): boolean {
  return rect.w > 0 && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
