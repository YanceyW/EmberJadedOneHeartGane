import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { drawPaperPanel } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { ingredientName } from '../../../shared/content/ingredients';
import { ShiftSupplySlot, ShiftSupplySource } from '../systems/shift';
import {
  SUPPLY_GAP,
  SUPPLY_PAD,
  supplyRailMetrics,
} from './restaurant-view-data';

export interface SupplyRailChip {
  id: string;
  rect: Rect;
  locked?: boolean;
}

export interface SupplyRailLayout {
  chips: SupplyRailChip[];
  prev: Rect;
  next: Rect;
  scrollMax: number;
}

const SOURCE_LABEL: Record<ShiftSupplySource, string> = {
  base: '水',
  farm: '农',
  garden: '花',
  ranch: '牧',
};

export function drawSupplyRail(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  slots: readonly ShiftSupplySlot[] = [],
  scroll = 0,
): SupplyRailLayout {
  drawPaperPanel(ctx, rect, {
    fill: 'rgba(255,253,248,0.72)',
    radius: RADIUS.lg,
    stitch: false,
    seed: 1891,
  });
  const metrics = supplyRailMetrics(slots.length, rect.w);
  const clamped = Math.max(0, Math.min(metrics.maxScroll, scroll));
  const unlockedCount = slots.filter((slot) => slot.unlocked).length;
  drawText(
    ctx,
    `营业供应 · 左右滑动 · 已解锁 ${unlockedCount}/${slots.length}`,
    rect.x + 12,
    rect.y + 17,
    {
      size: 11,
      weight: '700',
      color: COLORS.inkSoft,
      maxWidth: rect.w - 132,
    },
  );

  const prev: Rect = { x: rect.x + rect.w - 66, y: rect.y + 4, w: 24, h: 20 };
  const next: Rect = { x: rect.x + rect.w - 34, y: rect.y + 4, w: 24, h: 20 };
  drawArrow(ctx, prev, '‹', clamped > 0);
  drawArrow(ctx, next, '›', clamped < metrics.maxScroll);

  const inner: Rect = {
    x: rect.x + SUPPLY_PAD,
    y: rect.y + 26,
    w: metrics.viewportWidth,
    h: rect.h - 36,
  };
  const chipH = Math.max(32, Math.min(42, (inner.h - SUPPLY_GAP) / 2));
  const chips: SupplyRailChip[] = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  slots.forEach((slot, index) => {
    const column = Math.floor(index / 2);
    const row = index % 2;
    const x = inner.x + column * (metrics.chipW + SUPPLY_GAP) - clamped;
    if (x + metrics.chipW < inner.x || x > inner.x + inner.w) return;
    const y = inner.y + row * (chipH + SUPPLY_GAP);
    const chip: Rect = { x, y, w: metrics.chipW, h: chipH };
    drawSupplyChip(ctx, chip, slot, index);
    chips.push({ id: slot.id, rect: chip, locked: !slot.unlocked });
  });
  ctx.restore();

  const track: Rect = {
    x: inner.x,
    y: rect.y + rect.h - 6,
    w: inner.w,
    h: 3,
  };
  ctx.fillStyle = 'rgba(58,46,42,0.12)';
  ctx.fillRect(track.x, track.y, track.w, track.h);
  if (metrics.maxScroll > 0) {
    const thumbW = Math.max(24, track.w * (track.w / metrics.contentWidth));
    const thumbX = track.x + (track.w - thumbW) * (clamped / metrics.maxScroll);
    ctx.fillStyle = COLORS.honeyDeep;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(thumbX, track.y, thumbW, track.h);
    ctx.globalAlpha = 1;
  }
  return { chips, prev, next, scrollMax: metrics.maxScroll };
}

function drawSupplyChip(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  slot: ShiftSupplySlot,
  index: number,
): void {
  ctx.save();
  ctx.globalAlpha = slot.unlocked ? 1 : 0.38;
  inkRoundRect(
    ctx,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    RADIUS.sm,
    slot.unlocked ? 'rgba(255,253,248,0.94)' : 'rgba(255,253,248,0.5)',
    {
      stroke: slot.unlocked ? 'rgba(58,46,42,0.12)' : 'rgba(58,46,42,0.08)',
      width: 1.2,
      seed: 1893 + index,
    },
  );
  drawGoods(ctx, slot.id, rect.x + 14, rect.y + rect.h / 2, Math.min(24, rect.h * 0.64));
  drawText(ctx, sourceName(slot.id), rect.x + 27, rect.y + 13, {
    size: 9.5,
    weight: '700',
    color: slot.unlocked ? COLORS.ink : COLORS.inkSoft,
    maxWidth: rect.w - 34,
  });
  drawText(ctx, SOURCE_LABEL[slot.source], rect.x + rect.w - 4, rect.y + 11, {
    size: 8,
    weight: '700',
    color: slot.source === 'ranch' ? COLORS.coral : COLORS.honeyDeep,
    align: 'right',
  });
  drawText(ctx, slot.unlocked ? '∞' : '锁', rect.x + rect.w - 4, rect.y + rect.h - 4, {
    size: 8.5,
    weight: '700',
    color: slot.unlocked ? COLORS.jade : COLORS.inkSoft,
    align: 'right',
  });
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  enabled: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.28;
  inkRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, RADIUS.sm, COLORS.paper, {
    stroke: 'rgba(58,46,42,0.16)',
    width: 1,
    seed: 1895 + (label === '‹' ? 0 : 1),
  });
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5, {
    size: 17,
    weight: '700',
    color: COLORS.ink,
    align: 'center',
  });
  ctx.restore();
}

function sourceName(id: string): string {
  return ingredientName(id);
}
