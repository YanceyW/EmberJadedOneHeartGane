import { createRng } from '../../core/rng';
import { platform } from '../platform/wx';
import { COLORS, TOWN_COLORS } from './tokens';

export interface Point {
  x: number;
  y: number;
}

export interface InkOptions {
  /** 描边色，默认暖深色。 */
  stroke?: string;
  /** 设计像素线宽，默认 3。 */
  width?: number;
  /** 手抖种子；同一物体固定种子，保证烘焙结果稳定。 */
  seed?: number;
  /** 手抖幅度（设计像素），0 为完全平滑。 */
  wobble?: number;
  /** 是否再叠一遍更淡的线，模拟铅笔起稿。 */
  doubleStroke?: boolean;
}

const DEFAULT_INK = COLORS.ink;

export function roundRectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  segments = 7,
): Point[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const pts: Point[] = [];
  const n = Math.max(2, segments);
  // 顺时针：上边 → 右上角 → 右边 → 右下角 → 下边 → 左下角 → 左边 → 左上角。
  for (let i = 0; i < n; i += 1) pts.push({ x: x + r + ((w - 2 * r) * i) / (n - 1), y });
  for (let i = 1; i <= n; i += 1) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / n);
    pts.push({ x: x + w - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
  }
  for (let i = 1; i <= n; i += 1) {
    pts.push({ x: x + w, y: y + r + ((h - 2 * r) * i) / n });
  }
  for (let i = 1; i <= n; i += 1) {
    const a = (Math.PI / 2) * (i / n);
    pts.push({ x: x + w - r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
  }
  for (let i = 1; i <= n; i += 1) {
    pts.push({ x: x + w - r - ((w - 2 * r) * i) / n, y: y + h });
  }
  for (let i = 1; i <= n; i += 1) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / n);
    pts.push({ x: x + r + Math.cos(a) * r, y: y + h - r + Math.sin(a) * r });
  }
  for (let i = 1; i <= n; i += 1) {
    pts.push({ x, y: y + h - r - ((h - 2 * r) * i) / n });
  }
  for (let i = 1; i <= n; i += 1) {
    const a = Math.PI + (Math.PI / 2) * (i / n);
    pts.push({ x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r });
  }
  return pts;
}

export function ellipsePoints(cx: number, cy: number, rx: number, ry: number, segments = 32): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (Math.PI * 2 * i) / segments;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

export function wobblePoints(points: readonly Point[], seed: number, amount = 1): Point[] {
  if (amount <= 0) return points.map((p) => ({ x: p.x, y: p.y }));
  const rng = createRng(seed || 1);
  return points.map((p) => ({
    x: p.x + (rng.next() * 2 - 1) * amount,
    y: p.y + (rng.next() * 2 - 1) * amount,
  }));
}

export function tracePath(ctx: CanvasRenderingContext2D, points: readonly Point[], close: boolean): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  if (close) ctx.closePath();
}

export function fillPoints(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: string,
): void {
  tracePath(ctx, points, true);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeInk(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  options: InkOptions = {},
): void {
  const width = options.width ?? 3;
  const amount = options.wobble ?? 0.9;
  const seed = options.seed ?? 7;
  const color = options.stroke ?? DEFAULT_INK;
  const path = wobblePoints(points, seed, amount);
  tracePath(ctx, path, true);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (options.doubleStroke === true) {
    const ghost = wobblePoints(points, seed + 31, amount * 0.6);
    tracePath(ctx, ghost, true);
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = Math.max(1, width * 0.7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function inkRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: string | null,
  options: InkOptions = {},
): void {
  if (fill) {
    tracePath(ctx, roundRectPoints(x, y, w, h, radius, 8), true);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (options.width !== 0) {
    strokeInk(ctx, roundRectPoints(x, y, w, h, radius, 8), {
      seed: options.seed ?? 11,
      ...options,
    });
  }
}

export function inkEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string | null,
  options: InkOptions = {},
): void {
  const pts = ellipsePoints(cx, cy, rx, ry, 30);
  if (fill) {
    tracePath(ctx, pts, true);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (options.width !== 0) {
    strokeInk(ctx, pts, { seed: options.seed ?? 17, ...options });
  }
}

export function inkLine(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  options: InkOptions = {},
): void {
  const width = options.width ?? 3;
  const path = wobblePoints(points, options.seed ?? 23, options.wobble ?? 0.7);
  tracePath(ctx, path, false);
  ctx.strokeStyle = options.stroke ?? DEFAULT_INK;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** 多层椭圆模拟软阴影；不要每帧使用 shadowBlur。 */
export function softShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.18,
  layers = 5,
): void {
  for (let i = 0; i < layers; i += 1) {
    const grow = 1 + 0.28 * (i / Math.max(1, layers - 1));
    const a = (alpha * (1 - i / layers)) / 2.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * grow, ry * grow, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(74,58,48,${a.toFixed(3)})`;
    ctx.fill();
  }
}

/** 纸雕面板的底部内阴影。 */
export function paperShade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  strength = 0.1,
): void {
  ctx.save();
  tracePath(ctx, roundRectPoints(x, y, w, h, radius, 8), true);
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, y + h * 0.5, 0, y + h);
  gradient.addColorStop(0, 'rgba(90,66,52,0)');
  gradient.addColorStop(1, `rgba(90,66,52,${strength.toFixed(3)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
  ctx.restore();
}

let grainTile: any = null;
const GRAIN_SIZE = 96;

function getGrainTile(): any {
  if (grainTile) return grainTile;
  const tile = platform.createOffscreenCanvas(GRAIN_SIZE, GRAIN_SIZE);
  const ctx = tile.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  const rng = createRng(0x51f15e);
  ctx.clearRect(0, 0, GRAIN_SIZE, GRAIN_SIZE);
  for (let i = 0; i < 260; i += 1) {
    const x = rng.next() * GRAIN_SIZE;
    const y = rng.next() * GRAIN_SIZE;
    const size = 0.6 + rng.next() * 1.2;
    ctx.globalAlpha = 0.04 + rng.next() * 0.07;
    ctx.fillStyle = i % 4 === 0 ? COLORS.paper : TOWN_COLORS.woodDeep;
    ctx.fillRect(x, y, size, size);
  }
  for (let i = 0; i < 14; i += 1) {
    const x = rng.next() * GRAIN_SIZE;
    const y = rng.next() * GRAIN_SIZE;
    const len = 3 + rng.next() * 9;
    ctx.globalAlpha = 0.05 + rng.next() * 0.05;
    ctx.strokeStyle = COLORS.paper;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rng.next() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  grainTile = tile;
  return tile;
}

/** 用预生成纸纹 tile 铺一层；只在烘焙时调用。 */
export function drawPaperGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.5,
): void {
  const tile = getGrainTile();
  if (!tile) return;
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** 给烘焙画布上的已有像素叠纸纹，不污染透明区域。 */
export function applyGrainToOpaque(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha = 0.5,
): void {
  const tile = getGrainTile();
  if (!tile) return;
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** 一条轻微手抖的胶带/缝线。 */
export function drawTape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  angle = -0.06,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = COLORS.honey;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 2);
  ctx.restore();
}
