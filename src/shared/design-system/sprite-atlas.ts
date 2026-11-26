import { platform } from '../platform/wx';
import { drawPetal, drawStar, fillRoundRect, roundRectPath, strokeRoundRect } from './draw';
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
  | 'p-ring'
  | 'p-leaf'
  | 'p-firefly'
  | 'p-splash'
  | 'p-smoke';

export interface SpriteFrame {
  canvas: any;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const TILE = 128;
const PARTICLE = 64;
const ATLAS_W = 896;
const ATLAS_H = 256;

interface TileStyle {
  fill: string;
  shade: string;
  symbol: 'berry' | 'jar' | 'candy' | 'macaron' | 'flower';
  pattern: 'dots' | 'stripes' | 'swirl' | 'ridge' | 'petals';
}

// 顺序必须与 game 里的 tile 索引一致：莓果 / 蜂蜜 / 薄荷 / 马卡龙 / 花瓣糖。
// 每种方块同时用颜色、轮廓和纹理区分，灰度下也能快速配对。
const TILE_STYLES: TileStyle[] = [
  { fill: COLORS.petal, shade: COLORS.petalDeep, symbol: 'berry', pattern: 'dots' },
  { fill: COLORS.honey, shade: COLORS.honeyDeep, symbol: 'jar', pattern: 'stripes' },
  { fill: COLORS.mint, shade: COLORS.mintDeep, symbol: 'candy', pattern: 'swirl' },
  { fill: COLORS.water, shade: COLORS.waterDeep, symbol: 'macaron', pattern: 'ridge' },
  { fill: COLORS.lilac, shade: COLORS.lilacDeep, symbol: 'flower', pattern: 'petals' },
];

const PARTICLE_CELLS: SpriteId[] = [
  'p-star',
  'p-petal',
  'p-bubble',
  'p-dust',
  'p-coin',
  'p-sugar',
  'p-ring',
  'p-leaf',
  'p-firefly',
  'p-splash',
  'p-smoke',
];

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
      gradient.addColorStop(0, COLORS.paper);
      gradient.addColorStop(0.35, style.fill);
      gradient.addColorStop(1, style.fill);
      ctx.save();
      roundRectPath(ctx, face.x, face.y, face.w, face.h, RADIUS.xl);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.restore();
      strokeRoundRect(ctx, face, 'rgba(58,46,42,0.30)', 3, RADIUS.xl);

      // 底部内阴影，让方块有接触感
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = style.shade;
      ctx.beginPath();
      ctx.ellipse(
        face.x + face.w / 2,
        face.y + face.h * 0.86,
        face.w * 0.38,
        face.h * 0.13,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // 顶部高光
      ctx.save();
      ctx.globalAlpha = 0.5;
      fillRoundRect(
        ctx,
        { x: face.x + 14, y: face.y + 10, w: face.w - 28, h: 18 },
        COLORS.paper,
        9,
      );
      ctx.restore();

      this.drawPattern(ctx, face, style);

      const cx = face.x + face.w / 2;
      const cy = face.y + face.h / 2 + 4;
      const size = face.w * 0.34;
      switch (style.symbol) {
        case 'berry':
          this.drawBerryCluster(ctx, cx, cy, size);
          break;
        case 'jar':
          this.drawHoneyJar(ctx, cx, cy, size);
          break;
        case 'candy':
          this.drawCandyWrap(ctx, cx, cy, size);
          break;
        case 'macaron':
          this.drawMacaron(ctx, cx, cy, size);
          break;
        case 'flower':
          this.drawFlower(ctx, cx, cy, size);
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

  private drawPattern(
    ctx: CanvasRenderingContext2D,
    face: { x: number; y: number; w: number; h: number },
    style: TileStyle,
  ): void {
    ctx.save();
    roundRectPath(ctx, face.x, face.y, face.w, face.h, RADIUS.xl);
    ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = style.shade;
    ctx.fillStyle = style.shade;
    ctx.lineWidth = 3;

    switch (style.pattern) {
      case 'dots':
        for (let row = 0; row < 4; row += 1) {
          for (let col = 0; col < 4; col += 1) {
            ctx.beginPath();
            ctx.arc(
              face.x + 18 + col * 26 + (row % 2) * 8,
              face.y + 22 + row * 24,
              3.5,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        break;
      case 'stripes':
        for (let i = -2; i < 8; i += 1) {
          ctx.beginPath();
          ctx.moveTo(face.x + i * 22, face.y + face.h);
          ctx.lineTo(face.x + i * 22 + 42, face.y);
          ctx.stroke();
        }
        break;
      case 'swirl':
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 4; t += 0.12) {
          const radius = 3 + t * 5.2;
          const x = face.x + face.w / 2 + Math.cos(t) * radius;
          const y = face.y + face.h / 2 + Math.sin(t) * radius * 0.7;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      case 'ridge':
        for (let i = 0; i < 6; i += 1) {
          ctx.beginPath();
          ctx.moveTo(face.x + 10, face.y + 18 + i * 18);
          ctx.lineTo(face.x + face.w - 10, face.y + 18 + i * 18);
          ctx.stroke();
        }
        break;
      case 'petals':
        for (let i = 0; i < 6; i += 1) {
          drawPetal(
            ctx,
            face.x + 18 + (i % 3) * 32,
            face.y + 24 + Math.floor(i / 3) * 34,
            9,
            style.shade,
          );
        }
        break;
    }
    ctx.restore();
  }

  private drawBerryCluster(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
  ): void {
    ctx.save();
    ctx.fillStyle = COLORS.leaf;
    ctx.strokeStyle = 'rgba(58,46,42,0.24)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.12, cy - size * 0.95, size * 0.46, size * 0.2, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const berries: Array<[number, number, number]> = [
      [-0.42, 0.08, 0.46],
      [0.42, 0.08, 0.46],
      [0, -0.42, 0.5],
    ];
    for (const [dx, dy, radius] of berries) {
      ctx.beginPath();
      ctx.arc(cx + dx * size, cy + dy * size, radius * size, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.berry;
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,46,42,0.24)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,253,248,0.72)';
    const shines: Array<[number, number]> = [
      [-0.5, -0.02],
      [0.34, -0.02],
      [-0.08, -0.52],
    ];
    for (const [dx, dy] of shines) {
      ctx.beginPath();
      ctx.arc(cx + dx * size, cy + dy * size, size * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHoneyJar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    const body = { x: cx - size, y: cy - size * 0.55, w: size * 2, h: size * 1.4 };
    fillRoundRect(ctx, body, COLORS.honeyDeep, size * 0.35);
    strokeRoundRect(ctx, body, 'rgba(58,46,42,0.22)', 3, size * 0.35);

    fillRoundRect(
      ctx,
      { x: cx - size * 0.78, y: body.y - size * 0.42, w: size * 1.56, h: size * 0.5 },
      COLORS.inkSoft,
      size * 0.2,
    );
    fillRoundRect(
      ctx,
      { x: cx - size * 0.55, y: cy + size * 0.1, w: size * 1.1, h: size * 0.55 },
      COLORS.paper,
      size * 0.18,
    );
    drawStar(ctx, cx, cy + size * 0.38, size * 0.2, size * 0.09, COLORS.gold);

    // 蜜勺：让“蜂蜜罐”和“糖果”在轮廓上彻底分开。
    ctx.strokeStyle = COLORS.honeyDeep;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + size * 1.02, cy - size * 0.76);
    ctx.lineTo(cx + size * 1.18, cy + size * 0.28);
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(cx + size * 1.18, cy + size * 0.12 + i * size * 0.1, size * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.honeyDeep;
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.45, cy + size * 0.05, size * 0.14, size * 0.3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCandyWrap(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.save();
    ctx.fillStyle = COLORS.mintDeep;
    ctx.strokeStyle = 'rgba(58,46,42,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.55, cy);
    ctx.lineTo(cx - size * 1.25, cy - size * 0.55);
    ctx.lineTo(cx - size * 1.2, cy + size * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.55, cy);
    ctx.lineTo(cx + size * 1.25, cy - size * 0.55);
    ctx.lineTo(cx + size * 1.2, cy + size * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(58,46,42,0.22)';
    ctx.stroke();

    // 中心用漩涡而不是星星：和花瓣糖的白色花瓣拉开轮廓差异。
    ctx.strokeStyle = COLORS.mintDeep;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.34, 0.2, Math.PI * 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.18, Math.PI * 1.35, Math.PI * 2.2);
    ctx.stroke();
    ctx.restore();
  }

  private drawMacaron(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    const w = size * 1.85;
    const h = size * 0.72;

    fillRoundRect(
      ctx,
      { x: cx - w / 2, y: cy - size * 0.02, w, h: size * 0.3 },
      COLORS.peach,
      size * 0.12,
    );

    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.42, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.water;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.26)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.25, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.sky;
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(58,46,42,0.12)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + i * size * 0.3, cy - size * 0.25, size * 0.12, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.2, cy - size * 0.3, size * 0.2, size * 0.1, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    drawPetal(ctx, cx, cy, size * 1.05, COLORS.paper);
    ctx.save();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    ctx.arc(cx - size * 0.08, cy - size * 0.08, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
        case 'p-leaf':
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(-0.5);
          ctx.beginPath();
          ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.leaf;
          ctx.fill();
          ctx.strokeStyle = 'rgba(58,46,42,0.24)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(18, 0);
          ctx.strokeStyle = 'rgba(255,253,248,0.65)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          break;
        case 'p-firefly':
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,243,196,0.24)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,243,196,0.9)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx - 2, cy - 2, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.paper;
          ctx.fill();
          break;
        case 'p-splash':
          ctx.beginPath();
          ctx.ellipse(cx, cy + 4, 9, 14, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(191,227,242,0.9)';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx - 3, cy - 1, 3.2, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fill();
          break;
        case 'p-smoke':
          ctx.beginPath();
          ctx.arc(cx - 7, cy + 3, 12, 0, Math.PI * 2);
          ctx.arc(cx + 8, cy + 5, 10, 0, Math.PI * 2);
          ctx.arc(cx + 1, cy - 7, 11, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,253,248,0.62)';
          ctx.fill();
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
