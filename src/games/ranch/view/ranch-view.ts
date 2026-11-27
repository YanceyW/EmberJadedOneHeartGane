import { Renderer } from '../../../core/render/renderer';
import { drawText, drawWangduCoin, Rect } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkEllipse, inkLine, inkRoundRect, softShadow } from '../../../shared/design-system/paint';
import {
  drawPaperPanel,
  drawStickerButton,
  drawTapeNote,
} from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import {
  FEED_BUY_COST,
  FEED_ID,
  RANCH_MAX_PER_PEN,
  RANCH_SPECIES,
  findSpecies,
  productName,
} from '../data/animals';
import {
  RanchSave,
  animalCost,
  feedNeed,
  penState,
  remainingSeconds,
} from '../systems/ranch';

export type RanchHit =
  | { kind: 'back' }
  | { kind: 'pen'; index: number }
  | { kind: 'buy'; index: number };

interface Layout {
  back: Rect;
  pens: Rect[];
  buys: Array<{ index: number; rect: Rect }>;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

export class RanchView {
  private layout: Layout = { back: { ...EMPTY }, pens: [], buys: [] };

  render(
    renderer: Renderer,
    save: RanchSave,
    store: Record<string, number>,
    coins: number,
    now: number,
    time: number,
    message: string,
    reducedMotion: boolean,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;
    const bottom = renderer.height - renderer.safeBottom - 18;
    this.layout = { back: { ...EMPTY }, pens: [], buys: [] };

    const gradient = ctx.createLinearGradient(0, 0, 0, bottom);
    gradient.addColorStop(0, '#FFF3E4');
    gradient.addColorStop(1, 'rgba(127,191,106,0.28)');
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
    drawText(ctx, '王都牧场', title.x + title.w / 2, top + 24, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '饲养 · 收蛋 · 挤奶', title.x + title.w / 2, top + 48, {
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

    const feed: Rect = { x: 48, y: top + 74, w: width - 96, h: 50 };
    drawPaperPanel(ctx, feed, {
      fill: 'rgba(255,253,248,0.82)',
      radius: RADIUS.lg,
      stitch: false,
      seed: 1807,
    });
    drawGoods(ctx, FEED_ID, feed.x + 28, feed.y + 25, 28);
    drawText(ctx, `饲料 ${store[FEED_ID] ?? 0}`, feed.x + 48, feed.y + 20, {
      size: 13,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, `没有饲料可花 ${FEED_BUY_COST} 币/份应急；加工屋能自己做`, feed.x + 48, feed.y + 38, {
      size: 10.5,
      color: COLORS.inkSoft,
      maxWidth: feed.w - 80,
    });

    const bodyTop = top + 140;
    const gap = 10;
    const penW = (width - 96 - gap) / 2;
    const noteH = 56;
    const penH = (bottom - bodyTop - noteH - gap) / 2;

    RANCH_SPECIES.forEach((_species, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const rect: Rect = {
        x: 48 + col * (penW + gap),
        y: bodyTop + row * (penH + gap),
        w: penW,
        h: penH,
      };
      this.layout.pens.push(rect);
      this.drawPen(
        ctx,
        rect,
        index,
        save,
        store,
        coins,
        now,
        time,
        reducedMotion,
      );
    });

    const noteY = bottom - noteH + 2;
    drawTapeNote(
      ctx,
      { x: (width - 620) / 2, y: noteY, w: 620, h: 48 },
      ['牧产直接进王都仓库；首次收获解锁三消「牧场方块」', '动物要喂饲料才会产出，点畜栏收取'],
      { align: 'center' },
    );

    if (message) {
      drawTapeNote(
        ctx,
        { x: (width - 540) / 2, y: noteY - 56, w: 540, h: 42 },
        [message],
        { align: 'center' },
      );
    }
  }

  private drawPen(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    index: number,
    save: RanchSave,
    store: Record<string, number>,
    coins: number,
    now: number,
    time: number,
    reducedMotion: boolean,
  ): void {
    const species = findSpecies(save.pens[index]?.species ?? '');
    if (!species) return;
    const state = penState(save, index, now);
    drawPaperPanel(ctx, rect, {
      fill: 'rgba(255,253,248,0.9)',
      radius: RADIUS.lg,
      stitch: true,
      seed: 1811 + index,
    });

    const pasture: Rect = {
      x: rect.x + 10,
      y: rect.y + 38,
      w: rect.w - 20,
      h: rect.h - 48,
    };
    inkRoundRect(ctx, pasture.x, pasture.y, pasture.w, pasture.h, RADIUS.md, '#DDF0CE', {
      stroke: 'rgba(94,156,77,0.35)',
      width: 1.4,
      seed: 1813 + index,
    });
    // 栅栏
    ctx.save();
    ctx.strokeStyle = 'rgba(154,101,56,0.5)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i <= 4; i += 1) {
      const x = pasture.x + (pasture.w * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, pasture.y + pasture.h - 26);
      ctx.lineTo(x, pasture.y + pasture.h - 8);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(pasture.x + 4, pasture.y + pasture.h - 20);
    ctx.lineTo(pasture.x + pasture.w - 4, pasture.y + pasture.h - 20);
    ctx.stroke();
    ctx.restore();

    drawText(ctx, species.name, rect.x + 14, rect.y + 24, {
      size: 15,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, `${save.pens[index].count}/${RANCH_MAX_PER_PEN}`, rect.x + 74, rect.y + 24, {
      size: 12,
      color: COLORS.inkSoft,
    });

    const cost = animalCost(save, index);
    if (cost !== null) {
      const buy: Rect = { x: rect.x + rect.w - 66, y: rect.y + 7, w: 54, h: 28 };
      this.layout.buys.push({ index, rect: buy });
      drawStickerButton(ctx, buy, `+${cost}`, {
        fill: coins >= cost ? COLORS.honey : 'rgba(58,46,42,0.08)',
        textColor: coins >= cost ? COLORS.honeyDeep : COLORS.inkSoft,
        fontSize: 10.5,
        radius: RADIUS.sm,
        disabled: coins < cost,
        seed: 1815 + index,
      });
    }

    if (state === 'empty') {
      drawGoods(ctx, species.product, pasture.x + pasture.w / 2, pasture.y + pasture.h * 0.45, 34);
      drawText(ctx, '空栏 · 点右上角买入', pasture.x + pasture.w / 2, pasture.y + pasture.h * 0.72, {
        size: 11,
        color: 'rgba(107,91,84,0.6)',
        align: 'center',
      });
      return;
    }

    const animals = Math.min(RANCH_MAX_PER_PEN, save.pens[index].count);
    const baseSize = Math.min(pasture.w * 0.19, pasture.h * 0.28);
    for (let i = 0; i < animals; i += 1) {
      const phase = index * 2.4 + i * 1.7;
      const wanderX = reducedMotion ? 0 : Math.sin(time * 0.55 + phase) * pasture.w * 0.22;
      const wanderY = reducedMotion ? 0 : Math.cos(time * 0.42 + phase) * pasture.h * 0.1;
      const x = pasture.x + pasture.w * 0.5 + wanderX + (i - (animals - 1) / 2) * baseSize * 0.6;
      const y = pasture.y + pasture.h * 0.62 + wanderY + (i % 2) * 4;
      const facing = reducedMotion ? 1 : Math.cos(time * 0.55 + phase) >= 0 ? 1 : -1;
      this.drawAnimal(ctx, species.id, x, y, baseSize, facing, i % 2 === 0);
    }

    const statusY = pasture.y + pasture.h - 10;
    if (state === 'ready') {
      inkRoundRect(ctx, rect.x + 14, rect.y + 40, rect.w - 28, 28, RADIUS.sm, 'rgba(242,193,78,0.24)', {
        width: 0,
      });
      drawGoods(ctx, species.product, rect.x + 30, rect.y + 54, 22);
      drawText(ctx, `可收取 ×${save.pens[index].count}`, rect.x + 46, rect.y + 54, {
        size: 11.5,
        weight: '700',
        color: COLORS.honeyDeep,
      });
    } else if (state === 'producing') {
      const remain = remainingSeconds(save, index, now);
      const ratio = 1 - remain / Math.max(1, species.produceSeconds);
      const barW = rect.w - 42;
      inkRoundRect(ctx, rect.x + 16, statusY - 8, barW, 8, 4, 'rgba(58,46,42,0.12)', { width: 0 });
      inkRoundRect(ctx, rect.x + 16, statusY - 8, Math.max(6, barW * ratio), 8, 4, COLORS.jade, {
        width: 0,
      });
      drawText(ctx, `产出中 ${remain}s`, rect.x + 16, statusY - 14, {
        size: 10.5,
        weight: '700',
        color: COLORS.jade,
      });
    } else {
      const need = feedNeed(save, index);
      const have = Math.min(need, store[FEED_ID] ?? 0);
      const missing = Math.max(0, need - have);
      const costText =
        missing === 0
          ? `喂食 饲料×${need}`
          : have > 0
            ? `喂食 饲料×${have} + ${missing * FEED_BUY_COST} 币`
            : `喂食 ${missing * FEED_BUY_COST} 币`;
      drawText(ctx, `待喂食 · ${costText}`, rect.x + 16, statusY - 14, {
        size: 10.5,
        weight: '700',
        color: missing === 0 ? COLORS.coral : COLORS.inkSoft,
        maxWidth: rect.w - 32,
      });
      drawText(ctx, productName(species.product), rect.x + rect.w - 14, rect.y + 24, {
        size: 10,
        color: COLORS.inkSoft,
        align: 'right',
      });
    }
  }

  private drawAnimal(
    ctx: CanvasRenderingContext2D,
    species: string,
    x: number,
    y: number,
    size: number,
    facing: 1 | -1,
    alt: boolean,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    softShadow(ctx, 0, size * 0.72, size * 0.9, size * 0.22, 0.16, 3);
    if (species === 'chicken') {
      inkEllipse(ctx, 0, 0, size * 0.85, size * 0.7, COLORS.paper, {
        stroke: COLORS.ink,
        width: 2.2,
        seed: 1821 + (alt ? 1 : 0),
      });
      inkEllipse(ctx, size * 0.62, -size * 0.55, size * 0.42, size * 0.4, COLORS.paper, {
        stroke: COLORS.ink,
        width: 2,
        seed: 1823,
      });
      inkRoundRect(ctx, size * 0.52, -size * 0.95, size * 0.18, size * 0.28, size * 0.08, COLORS.coral, {
        stroke: COLORS.ink,
        width: 1.6,
        seed: 1825,
      });
      inkEllipse(ctx, size * 0.93, -size * 0.5, size * 0.12, size * 0.09, COLORS.gold, {
        stroke: COLORS.ink,
        width: 1.4,
        seed: 1827,
      });
      inkEllipse(ctx, size * 0.62, -size * 0.62, size * 0.06, size * 0.06, COLORS.ink, { width: 0 });
      for (const dx of [-0.35, 0.25]) {
        inkLine(ctx, [{ x: size * dx, y: size * 0.55 }, { x: size * dx, y: size * 0.9 }], {
          stroke: COLORS.honeyDeep,
          width: 2.4,
          seed: 1829 + dx,
        });
      }
    } else if (species === 'cow') {
      inkRoundRect(ctx, -size * 0.9, -size * 0.45, size * 1.8, size * 1.05, size * 0.3, COLORS.paper, {
        stroke: COLORS.ink,
        width: 2.4,
        seed: 1841 + (alt ? 1 : 0),
      });
      for (const [dx, dy, rx] of [
        [-0.35, 0.05, 0.22],
        [0.3, -0.15, 0.18],
        [0.15, 0.35, 0.15],
      ] as const) {
        inkEllipse(ctx, size * dx, size * dy, size * rx, size * rx * 0.8, COLORS.lilac, { width: 0 });
      }
      inkEllipse(ctx, size * 0.92, -size * 0.42, size * 0.42, size * 0.38, COLORS.paper, {
        stroke: COLORS.ink,
        width: 2.2,
        seed: 1843,
      });
      inkEllipse(ctx, size * 1.15, -size * 0.32, size * 0.16, size * 0.2, COLORS.petal, {
        stroke: COLORS.ink,
        width: 1.4,
        seed: 1845,
      });
      inkLine(ctx, [{ x: size * 0.55, y: -size * 0.72 }, { x: size * 0.75, y: -size * 0.95 }], {
        stroke: COLORS.ink,
        width: 2,
        seed: 1847,
      });
      inkLine(ctx, [{ x: size * 1.1, y: -size * 0.75 }, { x: size * 1.2, y: -size * 0.98 }], {
        stroke: COLORS.ink,
        width: 2,
        seed: 1849,
      });
      for (const dx of [-0.55, -0.1, 0.4]) {
        inkLine(ctx, [{ x: size * dx, y: size * 0.45 }, { x: size * dx, y: size * 0.95 }], {
          stroke: COLORS.ink,
          width: 2.2,
          seed: 1851 + dx,
        });
      }
    } else if (species === 'pig') {
      inkEllipse(ctx, 0, 0, size * 0.95, size * 0.72, COLORS.petal, {
        stroke: COLORS.ink,
        width: 2.4,
        seed: 1861 + (alt ? 1 : 0),
      });
      inkEllipse(ctx, size * 0.78, -size * 0.32, size * 0.4, size * 0.36, COLORS.petal, {
        stroke: COLORS.ink,
        width: 2.2,
        seed: 1863,
      });
      inkEllipse(ctx, size * 1.02, -size * 0.25, size * 0.18, size * 0.14, COLORS.petalDeep, {
        stroke: COLORS.ink,
        width: 1.4,
        seed: 1865,
      });
      for (const [dx, dy] of [
        [0.82, -0.5],
        [1.08, -0.55],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(size * dx, size * dy);
        ctx.lineTo(size * (dx + 0.12), size * (dy - 0.18));
        ctx.lineTo(size * (dx + 0.22), size * (dy - 0.02));
        ctx.closePath();
        ctx.fillStyle = COLORS.petalDeep;
        ctx.fill();
      }
      for (const dx of [-0.5, 0.35]) {
        inkLine(ctx, [{ x: size * dx, y: size * 0.55 }, { x: size * dx, y: size * 0.9 }], {
          stroke: COLORS.petalDeep,
          width: 2.4,
          seed: 1867 + dx,
        });
      }
    } else {
      for (const [dx, dy, rx] of [
        [-0.35, -0.05, 0.5],
        [0.2, -0.2, 0.45],
        [0.35, 0.2, 0.42],
        [-0.1, 0.25, 0.45],
      ] as const) {
        inkEllipse(ctx, size * dx, size * dy, size * rx, size * rx * 0.9, COLORS.cream, {
          stroke: COLORS.ink,
          width: 1.8,
          seed: 1881 + dx,
        });
      }
      inkEllipse(ctx, size * 0.72, -size * 0.25, size * 0.32, size * 0.36, COLORS.inkSoft, {
        stroke: COLORS.ink,
        width: 2,
        seed: 1883,
      });
      for (const dx of [-0.4, 0.25]) {
        inkLine(ctx, [{ x: size * dx, y: size * 0.45 }, { x: size * dx, y: size * 0.9 }], {
          stroke: COLORS.ink,
          width: 2.2,
          seed: 1885 + dx,
        });
      }
    }
    ctx.restore();
  }

  hitTest(x: number, y: number): RanchHit | null {
    const inside = (rect: Rect) =>
      x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    if (inside(this.layout.back)) return { kind: 'back' };
    for (const buy of this.layout.buys) {
      if (inside(buy.rect)) return { kind: 'buy', index: buy.index };
    }
    for (let index = 0; index < this.layout.pens.length; index += 1) {
      if (inside(this.layout.pens[index])) return { kind: 'pen', index };
    }
    return null;
  }
}
