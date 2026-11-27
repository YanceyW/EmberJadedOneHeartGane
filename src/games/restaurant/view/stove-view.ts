import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { inkRoundRect, softShadow } from '../../../shared/design-system/paint';
import { drawPaperPanel } from '../../../shared/design-system/paper-ui';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { ingredientName } from '../../../shared/content/ingredients';
import { ComboRecipe, RECIPE_SHAPE_CELLS } from '../data/combos';
import {
  STOVE_CHAR_SECONDS,
  STOVE_COLS,
  STOVE_MAX_CHAR,
  STOVE_ROWS,
  StoveState,
  canUpgradeStove,
  freshSeconds,
  matchStove,
  qualityForStove,
} from '../systems/stove';
import { StoveLayout } from './restaurant-types';
import { drawQualityBadge } from './counter-view';

export function drawStove(
  ctx: CanvasRenderingContext2D,
  card: Rect,
  stove: StoveState,
  index: number,
  selected: boolean,
  ghost?: ComboRecipe,
): StoveLayout {
  drawPaperPanel(ctx, card, {
    fill: selected ? 'rgba(255,253,248,0.98)' : 'rgba(255,253,248,0.9)',
    radius: RADIUS.lg,
    stitch: selected,
    seed: 2001 + index,
  });
  drawText(ctx, `灶台 ${index + 1}`, card.x + 12, card.y + 19, {
    size: 12.5,
    weight: '700',
    color: COLORS.ink,
  });
  const status = stove.burnt
    ? '焦炭'
    : stove.ready
      ? '出锅'
      : stove.cooking
        ? `烹饪 ${stove.cooking.left.toFixed(1)}s`
        : stove.assembling
          ? `备齐 ${stove.assembleLeft.toFixed(1)}s`
          : '备料';
  drawText(ctx, status, card.x + card.w - 12, card.y + 19, {
    size: 10,
    weight: '700',
    color: stove.burnt ? COLORS.coral : stove.ready ? COLORS.jade : COLORS.inkSoft,
    align: 'right',
  });

  const gridSize = Math.min(card.w * 0.56, card.h - 42);
  const cellSize = gridSize / STOVE_COLS;
  const gridX = card.x + 12;
  const gridY = card.y + 30;
  const cells: Rect[] = [];
  for (let row = 0; row < STOVE_ROWS; row += 1) {
    for (let col = 0; col < STOVE_COLS; col += 1) {
      const cell: Rect = {
        x: gridX + col * cellSize + 2,
        y: gridY + row * cellSize + 2,
        w: cellSize - 4,
        h: cellSize - 4,
      };
      cells.push(cell);
      const id = stove.slots[row * STOVE_COLS + col];
      inkRoundRect(ctx, cell.x, cell.y, cell.w, cell.h, RADIUS.sm, id ? 'rgba(255,253,248,0.98)' : 'rgba(58,46,42,0.06)', {
        stroke: id ? 'rgba(58,46,42,0.18)' : 'rgba(58,46,42,0.1)',
        width: 1.2,
        seed: 2011 + index * 20 + row * 3 + col,
      });
      if (id) {
        drawGoods(ctx, id, cell.x + cell.w / 2, cell.y + cell.h / 2, Math.min(34, cell.h * 0.64));
      }
    }
  }

  if (ghost && stove.slots.every((id) => !id) && !stove.cooking && !stove.ready && !stove.burnt) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    RECIPE_SHAPE_CELLS[ghost.shape].forEach((slot, inputIndex) => {
      const cell = cells[slot];
      const input = ghost.inputs[inputIndex];
      if (!cell || !input) return;
      drawGoods(
        ctx,
        input,
        cell.x + cell.w / 2,
        cell.y + cell.h / 2,
        Math.min(34, cell.h * 0.58),
      );
    });
    ctx.restore();
  }

  const output: Rect = {
    x: gridX + gridSize + 14,
    y: gridY,
    w: Math.max(70, card.x + card.w - (gridX + gridSize + 14) - 10),
    h: card.h - 42,
  };
  inkRoundRect(ctx, output.x, output.y, output.w, output.h, RADIUS.md, 'rgba(255,253,248,0.72)', {
    stroke: 'rgba(58,46,42,0.12)',
    width: 1.2,
    seed: 2031 + index,
  });

  if (stove.ready) {
    const quality = qualityForStove(stove);
    drawSteam(ctx, output, quality);
    drawGoods(ctx, stove.ready.output, output.x + output.w / 2, output.y + 30, 40);
    drawText(ctx, ingredientName(stove.ready.output), output.x + output.w / 2, output.y + 54, {
      size: 10,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
      maxWidth: output.w - 8,
    });
    drawQualityBadge(ctx, output.x + output.w - 6, output.y + 8, quality, 'right');
    const fresh = freshSeconds(stove.ready.inputCount);
    const total = fresh + STOVE_CHAR_SECONDS * (STOVE_MAX_CHAR + 1);
    const ratio = Math.min(1, stove.ready.age / total);
    const barY = output.y + output.h - 38;
    inkRoundRect(ctx, output.x + 6, barY, output.w - 12, 7, 4, 'rgba(58,46,42,0.12)', { width: 0 });
    inkRoundRect(
      ctx,
      output.x + 6,
      barY,
      Math.max(4, (output.w - 12) * (1 - ratio)),
      7,
      4,
      quality >= 0.5 ? COLORS.jade : COLORS.coral,
      { width: 0 },
    );
    drawText(ctx, '拖给客人 / 放成品柜', output.x + output.w / 2, output.y + output.h - 46, {
      size: 8.5,
      color: COLORS.inkSoft,
      align: 'center',
      maxWidth: output.w - 8,
    });
  } else if (stove.cooking) {
    drawText(ctx, '烹饪中', output.x + output.w / 2, output.y + 28, {
      size: 12,
      weight: '700',
      color: COLORS.honeyDeep,
      align: 'center',
    });
    drawText(ctx, stove.cooking.left.toFixed(1) + ' 秒', output.x + output.w / 2, output.y + 50, {
      size: 13,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, ingredientName(stove.cooking.output), output.x + output.w / 2, output.y + 72, {
      size: 10,
      weight: '700',
      color: COLORS.inkSoft,
      align: 'center',
      maxWidth: output.w - 8,
    });
  } else if (stove.burnt) {
    drawText(ctx, '焦炭', output.x + output.w / 2, output.y + 32, {
      size: 15,
      weight: '700',
      color: COLORS.coral,
      align: 'center',
    });
    drawText(ctx, '点一下清掉', output.x + output.w / 2, output.y + 54, {
      size: 9.5,
      color: COLORS.inkSoft,
      align: 'center',
    });
  } else {
    const recipe = matchStove(stove);
    if (recipe) {
      drawGoods(ctx, recipe.output, output.x + output.w / 2, output.y + 30, 38);
      drawText(ctx, ingredientName(recipe.output), output.x + output.w / 2, output.y + 54, {
        size: 10,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
        maxWidth: output.w - 8,
      });
    } else {
      drawText(ctx, '摆图案', output.x + output.w / 2, output.y + 28, {
        size: 11,
        weight: '700',
        color: COLORS.inkSoft,
        align: 'center',
      });
      drawText(ctx, '相邻 / 三连 / L / 方块 / T', output.x + output.w / 2, output.y + 48, {
        size: 8.5,
        color: COLORS.inkSoft,
        align: 'center',
        maxWidth: output.w - 8,
      });
    }
    if (stove.assembling) {
      drawText(ctx, canUpgradeStove(stove) ? '还可加一件' : '准备开火', output.x + output.w / 2, output.y + output.h - 38, {
        size: 9,
        color: COLORS.honeyDeep,
        align: 'center',
      });
    }
  }

  const fire: Rect = { x: output.x + 6, y: output.y + output.h - 26, w: output.w - 12, h: 22 };
  if (stove.assembling || stove.ready || stove.burnt) {
    if (stove.assembling && !stove.ready && !stove.burnt) {
      inkRoundRect(ctx, fire.x, fire.y, fire.w, fire.h, RADIUS.sm, COLORS.coral, {
        stroke: 'rgba(58,46,42,0.16)',
        width: 1,
        seed: 2051 + index,
      });
    }
    drawText(
      ctx,
      stove.burnt ? '清焦' : stove.ready ? '收取' : '开火',
      output.x + output.w / 2,
      output.y + output.h - 12,
      {
        size: 10,
        weight: '700',
        color: stove.ready ? COLORS.jade : stove.burnt ? COLORS.coral : COLORS.paper,
        align: 'center',
      },
    );
  }
  if (selected) {
    softShadow(ctx, card.x + card.w / 2, card.y + card.h + 6, 40, 8, 0.12, 2);
  }
  return { card, cells, output, fire };
}

function drawSteam(
  ctx: CanvasRenderingContext2D,
  output: Rect,
  quality: number,
): void {
  const clean = quality >= 0.75;
  const smoke = quality < 0.5;
  const puffs = clean ? 2 : smoke ? 4 : 3;
  const color = clean
    ? 'rgba(214,238,224,0.72)'
    : smoke
      ? 'rgba(82,70,64,0.48)'
      : 'rgba(190,176,160,0.55)';
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < puffs; i += 1) {
    const x = output.x + 22 + i * 15;
    const y = output.y + 16 + (i % 2) * 5;
    ctx.beginPath();
    ctx.arc(x, y, 7 + (i % 2) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
