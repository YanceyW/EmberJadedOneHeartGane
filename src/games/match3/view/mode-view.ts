import { Renderer } from '../../../core/render/renderer';
import { Rect } from '../../../shared/design-system/draw';
import { drawStar, drawText, drawWangduCoin } from '../../../shared/design-system/draw';
import { inkRoundRect } from '../../../shared/design-system/paint';
import {
  drawPaperPanel,
  drawStickerButton,
  drawTapeNote,
} from '../../../shared/design-system/paper-ui';
import { SpriteAtlas } from '../../../shared/design-system/sprite-atlas';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { TILE_SKINS } from '../../../shared/content/tile-skins';
import { compactNumber, formatDuration } from '../../../shared/format';
import { LEVELS } from '../data/levels';
import { Match3Save } from '../systems/save';

export type ModeHit =
  | { kind: 'back' }
  | { kind: 'campaign' }
  | { kind: 'endless' }
  | { kind: 'skin'; id: string };

interface Layout {
  back: Rect;
  campaign: Rect;
  endless: Rect;
  skins: Array<{ id: string; rect: Rect }>;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

/** 三消开始前的模式选择：闯关 / 无时间限制，以及已购买的方块皮肤。 */
export class ModeView {
  private layout: Layout = { back: { ...EMPTY }, campaign: { ...EMPTY }, endless: { ...EMPTY }, skins: [] };

  render(
    renderer: Renderer,
    save: Match3Save,
    coins: number,
    tileStyle: string,
    ownedTiles: readonly string[],
    atlas: SpriteAtlas,
    message: string,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const height = renderer.height;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, COLORS.cream);
    gradient.addColorStop(0.55, 'rgba(168,230,207,0.45)');
    gradient.addColorStop(1, COLORS.grass);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(width - 84, top + 44, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.layout.back = { x: 40, y: top, w: 96, h: 56 };
    drawStickerButton(ctx, this.layout.back, '←', {
      fill: COLORS.paper,
      textColor: COLORS.ink,
      fontSize: 30,
      radius: RADIUS.md,
      seed: 1201,
    });

    drawText(ctx, '王都三消', width / 2, top + 44, {
      size: FONT.display,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '选一种节奏，随时可以回来换', width / 2, top + 82, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'center',
    });

    const coinRect: Rect = { x: width - 196, y: top + 2, w: 156, h: 52 };
    inkRoundRect(ctx, coinRect.x, coinRect.y, coinRect.w, coinRect.h, 26, COLORS.paper, {
      stroke: 'rgba(58,46,42,0.24)',
      width: 2,
      seed: 1203,
    });
    drawWangduCoin(ctx, coinRect.x + 28, coinRect.y + 26, 13);
    drawText(ctx, compactNumber(coins), coinRect.x + 52, coinRect.y + 26, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    const cardX = 48;
    const cardW = width - 96;
    this.layout.campaign = { x: cardX, y: top + 128, w: cardW, h: 252 };
    this.layout.endless = { x: cardX, y: top + 398, w: cardW, h: 228 };
    this.drawCampaign(ctx, this.layout.campaign, save);
    this.drawEndless(ctx, this.layout.endless, save);

    const skinsTop = top + 700;
    drawText(ctx, '方块皮肤', cardX + 4, skinsTop - 16, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '在王都小铺购买，闯关与无时间限制通用', cardX + 132, skinsTop - 16, {
      size: 14,
      color: COLORS.inkSoft,
    });

    const chipGap = 10;
    const chipW = (cardW - chipGap * 3) / 4;
    this.layout.skins = [];
    TILE_SKINS.forEach((skin, index) => {
      const rect: Rect = {
        x: cardX + index * (chipW + chipGap),
        y: skinsTop,
        w: chipW,
        h: 154,
      };
      this.layout.skins.push({ id: skin.id, rect });
      const owned = ownedTiles.includes(skin.id);
      const equipped = tileStyle === skin.id;
      inkRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        RADIUS.lg,
        equipped ? 'rgba(242,193,78,0.24)' : 'rgba(255,253,248,0.84)',
        {
          stroke: equipped ? 'rgba(185,134,47,0.55)' : 'rgba(58,46,42,0.14)',
          width: equipped ? 2.4 : 1.6,
          seed: 1211 + index,
        },
      );
      const tileSize = 22;
      const gap = 3;
      const stripW = skin.sprites.length * tileSize + (skin.sprites.length - 1) * gap;
      const stripX = rect.x + (rect.w - stripW) / 2;
      skin.sprites.forEach((id, tileIndex) => {
        const frame = atlas.frame(id);
        ctx.drawImage(
          frame.canvas,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          stripX + tileIndex * (tileSize + gap),
          rect.y + 22,
          tileSize,
          tileSize,
        );
      });
      drawText(ctx, skin.name.replace('方块', ''), rect.x + rect.w / 2, rect.y + 80, {
        size: 15,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
        maxWidth: rect.w - 16,
      });
      const status = equipped
        ? '使用中'
        : owned
          ? '点击换上'
          : skin.unlockHint
            ? '牧场解锁'
            : skin.price > 0
              ? `${skin.price} 币`
              : '免费';
      drawText(ctx, status, rect.x + rect.w / 2, rect.y + 118, {
        size: 13,
        weight: '700',
        color: equipped ? COLORS.jade : owned ? COLORS.inkSoft : COLORS.honeyDeep,
        align: 'center',
        maxWidth: rect.w - 12,
      });
    });

    let hintBottom: number;
    if (message) {
      drawTapeNote(
        ctx,
        { x: (width - 520) / 2, y: top + 872, w: 520, h: 48 },
        [message],
        { align: 'center' },
      );
      hintBottom = top + 920;
    } else {
      drawTapeNote(
        ctx,
        { x: (width - 600) / 2, y: top + 886, w: 600, h: 72 },
        ['闯关拿星 · 无尽刷分', '方块皮肤在王都小铺购买，已购买可随时换'],
        { align: 'center' },
      );
      hintBottom = top + 958;
    }

    const bandBottom = height - renderer.safeBottom - 24;
    if (bandBottom - hintBottom > 150) {
      this.drawTableBand(ctx, width, atlas, tileStyle, hintBottom + 16, bandBottom);
    }
  }

  /** 高屏时在底部补一张牌桌：当前皮肤的方块散在桌上，避免大片留白。 */
  private drawTableBand(
    ctx: CanvasRenderingContext2D,
    width: number,
    atlas: SpriteAtlas,
    tileStyle: string,
    top: number,
    bottom: number,
  ): void {
    const height = bottom - top;
    const cx = width / 2;
    const cy = top + height * 0.52;
    const skin = TILE_SKINS.find((item) => item.id === tileStyle) ?? TILE_SKINS[0];

    ctx.save();
    ctx.fillStyle = '#FFFBF2';
    ctx.beginPath();
    ctx.ellipse(cx, cy, width * 0.45, height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COLORS.pathDeep;
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, width * 0.42, height * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const size = 86;
    const count = skin.sprites.length;
    const spread = Math.min(width * 0.74, (count - 1) * size * 1.16);
    skin.sprites.forEach((id, index) => {
      const t = count > 1 ? index / (count - 1) : 0.5;
      const x = cx + (t - 0.5) * spread;
      const y = cy - Math.sin(t * Math.PI) * size * 0.3;
      const frame = atlas.frame(id);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((t - 0.5) * 0.18);
      ctx.drawImage(
        frame.canvas,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        -size / 2,
        -size / 2,
        size,
        size,
      );
      ctx.restore();
    });
    drawStar(ctx, cx - width * 0.35, cy - height * 0.22, 14, 6, COLORS.gold);
    drawStar(ctx, cx + width * 0.37, cy + height * 0.2, 10, 4, COLORS.coral);
    drawStar(ctx, cx + width * 0.3, cy - height * 0.24, 8, 3, COLORS.jade);
  }

  hitTest(x: number, y: number): ModeHit | null {
    if (inside(x, y, this.layout.back)) return { kind: 'back' };
    if (inside(x, y, this.layout.campaign)) return { kind: 'campaign' };
    if (inside(x, y, this.layout.endless)) return { kind: 'endless' };
    for (const skin of this.layout.skins) {
      if (inside(x, y, skin.rect)) return { kind: 'skin', id: skin.id };
    }
    return null;
  }

  private drawCampaign(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    save: Match3Save,
  ): void {
    drawPaperPanel(ctx, rect, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 1221,
    });
    drawText(ctx, '闯关模式', rect.x + 32, rect.y + 52, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '每关 3 分钟 · 达标继续冲 2/3 星', rect.x + 32, rect.y + 88, {
      size: 17,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 64,
    });

    const level = Math.min(LEVELS.length, Math.max(1, save.unlockedLevel));
    const stars = save.stars[`${level}`] ?? 0;
    drawText(ctx, `继续第 ${level} 关 · ${LEVELS[level - 1]?.title ?? ''}`, rect.x + 32, rect.y + 142, {
      size: FONT.body,
      weight: '700',
      color: COLORS.jade,
      maxWidth: rect.w - 240,
    });
    for (let i = 0; i < 3; i += 1) {
      drawStar(ctx, rect.x + 44 + i * 34, rect.y + 188, 13, 6, i < stars ? COLORS.gold : 'rgba(58,46,42,0.14)');
    }
    drawText(ctx, `最佳 ${compactNumber(save.bestScore)}`, rect.x + 32, rect.y + 218, {
      size: 15,
      color: COLORS.inkSoft,
    });

    const button: Rect = { x: rect.x + rect.w - 176, y: rect.y + rect.h - 86, w: 144, h: 56 };
    drawStickerButton(ctx, button, '开始闯关', {
      fill: COLORS.jade,
      textColor: COLORS.paper,
      fontSize: 18,
      radius: RADIUS.md,
      seed: 1223,
    });
  }

  private drawEndless(ctx: CanvasRenderingContext2D, rect: Rect, save: Match3Save): void {
    drawPaperPanel(ctx, rect, {
      fill: '#FFF8E4',
      radius: RADIUS.xl,
      stitch: true,
      seed: 1231,
    });
    drawText(ctx, '无时间限制', rect.x + 32, rect.y + 52, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '不计时 · 一直玩下去 · 随时退出结算', rect.x + 32, rect.y + 88, {
      size: 17,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 64,
    });
    drawText(ctx, '连锁和节奏加成照常生效，长局分数按万/亿显示', rect.x + 32, rect.y + 124, {
      size: 15,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 64,
    });
    drawText(ctx, `最佳 ${compactNumber(save.endlessBest)}`, rect.x + 32, rect.y + 174, {
      size: 18,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    if (save.endlessBestSeconds > 0) {
      drawText(ctx, `最长 ${formatDuration(save.endlessBestSeconds)}`, rect.x + 220, rect.y + 174, {
        size: 15,
        color: COLORS.inkSoft,
      });
    }

    const button: Rect = { x: rect.x + rect.w - 176, y: rect.y + rect.h - 82, w: 144, h: 56 };
    drawStickerButton(ctx, button, '开始', {
      fill: COLORS.gold,
      textColor: COLORS.honeyDeep,
      fontSize: 19,
      radius: RADIUS.md,
      seed: 1233,
    });
  }
}

function inside(x: number, y: number, rect: Rect): boolean {
  return rect.w > 0 && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
