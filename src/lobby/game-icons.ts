import { drawPetal, drawStar, fillRoundRect, strokeRoundRect } from '../shared/design-system/draw';
import { Accent, COLORS } from '../shared/design-system/tokens';

export type Match3IconStyle = 'candy' | 'swap' | 'honey';

/**
 * 大厅场馆图标：统一 2D 平面风格（无挤出、无透视），
 * 与 2.5D 王都建筑的厚度区分开，符合 ADR-0011 的「首页 2.5D、玩法 2D」。
 */
export function drawGameIcon(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  size: number,
  accent: Accent,
  match3Style: string = 'candy',
): void {
  switch (id) {
    case 'match3':
      drawMatch3Icon(ctx, cx, cy, size, match3Style);
      break;
    case 'garden':
      drawGardenIcon(ctx, cx, cy, size, accent);
      break;
    case 'merge':
      drawMergeIcon(ctx, cx, cy, size);
      break;
    case 'aquarium':
      drawAquariumIcon(ctx, cx, cy, size, accent);
      break;
    default:
      drawPetal(ctx, cx, cy, size * 0.8, accent.main);
      break;
  }
}

function roundCandy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  face = false,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,46,42,0.30)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(
    x - radius * 0.32,
    y - radius * 0.38,
    radius * 0.32,
    radius * 0.18,
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  if (!face) return;
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(x - radius * 0.28, y - radius * 0.05, 1.6, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.28, y - radius * 0.05, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + radius * 0.12, radius * 0.3, 0.15, Math.PI - 0.15);
  ctx.stroke();
}

function drawCandyFaceIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const radius = size * 0.21;
  const gap = size * 0.29;
  roundCandy(ctx, cx - gap, cy + size * 0.04, radius, COLORS.berry);
  roundCandy(ctx, cx, cy - size * 0.08, radius * 1.1, COLORS.honey, true);
  roundCandy(ctx, cx + gap, cy + size * 0.04, radius, COLORS.mint);
  drawStar(ctx, cx + size * 0.4, cy - size * 0.4, size * 0.13, size * 0.055, COLORS.gold);
}

function drawSwapIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const tile = size * 0.42;
  const left = { x: cx - tile - size * 0.06, y: cy - tile * 0.72, w: tile, h: tile };
  const right = { x: cx + size * 0.06, y: cy - tile * 0.28, w: tile, h: tile };
  fillRoundRect(ctx, left, COLORS.berry, tile * 0.3);
  strokeRoundRect(ctx, left, 'rgba(58,46,42,0.28)', 2.5, tile * 0.3);
  fillRoundRect(ctx, right, COLORS.honey, tile * 0.3);
  strokeRoundRect(ctx, right, 'rgba(58,46,42,0.28)', 2.5, tile * 0.3);

  ctx.save();
  ctx.globalAlpha = 0.55;
  fillRoundRect(
    ctx,
    { x: left.x + tile * 0.16, y: left.y + tile * 0.12, w: tile * 0.68, h: tile * 0.12 },
    COLORS.paper,
    tile * 0.06,
  );
  fillRoundRect(
    ctx,
    { x: right.x + tile * 0.16, y: right.y + tile * 0.12, w: tile * 0.68, h: tile * 0.12 },
    COLORS.paper,
    tile * 0.06,
  );
  ctx.restore();

  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.36, -0.25, Math.PI * 1.2);
  ctx.stroke();
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.38, cy + size * 0.06);
  ctx.lineTo(cx - size * 0.48, cy - size * 0.08);
  ctx.lineTo(cx - size * 0.26, cy - size * 0.08);
  ctx.closePath();
  ctx.fill();
  drawStar(ctx, cx + size * 0.42, cy - size * 0.42, size * 0.12, size * 0.05, COLORS.gold);
}

function drawHoneyJarIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const body = { x: cx - size * 0.4, y: cy - size * 0.2, w: size * 0.8, h: size * 0.72 };
  fillRoundRect(ctx, body, COLORS.honey, size * 0.24);
  strokeRoundRect(ctx, body, 'rgba(58,46,42,0.28)', 2.5, size * 0.24);
  fillRoundRect(
    ctx,
    { x: cx - size * 0.32, y: cy - size * 0.42, w: size * 0.64, h: size * 0.2 },
    COLORS.honeyDeep,
    size * 0.08,
  );
  fillRoundRect(
    ctx,
    { x: cx - size * 0.24, y: cy - size * 0.06, w: size * 0.48, h: size * 0.24 },
    COLORS.paper,
    size * 0.08,
  );
  drawStar(ctx, cx, cy + size * 0.08, size * 0.12, size * 0.05, COLORS.gold);
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.22, cy + size * 0.08, size * 0.06, size * 0.16, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawStar(ctx, cx + size * 0.38, cy - size * 0.4, size * 0.1, size * 0.04, COLORS.gold);
}

function drawMatch3Icon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  style: string,
): void {
  if (style === 'swap') drawSwapIcon(ctx, cx, cy, size);
  else if (style === 'honey') drawHoneyJarIcon(ctx, cx, cy, size);
  else drawCandyFaceIcon(ctx, cx, cy, size);
}

function drawGardenIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  accent: Accent,
): void {
  // 花盆
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.58, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.58, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.82);
  ctx.lineTo(cx - size * 0.38, cy + size * 0.82);
  ctx.closePath();
  ctx.fillStyle = COLORS.peach;
  ctx.fill();
  ctx.strokeStyle = COLORS.inkSoft;
  ctx.lineWidth = 2;
  ctx.stroke();

  fillRoundRect(
    ctx,
    { x: cx - size * 0.64, y: cy + size * 0.06, w: size * 1.28, h: size * 0.22 },
    COLORS.coral,
    size * 0.1,
  );

  // 花茎与叶子
  ctx.strokeStyle = accent.main;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.12);
  ctx.lineTo(cx, cy - size * 0.5);
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = accent.main;
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.28, cy - size * 0.12, size * 0.24, size * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawPetal(ctx, cx, cy - size * 0.5, size * 0.52, COLORS.petal);
}

function drawMergeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  fillRoundRect(
    ctx,
    { x: cx - size * 0.56, y: cy - size * 0.24, w: size * 1.12, h: size * 1.08 },
    COLORS.gold,
    size * 0.24,
  );
  strokeRoundRect(
    ctx,
    { x: cx - size * 0.56, y: cy - size * 0.24, w: size * 1.12, h: size * 1.08 },
    'rgba(58,46,42,0.22)',
    2,
    size * 0.24,
  );
  fillRoundRect(
    ctx,
    { x: cx - size * 0.42, y: cy - size * 0.5, w: size * 0.84, h: size * 0.3 },
    COLORS.inkSoft,
    size * 0.12,
  );
  fillRoundRect(
    ctx,
    { x: cx - size * 0.3, y: cy + size * 0.18, w: size * 0.6, h: size * 0.34 },
    COLORS.paper,
    size * 0.1,
  );
  drawStar(ctx, cx, cy + size * 0.35, size * 0.1, size * 0.045, COLORS.gold);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.3, cy + size * 0.02, size * 0.09, size * 0.22, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawStar(ctx, cx + size * 0.72, cy - size * 0.72, size * 0.16, size * 0.07, COLORS.honey);
}

function drawAquariumIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  accent: Accent,
): void {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.04, size * 0.84, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.sky;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.04, size * 0.84, 0, Math.PI * 2);
  ctx.strokeStyle = accent.main;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 小鱼
  const fishX = cx - size * 0.08;
  const fishY = cy + size * 0.14;
  ctx.beginPath();
  ctx.ellipse(fishX, fishY, size * 0.34, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.lilac;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fishX - size * 0.3, fishY);
  ctx.lineTo(fishX - size * 0.58, fishY - size * 0.2);
  ctx.lineTo(fishX - size * 0.58, fishY + size * 0.2);
  ctx.closePath();
  ctx.fillStyle = COLORS.petal;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(fishX + size * 0.16, fishY - size * 0.04, size * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ink;
  ctx.fill();

  // 气泡
  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = 2;
  for (const [dx, dy, radius] of [
    [0.34, -0.4, 0.09],
    [0.52, -0.18, 0.06],
  ] as Array<[number, number, number]>) {
    ctx.beginPath();
    ctx.arc(cx + size * dx, cy + size * dy, size * radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
