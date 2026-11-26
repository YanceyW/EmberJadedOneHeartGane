import { platform } from '../platform/wx';
import {
  drawBerry,
  drawDiamond,
  drawHex,
  drawPetal,
  drawStar,
  fillRoundRect,
  roundRectPath,
  strokeRoundRect,
} from './draw';
import { COLORS, RADIUS } from './tokens';

export type SpriteId =
  | 'tile-berry'
  | 'tile-honey'
  | 'tile-mint'
  | 'tile-sky'
  | 'tile-lilac'
  | 'shadow'
  | 'p-star'
  | 'p-petal'
  | 'p-bubble'
  | 'p-dust'
  | 'p-coin'
  | 'p-sugar'
  | 'p-ring';

export interface SpriteFrame {
  canvas: any;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const TILE = 128;
const PARTICLE = 64;
const ATLAS_W = 768;
const ATLAS_H = 256;

interface TileStyle {
  fill: string;
  shade: string;
  symbol: 'berry' | 'star' | 'diamond' | 'hex' | 'petal';
}

// 顺序必须与 game 里的 tile 索引一致。
const TILE_STYLES: TileStyle[] = [
  { fill: '#F7A8C4', shade: '#C9768F', symbol: 'berry' },
  { fill: '#F6C667', shade: '#C99A3E', symbol: 'star' },
  { fill: '#A8E6CF', shade: '#74BFA6', symbol: 'diamond' },
  { fill: '#8CCFE8', shade: '#5FA3BC', symbol: 'hex' },
  { fill: '#C9B6E4', shade: '#9B87BE', symbol: 'petal' },
];

const PARTICLE_CELLS: SpriteId[] = ['p-star', 'p-petal', 'p-bubble', 'p-dust', 'p-coin', 'p-sugar', 'p-ring'];

export class SpriteAtlas {
  private readonly frames = new Map<SpriteId, SpriteFrame>();
  private readonly canvas: any;

  constructor() {
    this.canvas = platform.createOffscreenCanvas(ATLAS_W, ATLAS_H);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('offscreen canvas 2d context unavailable');

    this.bakeTiles(ctx);
    this.bakeShadow(ctx);
    this.bakeParticles(ctx);
  }

  frame(id: SpriteId): SpriteFrame {
    const frame = this.frames.get(id);
    if (frame) return frame;
    // 兜底：返回第一块，避免烘焙缺失导致整帧崩溃。
    return this.frames.values().next().value as SpriteFrame;
  }

  private bakeTiles(ctx: CanvasRenderingContext2D): void {
    const ids: SpriteId[] = ['tile-berry', 'tile-honey', 'tile-mint', 'tile-sky', 'tile-lilac'];

    TILE_STYLES.forEach((style, index) => {
      const x = index * TILE;
      const depth = 10;
      const inset = 6;
      const face = {
        x: x + inset,
        y: inset,
        w: TILE - inset * 2,
        h: TILE - inset * 2 - depth,
      };

      // 侧面（挤出）
      fillRoundRect(
        ctx,
        { x: face.x, y: face.y + depth, w: face.w, h: face.h },
        style.shade,
        RADIUS.xl,
      );
      // 顶面
      const gradient = ctx.createLinearGradient(0, face.y, 0, face.y + face.h);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.35, style.fill);
      gradient.addColorStop(1, style.fill);
      ctx.save();
      roundRectPath(ctx, face.x, face.y, face.w, face.h, RADIUS.xl);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.restore();
      strokeRoundRect(ctx, face, 'rgba(58,46,42,0.30)', 3, RADIUS.xl);

      // 顶部高光
      ctx.save();
      ctx.globalAlpha = 0.5;
      fillRoundRect(
        ctx,
        { x: face.x + 14, y: face.y + 10, w: face.w - 28, h: 18 },
        '#FFFFFF',
        9,
      );
      ctx.restore();

      const cx = face.x + face.w / 2;
      const cy = face.y + face.h / 2 + 4;
      const size = face.w * 0.27;
      switch (style.symbol) {
        case 'berry':
          drawBerry(ctx, cx, cy, size, COLORS.paper);
          break;
        case 'star':
          drawStar(ctx, cx, cy, size, size * 0.46, COLORS.paper);
          break;
        case 'diamond':
          drawDiamond(ctx, cx, cy, size, COLORS.paper);
          break;
        case 'hex':
          drawHex(ctx, cx, cy, size, COLORS.paper);
          break;
        case 'petal':
          drawPetal(ctx, cx, cy, size, COLORS.paper);
          break;
      }

      this.frames.set(ids[index], {
        canvas: this.canvas,
        sx: x,
        sy: 0,
        sw: TILE,
        sh: TILE,
      });
    });
  }

  private bakeShadow(ctx: CanvasRenderingContext2D): void {
    const w = 128;
    const h = 64;
    const x = 0;
    const y = TILE;

    const gradient = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(58,46,42,0.30)');
    gradient.addColorStop(0.6, 'rgba(58,46,42,0.14)');
    gradient.addColorStop(1, 'rgba(58,46,42,0)');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    this.frames.set('shadow', { canvas: this.canvas, sx: x, sy: y, sw: w, sh: h });
  }

  private bakeParticles(ctx: CanvasRenderingContext2D): void {
    const baseY = TILE;

    PARTICLE_CELLS.forEach((id, index) => {
      const x = 128 + index * PARTICLE;
      const cx = x + PARTICLE / 2;
      const cy = baseY + PARTICLE / 2;

      switch (id) {
        case 'p-star':
          drawStar(ctx, cx, cy, 26, 12, COLORS.gold);
          drawStar(ctx, cx, cy, 16, 7, '#FFF3C4');
          break;
        case 'p-petal':
          drawPetal(ctx, cx, cy, 24, COLORS.petal);
          break;
        case 'p-bubble':
          ctx.beginPath();
          ctx.arc(cx, cy, 20, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(191,227,242,0.85)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx - 6, cy - 7, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fill();
          break;
        case 'p-dust':
          ctx.beginPath();
          ctx.arc(cx, cy, 16, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(160,140,130,0.65)';
          ctx.fill();
          break;
        case 'p-coin':
          ctx.beginPath();
          ctx.arc(cx, cy, 20, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.gold;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#A9781F';
          ctx.lineWidth = 3;
          ctx.stroke();
          break;
        case 'p-sugar':
          fillRoundRect(ctx, { x: cx - 16, y: cy - 16, w: 32, h: 32 }, COLORS.paper, 10);
          break;
        case 'p-ring':
          ctx.beginPath();
          ctx.arc(cx, cy, 26, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(242,193,78,0.85)';
          ctx.lineWidth = 5;
          ctx.stroke();
          break;
        default:
          break;
      }

      this.frames.set(id, {
        canvas: this.canvas,
        sx: x,
        sy: baseY,
        sw: PARTICLE,
        sh: PARTICLE,
      });
    });
  }
}
