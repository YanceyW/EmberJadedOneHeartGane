import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { drawPaperPanel, drawTapeNote } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { RECIPE_SHAPE_CELLS, RECIPE_SHAPE_LABEL, RecipeShape } from '../data/combos';
import { AdviceCard } from '../systems/advice';

export function drawSuggestions(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  cards: readonly AdviceCard[],
  fallback: string,
): void {
  if (cards.length === 0) {
    drawTapeNote(ctx, rect, [fallback], { align: 'center' });
    return;
  }
  drawPaperPanel(ctx, rect, {
    fill: 'rgba(255,253,248,0.58)',
    radius: RADIUS.lg,
    stitch: false,
    seed: 2071,
  });
  const gap = 6;
  const cardW = (rect.w - 20 - gap * 2) / 3;
  cards.slice(0, 3).forEach((card, index) => {
    const box: Rect = {
      x: rect.x + 10 + index * (cardW + gap),
      y: rect.y + 6,
      w: cardW,
      h: rect.h - 12,
    };
    inkRoundRect(ctx, box.x, box.y, box.w, box.h, RADIUS.sm, 'rgba(255,253,248,0.9)', {
      stroke: 'rgba(58,46,42,0.12)',
      width: 1,
      seed: 2081 + index,
    });
    drawGoods(ctx, card.recipe.output, box.x + 16, box.y + 17, 24);
    drawText(ctx, card.title, box.x + 31, box.y + 11, {
      size: 8.5,
      weight: '700',
      color: card.kind === 'stove' ? COLORS.coral : card.kind === 'customer' ? COLORS.honeyDeep : COLORS.ink,
      maxWidth: box.w - 74,
    });
    drawText(ctx, card.detail, box.x + 31, box.y + 24, {
      size: 7.8,
      color: COLORS.inkSoft,
      maxWidth: box.w - 74,
    });
    drawText(ctx, RECIPE_SHAPE_LABEL[card.recipe.shape], box.x + 31, box.y + box.h - 8, {
      size: 7.5,
      color: COLORS.inkSoft,
      maxWidth: box.w - 74,
    });
    drawPattern(ctx, box.x + box.w - 38, box.y + 8, card.recipe.shape);
  });
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: RecipeShape,
): void {
  const active = new Set(RECIPE_SHAPE_CELLS[shape]);
  const size = 9;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const index = row * 3 + col;
      inkRoundRect(
        ctx,
        x + col * size,
        y + row * size,
        size - 1,
        size - 1,
        2,
        active.has(index) ? COLORS.honey : 'rgba(58,46,42,0.06)',
        { width: 0 },
      );
    }
  }
}
