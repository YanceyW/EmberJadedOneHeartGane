import { Renderer } from '../../../core/render/renderer';
import { drawFish, drawStar, drawText, drawWangduCoin, Rect } from '../../../shared/design-system/draw';
import { inkRoundRect } from '../../../shared/design-system/paint';
import {
  drawPaperPanel,
  drawStickerButton,
  drawTapeNote,
} from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import {
  COIN_CAP,
  COIN_INTERVAL_MS,
  FISH_TYPES,
  MATURE_FEEDS,
  TANK_SLOTS,
  findFishType,
} from '../data/fish';
import {
  AquariumSave,
  canFulfillFishOrder,
  currentFishOrder,
  isMature,
  matureCount,
  pendingFishCoins,
} from '../systems/aquarium';

export type AquariumHit =
  | { kind: 'back' }
  | { kind: 'slot'; index: number }
  | { kind: 'buy'; typeId: string }
  | { kind: 'order' }
  | { kind: 'collect-all' };

interface Layout {
  back: Rect;
  slots: Rect[];
  buys: Array<{ typeId: string; rect: Rect }>;
  order: Rect;
  collectAll: Rect;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

export class AquariumView {
  private layout: Layout = {
    back: { ...EMPTY },
    slots: [],
    buys: [],
    order: { ...EMPTY },
    collectAll: { ...EMPTY },
  };

  render(
    renderer: Renderer,
    save: AquariumSave,
    selectedType: string,
    now: number,
    message: string,
    coins: number,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;

    const gradient = ctx.createLinearGradient(0, 0, 0, renderer.height);
    gradient.addColorStop(0, COLORS.cream);
    gradient.addColorStop(0.45, 'rgba(168,230,207,0.55)');
    gradient.addColorStop(1, COLORS.water);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, renderer.height);

    this.layout.back = { x: 40, y: top, w: 96, h: 56 };
    drawStickerButton(ctx, this.layout.back, '←', {
      fill: COLORS.paper,
      textColor: COLORS.ink,
      fontSize: 30,
      radius: RADIUS.md,
      seed: 1901,
    });

    const title: Rect = { x: 150, y: top - 4, w: 370, h: 66 };
    drawPaperPanel(ctx, title, { fill: COLORS.paper, radius: RADIUS.lg, stitch: true, seed: 1903 });
    drawText(ctx, '王都水族馆', title.x + title.w / 2, top + 24, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '买鱼 · 喂食 · 收泡泡币', title.x + title.w / 2, top + 48, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });

    const coinRect: Rect = { x: width - 206, y: top + 2, w: 166, h: 52 };
    inkRoundRect(ctx, coinRect.x, coinRect.y, coinRect.w, coinRect.h, 26, COLORS.paper, {
      stroke: 'rgba(58,46,42,0.24)',
      width: 2,
      seed: 1905,
    });
    drawWangduCoin(ctx, coinRect.x + 30, coinRect.y + 26, 14);
    drawText(ctx, compactNumber(coins), coinRect.x + 54, coinRect.y + 26, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    const gap = 12;
    const slotW = (width - 88 - gap * 2) / 3;
    const slotH = 166;
    const gridX = (width - (slotW * 3 + gap * 2)) / 2;
    const gridY = top + 92;
    this.layout.slots = [];
    for (let index = 0; index < TANK_SLOTS; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const rect: Rect = {
        x: gridX + col * (slotW + gap),
        y: gridY + row * (slotH + gap),
        w: slotW,
        h: slotH,
      };
      this.layout.slots.push(rect);
      this.drawSlot(ctx, rect, index, save, selectedType, now);
    }

    const buyY = gridY + slotH * 2 + gap + 18;
    this.layout.buys = [];
    const buyCols = 4;
    const buyH = 116;
    const buyW = (width - 96 - (buyCols - 1) * 12) / buyCols;
    FISH_TYPES.forEach((type, index) => {
      const col = index % buyCols;
      const row = Math.floor(index / buyCols);
      const rect: Rect = {
        x: 48 + col * (buyW + 12),
        y: buyY + row * (buyH + 10),
        w: buyW,
        h: buyH,
      };
      this.layout.buys.push({ typeId: type.id, rect });
      const selected = selectedType === type.id;
      inkRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        RADIUS.lg,
        selected ? COLORS.cream : COLORS.paper,
        {
          stroke: selected ? COLORS.waterDeep : 'rgba(58,46,42,0.14)',
          width: selected ? 2.8 : 1.6,
          seed: 1911 + index,
        },
      );
      drawFish(ctx, rect.x + rect.w / 2, rect.y + 42, 34, type.color);
      drawText(ctx, type.name, rect.x + rect.w / 2, rect.y + 80, {
        size: 16,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
      });
      drawWangduCoin(ctx, rect.x + rect.w / 2 - 36, rect.y + 106, 10);
      drawText(ctx, `${type.price}`, rect.x + rect.w / 2 - 20, rect.y + 106, {
        size: 15,
        weight: '700',
        color: COLORS.honeyDeep,
      });
    });

    const orderY = buyY + (Math.ceil(FISH_TYPES.length / buyCols) * (buyH + 10)) + 12;
    this.layout.order = { x: 48, y: orderY, w: width - 96, h: 118 };
    this.drawOrder(ctx, this.layout.order, save);

    this.layout.collectAll = { x: 48, y: orderY + 130, w: width - 96, h: 52 };
    const pending = save.fish.reduce(
      (sum, fish) => sum + (fish ? pendingFishCoins(fish, now) : 0),
      0,
    );
    drawStickerButton(
      ctx,
      this.layout.collectAll,
      pending > 0 ? `收全部泡泡币 +${pending}` : '泡泡币还没攒够',
      {
        fill: pending > 0 ? COLORS.water : 'rgba(58,46,42,0.08)',
        textColor: pending > 0 ? COLORS.paper : COLORS.inkSoft,
        fontSize: 17,
        radius: RADIUS.md,
        disabled: pending === 0,
        seed: 1921,
      },
    );

    if (message) {
      drawTapeNote(
        ctx,
        { x: (width - 540) / 2, y: orderY + 196, w: 540, h: 44 },
        [message],
        { align: 'center' },
      );
    }

    const bottom = renderer.height - renderer.safeBottom - 18;
    const sceneTop = orderY + (message ? 256 : 208);
    if (bottom - sceneTop > 150) {
      this.drawFloor(ctx, width, sceneTop, bottom, renderer.height);
    }
  }

  /** 高屏底部留白时补一段池底：水色 + 起伏沙地，一直铺到屏幕底边。 */
  private drawFloor(
    ctx: CanvasRenderingContext2D,
    width: number,
    top: number,
    bottom: number,
    screenBottom: number,
  ): void {
    const height = bottom - top;
    const water = ctx.createLinearGradient(0, top, 0, screenBottom);
    water.addColorStop(0, 'rgba(168,226,232,0.55)');
    water.addColorStop(1, 'rgba(118,196,212,0.7)');
    ctx.fillStyle = water;
    ctx.fillRect(0, top, width, screenBottom - top);

    const sandLine = top + height * 0.46;
    ctx.beginPath();
    ctx.moveTo(0, sandLine + height * 0.08);
    ctx.bezierCurveTo(
      width * 0.28,
      sandLine - height * 0.2,
      width * 0.62,
      sandLine + height * 0.16,
      width,
      sandLine - height * 0.02,
    );
    ctx.lineTo(width, screenBottom);
    ctx.lineTo(0, screenBottom);
    ctx.closePath();
    ctx.fillStyle = '#F1E1C4';
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.16)';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    for (let i = 0; i < 14; i += 1) {
      const x = 40 + ((i * 137) % (width - 80));
      const y = top + height * (0.72 + (i % 4) * 0.09);
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + (i % 3) * 2, 2 + (i % 2) * 1.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,253,248,0.6)' : 'rgba(206,176,132,0.5)';
      ctx.fill();
    }

    ctx.strokeStyle = COLORS.grassDeep;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (const [clumpX, dir] of [
      [112, -1],
      [614, 1],
    ] as const) {
      const rootY = sandLine + height * 0.12;
      for (let blade = 0; blade < 3; blade += 1) {
        const rootX = clumpX + blade * 12 * dir;
        const lean = dir * (16 + blade * 14) * (blade === 1 ? 0.6 : 1);
        const reach = height * (0.3 + blade * 0.07);
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo(
          rootX + lean * 0.35,
          rootY - reach * 0.6,
          rootX + lean,
          rootY - reach,
        );
        ctx.stroke();
      }
    }
    drawStar(ctx, width / 2 - 150, sandLine + height * 0.2, 24, 10, COLORS.coral);
    drawStar(ctx, width / 2 + 178, sandLine + height * 0.26, 17, 7, COLORS.honey);
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(
        width / 2 + 40 + i * 52,
        top + height * (0.14 + (i % 3) * 0.09),
        4 + (i % 2) * 2,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = 'rgba(255,253,248,0.7)';
      ctx.fill();
    }
    drawText(ctx, '水族馆一角 · 泡泡币慢慢攒', width / 2, bottom - 26, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });
  }

  hitTest(x: number, y: number): AquariumHit | null {
    if (inside(x, y, this.layout.back)) return { kind: 'back' };
    for (const buy of this.layout.buys) {
      if (inside(x, y, buy.rect)) return { kind: 'buy', typeId: buy.typeId };
    }
    for (let index = 0; index < this.layout.slots.length; index += 1) {
      if (inside(x, y, this.layout.slots[index])) return { kind: 'slot', index };
    }
    if (inside(x, y, this.layout.order)) return { kind: 'order' };
    if (inside(x, y, this.layout.collectAll)) return { kind: 'collect-all' };
    return null;
  }

  private drawSlot(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    index: number,
    save: AquariumSave,
    selectedType: string,
    now: number,
  ): void {
    inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, 'rgba(168,230,207,0.55)', {
      stroke: 'rgba(58,46,42,0.18)',
      width: 2,
      seed: 1931 + index,
    });
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(255,253,248,0.6)';
    ctx.beginPath();
    ctx.ellipse(rect.x + rect.w / 2, rect.y + 18, rect.w * 0.34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const fish = save.fish[index];
    if (!fish) {
      const type = findFishType(selectedType);
      drawText(ctx, '＋', rect.x + rect.w / 2, rect.y + rect.h / 2 - 8, {
        size: 34,
        color: COLORS.inkSoft,
        align: 'center',
      });
      drawText(ctx, `放${type?.name ?? '鱼'}`, rect.x + rect.w / 2, rect.y + rect.h - 26, {
        size: 14,
        weight: '700',
        color: COLORS.waterDeep,
        align: 'center',
      });
      return;
    }

    const type = findFishType(fish.typeId);
    if (!type) return;
    const bob = Math.sin(now / 600 + index) * 4;
    drawFish(ctx, rect.x + rect.w / 2, rect.y + rect.h * 0.46 + bob, rect.w * 0.3, type.color);
    if (type.pattern === 'stripe') {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 4;
      for (const dx of [-14, 2, 18]) {
        ctx.beginPath();
        ctx.moveTo(rect.x + rect.w / 2 + dx, rect.y + rect.h * 0.46 + bob - 16);
        ctx.lineTo(rect.x + rect.w / 2 + dx, rect.y + rect.h * 0.46 + bob + 16);
        ctx.stroke();
      }
      ctx.restore();
    } else if (type.pattern === 'spot') {
      ctx.fillStyle = type.accent;
      for (const [dx, dy] of [
        [-8, -6],
        [8, 4],
        [-2, 12],
      ] as const) {
        ctx.beginPath();
        ctx.arc(rect.x + rect.w / 2 + dx, rect.y + rect.h * 0.46 + bob + dy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const mature = isMature(fish);
    for (let i = 0; i < MATURE_FEEDS; i += 1) {
      ctx.beginPath();
      ctx.arc(rect.x + 24 + i * 18, rect.y + rect.h - 28, 6, 0, Math.PI * 2);
      ctx.fillStyle = i < fish.feeds ? COLORS.gold : 'rgba(58,46,42,0.14)';
      ctx.fill();
    }
    const pending = pendingFishCoins(fish, now);
    if (pending > 0) {
      drawWangduCoin(ctx, rect.x + rect.w - 34, rect.y + 32, 13);
      drawText(ctx, `${pending}`, rect.x + rect.w - 18, rect.y + 33, {
        size: 14,
        weight: '700',
        color: COLORS.honeyDeep,
      });
    } else if (mature) {
      drawText(ctx, '点鱼收币', rect.x + rect.w - 12, rect.y + 32, {
        size: 11,
        color: COLORS.inkSoft,
        align: 'right',
      });
    } else {
      drawText(ctx, '点鱼喂食', rect.x + rect.w - 12, rect.y + 32, {
        size: 11,
        color: COLORS.inkSoft,
        align: 'right',
      });
    }
    drawText(
      ctx,
      mature ? `${type.name} · 成熟` : `${type.name} · ${fish.feeds}/${MATURE_FEEDS}`,
      rect.x + 12,
      rect.y + 22,
      { size: 12, color: COLORS.inkSoft },
    );
  }

  private drawOrder(ctx: CanvasRenderingContext2D, rect: Rect, save: AquariumSave): void {
    drawPaperPanel(ctx, rect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1941,
    });
    const order = currentFishOrder(save);
    drawText(ctx, '今日访客', rect.x + 18, rect.y + 22, {
      size: 13,
      color: COLORS.inkSoft,
    });
    drawText(ctx, order.title, rect.x + 18, rect.y + 48, {
      size: 18,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, `需要成熟鱼 ${matureCount(save)}/${order.mature}`, rect.x + 18, rect.y + 82, {
      size: 15,
      color: canFulfillFishOrder(save) ? COLORS.jade : COLORS.inkSoft,
      weight: canFulfillFishOrder(save) ? '700' : 'normal',
    });
    drawWangduCoin(ctx, rect.x + 230, rect.y + 82, 11);
    drawText(ctx, `+${order.coins}`, rect.x + 248, rect.y + 82, {
      size: 16,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    const ready = canFulfillFishOrder(save);
    const button: Rect = { x: rect.x + rect.w - 132, y: rect.y + rect.h - 58, w: 114, h: 42 };
    drawStickerButton(ctx, button, ready ? '接待访客' : '鱼未成熟', {
      fill: ready ? COLORS.jade : 'rgba(58,46,42,0.08)',
      textColor: ready ? COLORS.paper : COLORS.inkSoft,
      fontSize: 14,
      radius: RADIUS.md,
      disabled: !ready,
      seed: 1943,
    });
    drawText(ctx, `成熟鱼每 ${COIN_INTERVAL_MS / 1000}s 产 1 币，最多 ${COIN_CAP}`, rect.x + 18, rect.y + rect.h - 18, {
      size: 12,
      color: COLORS.inkSoft,
    });
  }
}

function inside(x: number, y: number, rect: Rect): boolean {
  return rect.w > 0 && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
