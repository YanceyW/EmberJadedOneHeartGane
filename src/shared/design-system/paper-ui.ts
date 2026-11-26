import { drawText, Rect } from './draw';
import { inkRoundRect, paperShade, roundRectPoints, strokeInk, tracePath } from './paint';
import { COLORS, FONT, PAPER_UI, RADIUS, TOWN_COLORS } from './tokens';

export interface PaperPanelOptions {
  fill?: string;
  radius?: number;
  shadow?: boolean;
  stitch?: boolean;
  stroke?: string;
  strokeWidth?: number;
  seed?: number;
}

export function drawPaperPanel(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  options: PaperPanelOptions = {},
): void {
  const radius = options.radius ?? RADIUS.xl;
  const fill = options.fill ?? COLORS.paper;
  if (options.shadow !== false) {
    inkRoundRect(
      ctx,
      rect.x + 4,
      rect.y + 6,
      rect.w,
      rect.h,
      radius,
      'rgba(58,46,42,0.12)',
      { width: 0 },
    );
  }
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius, fill, {
    stroke: options.stroke ?? PAPER_UI.edge,
    width: options.strokeWidth ?? 2.5,
    seed: options.seed ?? 41,
  });
  // 底部厚边，避免纯渐变每帧创建。
  ctx.save();
  tracePath(ctx, roundRectPoints(rect.x, rect.y, rect.w, rect.h, radius, 8), true);
  ctx.clip();
  ctx.fillStyle = 'rgba(90,66,52,0.055)';
  ctx.fillRect(rect.x, rect.y + rect.h - 12, rect.w, 12);
  ctx.restore();
  if (options.stitch) {
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = PAPER_UI.stitch;
    ctx.lineWidth = 1.5;
    tracePath(
      ctx,
      roundRectPoints(rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16, Math.max(6, radius - 6), 6),
      true,
    );
    ctx.stroke();
    ctx.restore();
  }
}

export interface StickerButtonOptions {
  fill?: string;
  textColor?: string;
  radius?: number;
  pressed?: boolean;
  disabled?: boolean;
  fontSize?: number;
  seed?: number;
  stroke?: string;
}

export function drawStickerButton(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  options: StickerButtonOptions = {},
): void {
  const sink = options.pressed ? 3 : 0;
  const radius = options.radius ?? RADIUS.lg;
  const fill = options.disabled
    ? 'rgba(58,46,42,0.10)'
    : (options.fill ?? COLORS.jade);
  const textColor = options.disabled ? COLORS.inkSoft : (options.textColor ?? COLORS.paper);
  const y = rect.y + sink;
  inkRoundRect(ctx, rect.x, rect.y + 5, rect.w, rect.h, radius, 'rgba(58,46,42,0.16)', {
    width: 0,
  });
  inkRoundRect(ctx, rect.x, y, rect.w, rect.h, radius, fill, {
    stroke: options.stroke ?? 'rgba(58,46,42,0.30)',
    width: 2.5,
    seed: options.seed ?? 53,
  });
  drawText(ctx, label, rect.x + rect.w / 2, y + rect.h / 2 + 1, {
    size: options.fontSize ?? FONT.body,
    weight: '700',
    color: textColor,
    align: 'center',
    maxWidth: rect.w - 16,
  });
}

export function drawPillToggle(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  on: boolean,
  accent: string = COLORS.jade,
): void {
  const radius = rect.h / 2;
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius, on ? accent : 'rgba(58,46,42,0.12)', {
    stroke: 'rgba(58,46,42,0.24)',
    width: 2,
    seed: 67,
  });
  const knob = rect.h - 10;
  const kx = on ? rect.x + rect.w - knob - 5 : rect.x + 5;
  ctx.beginPath();
  ctx.arc(kx + knob / 2, rect.y + rect.h / 2, knob / 2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,46,42,0.20)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function segmentRects(rect: Rect, count: number, gap = 6): Rect[] {
  const itemW = (rect.w - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({
    x: rect.x + index * (itemW + gap),
    y: rect.y,
    w: itemW,
    h: rect.h,
  }));
}

export function drawSegmented(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  labels: readonly string[],
  activeIndex: number,
  accent: string = COLORS.jade,
): Rect[] {
  const rects = segmentRects(rect, labels.length);
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2, 'rgba(58,46,42,0.08)', {
    stroke: 'rgba(58,46,42,0.16)',
    width: 2,
    seed: 71,
  });
  rects.forEach((item, index) => {
    const active = index === activeIndex;
    if (active) {
      inkRoundRect(ctx, item.x + 2, item.y + 2, item.w - 4, item.h - 4, item.h / 2, accent, {
        stroke: 'rgba(58,46,42,0.18)',
        width: 1.5,
        seed: 73 + index,
      });
    }
    drawText(ctx, labels[index], item.x + item.w / 2, item.y + item.h / 2 + 1, {
      size: 16,
      weight: active ? '700' : 'normal',
      color: active ? COLORS.paper : COLORS.inkSoft,
      align: 'center',
      maxWidth: item.w - 8,
    });
  });
  return rects;
}

export function drawSettingRow(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  title: string,
  description: string,
  on: boolean,
  options: { disabled?: boolean; accent?: string } = {},
): void {
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, RADIUS.md, 'rgba(255,253,248,0.78)', {
    stroke: 'rgba(58,46,42,0.12)',
    width: 1.5,
    seed: 83,
  });
  drawText(ctx, title, rect.x + 16, rect.y + 21, {
    size: 18,
    weight: '700',
    color: options.disabled ? COLORS.inkSoft : COLORS.ink,
  });
  drawText(ctx, description, rect.x + 16, rect.y + 45, {
    size: 13,
    color: COLORS.inkSoft,
    maxWidth: rect.w - 120,
  });
  drawPillToggle(
    ctx,
    { x: rect.x + rect.w - 84, y: rect.y + rect.h / 2 - 17, w: 64, h: 34 },
    on,
    options.disabled ? COLORS.inkSoft : (options.accent ?? COLORS.jade),
  );
}

export function drawTapeNote(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  lines: readonly string[],
  options: { align?: CanvasTextAlign; textColor?: string; fill?: string } = {},
): void {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(-0.012);
  inkRoundRect(
    ctx,
    -rect.w / 2,
    -rect.h / 2,
    rect.w,
    rect.h,
    RADIUS.md,
    options.fill ?? COLORS.paper,
    { stroke: 'rgba(58,46,42,0.20)', width: 2, seed: 97 },
  );
  ctx.fillStyle = PAPER_UI.tape;
  ctx.fillRect(-24, -rect.h / 2 - 5, 48, 12);
  const align = options.align ?? 'center';
  const x = align === 'left' ? -rect.w / 2 + 18 : 0;
  lines.forEach((line, index) => {
    drawText(ctx, line, x, -rect.h / 2 + 26 + index * 24, {
      size: index === 0 ? 17 : 14,
      weight: index === 0 ? '700' : 'normal',
      color: options.textColor ?? (index === 0 ? COLORS.ink : COLORS.inkSoft),
      align,
      maxWidth: rect.w - 36,
    });
  });
  ctx.restore();
}

export function drawWoodRibbon(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
): void {
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2, TOWN_COLORS.wood, {
    stroke: TOWN_COLORS.woodDeep,
    width: 2,
    seed: 101,
  });
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, {
    size: 13,
    weight: '700',
    color: COLORS.paper,
    align: 'center',
    maxWidth: rect.w - 10,
  });
}

export function drawDivider(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(58,46,42,0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

export { paperShade, strokeInk };
