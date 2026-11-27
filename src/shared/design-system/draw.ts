import { COLORS, FONT, RADIUS } from './tokens';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextOptions {
  size?: number;
  color?: string;
  weight?: 'normal' | '600' | '700' | 'bold';
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  fill: string,
  radius: number = RADIUS.lg,
): void {
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  stroke: string,
  lineWidth = 2,
  radius: number = RADIUS.lg,
): void {
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  options: { fill?: string; stroke?: string; radius?: number; shadow?: boolean } = {},
): void {
  const fill = options.fill ?? COLORS.paper;
  const stroke = options.stroke ?? 'rgba(58,46,42,0.16)';
  const radius = options.radius ?? RADIUS.lg;

  if (options.shadow !== false) {
    fillRoundRect(ctx, { ...rect, y: rect.y + 6 }, 'rgba(58,46,42,0.10)', radius);
  }
  fillRoundRect(ctx, rect, fill, radius);
  strokeRoundRect(ctx, rect, stroke, 2, radius);
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {},
): void {
  const size = options.size ?? FONT.body;
  const weight = options.weight ?? 'normal';
  ctx.font = `${weight} ${size}px ${FONT.family}`;
  ctx.fillStyle = options.color ?? COLORS.ink;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'middle';
  if (options.maxWidth !== undefined) {
    ctx.fillText(text, x, y, options.maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

export function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = '#A9781F';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(169,120,31,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawStar(ctx, cx, cy, radius * 0.34, radius * 0.16, '#FFF3C4');
}

/** 王都币：金币 + 城堡垛口，和普通星星/金币区分开。 */
export function drawWangduCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = COLORS.honeyDeep;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(185,134,47,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const w = radius * 0.78;
  const h = radius * 0.54;
  const left = cx - w / 2;
  const bottom = cy + h / 2;
  ctx.fillStyle = COLORS.honeyDeep;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, cy - h * 0.18);
  ctx.lineTo(left + w * 0.18, cy - h * 0.18);
  ctx.lineTo(left + w * 0.18, cy - h * 0.36);
  ctx.lineTo(left + w * 0.38, cy - h * 0.36);
  ctx.lineTo(left + w * 0.38, cy - h * 0.18);
  ctx.lineTo(left + w * 0.62, cy - h * 0.18);
  ctx.lineTo(left + w * 0.62, cy - h * 0.36);
  ctx.lineTo(left + w * 0.82, cy - h * 0.36);
  ctx.lineTo(left + w * 0.82, cy - h * 0.18);
  ctx.lineTo(left + w, cy - h * 0.18);
  ctx.lineTo(left + w, bottom);
  ctx.closePath();
  ctx.fill();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  fill: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (Math.PI * i) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawPetal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(angle) * radius * 0.52,
      cy + Math.sin(angle) * radius * 0.52,
      radius * 0.44,
      radius * 0.27,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
}

export function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.8, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.8, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
    const x = cx + Math.cos(angle) * size;
    const y = cy + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawBerry(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.08, size, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, cy - size * 0.92, size * 0.42, size * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.leaf;
  ctx.fill();
}

export function drawFish(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, size, size * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.95, cy);
  ctx.lineTo(cx - size * 1.5, cy - size * 0.55);
  ctx.lineTo(cx - size * 1.5, cy + size * 0.55);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + size * 0.5, cy - size * 0.14, size * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ink;
  ctx.fill();
}
