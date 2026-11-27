import { Renderer } from '../../../core/render/renderer';
import { drawStar, drawText, drawWangduCoin, Rect } from '../../../shared/design-system/draw';
import { inkRoundRect } from '../../../shared/design-system/paint';
import {
  drawPaperPanel,
  drawSegmented,
  drawStickerButton,
  drawTapeNote,
} from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import { ingredientName, restockCost } from '../../../shared/content/ingredients';
import { drawGoods } from '../../../shared/design-system/goods-art';
import { MERGE_COLS, MERGE_ROWS, SPAWN_COST, mergeItem } from '../data/items';
import { MERGE_RECIPES, canCraft } from '../data/recipes';
import {
  canFulfillMergeOrder,
  currentMergeOrder,
  MergeSave,
  needCount,
} from '../systems/merge';
import { drawMergeItem } from './item-art';

export type MergeTab = 'board' | 'pantry';

export type MergeHit =
  | { kind: 'back' }
  | { kind: 'tab'; tab: MergeTab }
  | { kind: 'cell'; index: number }
  | { kind: 'spawn' }
  | { kind: 'order' }
  | { kind: 'sell' }
  | { kind: 'recipe'; id: string }
  | { kind: 'restock'; id: string };

interface Layout {
  back: Rect;
  tabs: Record<MergeTab, Rect>;
  cells: Rect[];
  order: Rect;
  spawn: Rect;
  fulfill: Rect;
  sell: Rect;
  recipes: Array<{ id: string; rect: Rect }>;
  restocks: Array<{ id: string; rect: Rect }>;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

/** 原料间顶部只展示配方实际用到的作物，避免把整个仓库都摊开。 */
function recipeSources(): string[] {
  const ids: string[] = [];
  for (const recipe of MERGE_RECIPES) {
    for (const need of recipe.needs) {
      if (!ids.includes(need.id)) ids.push(need.id);
    }
  }
  return ids.filter((id) => !MERGE_RECIPES.some((recipe) => recipe.gives.id === id));
}

export class MergeView {
  private layout: Layout = {
    back: { ...EMPTY },
    tabs: { board: { ...EMPTY }, pantry: { ...EMPTY } },
    cells: [],
    order: { ...EMPTY },
    spawn: { ...EMPTY },
    fulfill: { ...EMPTY },
    sell: { ...EMPTY },
    recipes: [],
    restocks: [],
  };

  render(
    renderer: Renderer,
    save: MergeSave,
    store: Record<string, number>,
    tab: MergeTab,
    selected: number | null,
    coins: number,
    message: string,
  ): void {
    const ctx = renderer.ctx;
    const width = renderer.width;
    const top = Math.max(renderer.safeTop, renderer.capsuleBottom) + 16;
    const bottom = renderer.height - renderer.safeBottom - 18;

    const gradient = ctx.createLinearGradient(0, 0, 0, bottom);
    gradient.addColorStop(0, COLORS.cream);
    gradient.addColorStop(1, 'rgba(246,198,103,0.30)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, bottom);

    this.layout.back = { x: 40, y: top, w: 96, h: 56 };
    drawStickerButton(ctx, this.layout.back, '←', {
      fill: COLORS.paper,
      textColor: COLORS.ink,
      fontSize: 30,
      radius: RADIUS.md,
      seed: 1601,
    });

    const title: Rect = { x: 150, y: top - 4, w: 370, h: 66 };
    drawPaperPanel(ctx, title, { fill: COLORS.paper, radius: RADIUS.lg, stitch: true, seed: 1603 });
    drawText(ctx, '王都加工屋', title.x + title.w / 2, top + 24, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, '点两个相同等级，合成更高一级', title.x + title.w / 2, top + 48, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });

    const coinRect: Rect = { x: width - 206, y: top + 2, w: 166, h: 52 };
    inkRoundRect(ctx, coinRect.x, coinRect.y, coinRect.w, coinRect.h, 26, COLORS.paper, {
      stroke: 'rgba(58,46,42,0.24)',
      width: 2,
      seed: 1605,
    });
    drawWangduCoin(ctx, coinRect.x + 30, coinRect.y + 26, 14);
    drawText(ctx, compactNumber(coins), coinRect.x + 54, coinRect.y + 26, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    const tabRects = drawSegmented(
      ctx,
      { x: 48, y: top + 84, w: width - 96, h: 42 },
      ['合成台', '原料间'],
      tab === 'board' ? 0 : 1,
      COLORS.honeyDeep,
    );
    this.layout.tabs = { board: tabRects[0], pantry: tabRects[1] };

    if (tab === 'pantry') {
      this.drawPantryTab(ctx, width, top + 140, bottom, store, coins, message);
      return;
    }

    const orderH = 140;
    const btnH = 52;
    const boardTop = top + 140;
    const maxBoard = bottom - boardTop - orderH - btnH - 54;
    const cell = Math.min((width - 96) / MERGE_COLS, maxBoard / MERGE_ROWS);
    const gap = 8;
    const boardW = cell * MERGE_COLS;
    const boardX = (width - boardW) / 2;

    this.layout.cells = [];
    this.layout.recipes = [];
    for (let index = 0; index < MERGE_ROWS * MERGE_COLS; index += 1) {
      const row = Math.floor(index / MERGE_COLS);
      const col = index % MERGE_COLS;
      const rect: Rect = {
        x: boardX + col * cell + gap / 2,
        y: boardTop + row * cell + gap / 2,
        w: cell - gap,
        h: cell - gap,
      };
      this.layout.cells.push(rect);
      const tier = save.cells[index];
      const isSelected = selected === index;
      inkRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        RADIUS.md,
        tier >= 0 ? 'rgba(255,253,248,0.96)' : 'rgba(255,253,248,0.42)',
        {
          stroke: isSelected ? COLORS.honeyDeep : 'rgba(58,46,42,0.12)',
          width: isSelected ? 3 : 1.4,
          seed: 1611 + index,
        },
      );
      if (tier >= 0) {
        drawMergeItem(ctx, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.62, tier);
        drawText(ctx, mergeItem(tier).short, rect.x + rect.w / 2, rect.y + rect.h - 14, {
          size: 13,
          weight: '700',
          color: COLORS.inkSoft,
          align: 'center',
        });
      } else {
        drawText(ctx, '＋', rect.x + rect.w / 2, rect.y + rect.h / 2, {
          size: 28,
          color: 'rgba(58,46,42,0.18)',
          align: 'center',
        });
      }
    }

    const orderY = boardTop + cell * MERGE_ROWS + 16;
    this.layout.order = { x: 48, y: orderY, w: width - 96, h: orderH };
    this.drawOrder(ctx, this.layout.order, save);

    const btnW = (width - 96 - 16) / 3;
    const btnY = orderY + orderH + 14;
    this.layout.spawn = { x: 48, y: btnY, w: btnW, h: btnH };
    this.layout.fulfill = { x: 48 + btnW + 8, y: btnY, w: btnW, h: btnH };
    this.layout.sell = { x: 48 + (btnW + 8) * 2, y: btnY, w: btnW, h: btnH };
    drawStickerButton(ctx, this.layout.spawn, `进货 ${SPAWN_COST} 币`, {
      fill: COLORS.honey,
      textColor: COLORS.honeyDeep,
      fontSize: 16,
      radius: RADIUS.md,
      seed: 1621,
    });
    const ready = canFulfillMergeOrder(save);
    drawStickerButton(ctx, this.layout.fulfill, ready ? '交付订单' : '缺成品', {
      fill: ready ? COLORS.jade : 'rgba(58,46,42,0.08)',
      textColor: ready ? COLORS.paper : COLORS.inkSoft,
      fontSize: 16,
      radius: RADIUS.md,
      disabled: !ready,
      seed: 1623,
    });
    const finished = save.cells.filter((tier) => tier >= 2).length;
    const sellValue = save.cells.reduce(
      (sum, tier) => sum + (tier >= 2 ? mergeItem(tier).sellPrice : 0),
      0,
    );
    drawStickerButton(ctx, this.layout.sell, finished > 0 ? `卖出 +${sellValue}` : '无成品', {
      fill: finished > 0 ? COLORS.gold : 'rgba(58,46,42,0.08)',
      textColor: finished > 0 ? COLORS.honeyDeep : COLORS.inkSoft,
      fontSize: 16,
      radius: RADIUS.md,
      disabled: finished === 0,
      seed: 1625,
    });

    if (message) {
      drawTapeNote(
        ctx,
        { x: (width - 520) / 2, y: btnY + btnH + 18, w: 520, h: 44 },
        [message],
        { align: 'center' },
      );
    } else if (bottom - (btnY + btnH) > 100) {
      drawTapeNote(
        ctx,
        { x: (width - 560) / 2, y: btnY + btnH + 28, w: 560, h: 54 },
        ['加工链：莓果 → 果酱 → 蛋糕 → 宴席', '原料间能把小麦磨成面粉，餐厅拿去做菜'],
        { align: 'center' },
      );
    }

    const sceneTop = btnY + btnH + (message ? 82 : 100);
    if (bottom - sceneTop > 160) this.drawShelf(ctx, width, sceneTop, bottom);
  }

  /** 原料间：把仓库作物加工成半成品，链接农场与餐厅。 */
  /** 原料间：把仓库作物加工成半成品，链接农场与餐厅。 */
  private drawPantryTab(
    ctx: CanvasRenderingContext2D,
    width: number,
    top: number,
    bottom: number,
    store: Record<string, number>,
    coins: number,
    message: string,
  ): void {
    const panel: Rect = { x: 48, y: top, w: width - 96, h: 132 };
    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1671,
    });
    drawText(ctx, '王都仓库 · 原料', panel.x + 18, panel.y + 26, {
      size: 14,
      color: COLORS.inkSoft,
    });

    const sources = recipeSources();
    const chipW = (panel.w - 36 - 18) / 4;
    sources.forEach((id, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const x = panel.x + 18 + col * (chipW + 6);
      const y = panel.y + 44 + row * 38;
      const amount = store[id] ?? 0;
      inkRoundRect(ctx, x, y, chipW, 32, RADIUS.sm, amount > 0 ? 'rgba(168,230,207,0.36)' : 'rgba(58,46,42,0.05)', {
        width: 0,
      });
      drawText(ctx, ingredientName(id), x + 8, y + 16, {
        size: 13,
        color: COLORS.inkSoft,
      });
      drawText(ctx, `${amount}`, x + chipW - 8, y + 16, {
        size: 14,
        weight: '700',
        color: amount > 0 ? COLORS.jade : COLORS.inkSoft,
        align: 'right',
      });
    });

    this.layout.recipes = [];
    this.layout.restocks = [];
    this.layout.cells = [];
    this.layout.order = { ...EMPTY };
    this.layout.spawn = { ...EMPTY };
    this.layout.fulfill = { ...EMPTY };
    this.layout.sell = { ...EMPTY };

    const columns = 2;
    const gap = 12;
    const cardW = (width - 96 - gap) / 2;
    const cardH = 152;
    MERGE_RECIPES.forEach((recipe, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const rect: Rect = {
        x: 48 + col * (cardW + gap),
        y: top + 144 + row * (cardH + gap),
        w: cardW,
        h: cardH,
      };
      this.layout.recipes.push({ id: recipe.id, rect });
      drawPaperPanel(ctx, rect, {
        fill: COLORS.paper,
        radius: RADIUS.lg,
        stitch: true,
        seed: 1681 + index,
      });
      drawText(ctx, recipe.name, rect.x + 16, rect.y + 28, {
        size: 18,
        weight: '700',
        color: COLORS.ink,
      });
      drawGoods(ctx, recipe.gives.id, rect.x + rect.w - 42, rect.y + 56, 46);
      drawText(ctx, `×${recipe.gives.amount}`, rect.x + rect.w - 16, rect.y + 86, {
        size: 12,
        weight: '700',
        color: COLORS.jade,
        align: 'right',
      });
      recipe.needs.forEach((need, line) => {
        const have = store[need.id] ?? 0;
        drawText(ctx, `${ingredientName(need.id)} ${have}/${need.amount}`, rect.x + 16, rect.y + 54 + line * 20, {
          size: 13,
          weight: have >= need.amount ? '700' : 'normal',
          color: have >= need.amount ? COLORS.jade : COLORS.inkSoft,
        });
      });
      drawText(
        ctx,
        recipe.coinCost > 0 ? `${recipe.hint} · ${recipe.coinCost} 币` : recipe.hint,
        rect.x + 16,
        rect.y + 96,
        { size: 12, color: 'rgba(107,91,84,0.8)', maxWidth: rect.w - 32 },
      );

      const usable = canCraft(store, recipe, coins);
      const restock = restockCost(store, recipe.needs);
      const canRestock = !usable && restock > 0 && coins >= restock;
      const button: Rect = { x: rect.x + 14, y: rect.y + cardH - 46, w: rect.w - 28, h: 36 };
      const label = usable
        ? '制作'
        : restock > 0
          ? `补齐 · ${restock} 币`
          : '缺材料';
      drawStickerButton(ctx, button, label, {
        fill: usable ? COLORS.jade : canRestock ? COLORS.gold : 'rgba(58,46,42,0.08)',
        textColor: usable ? COLORS.paper : canRestock ? COLORS.honeyDeep : COLORS.inkSoft,
        fontSize: 15,
        radius: RADIUS.md,
        disabled: !usable && !canRestock,
        seed: 1691 + index,
      });
      if (canRestock) this.layout.restocks.push({ id: recipe.id, rect: button });
    });

    const noteTop = top + 144 + Math.ceil(MERGE_RECIPES.length / columns) * (cardH + gap);
    if (bottom - noteTop > 70) {
      drawTapeNote(
        ctx,
        { x: (width - 600) / 2, y: noteTop, w: 600, h: 56 },
        ['缺料可以「补齐」，但比自己种、自己做贵得多（卖价 ×3）', '所有产出都进王都仓库，餐厅直接取用'],
        { align: 'center' },
      );
    }
    if (bottom - (noteTop + 76) > 220) {
      this.drawChainBand(ctx, width, noteTop + 76, bottom);
    }
    if (message) {
      drawTapeNote(
        ctx,
        { x: (width - 520) / 2, y: Math.min(bottom - 52, noteTop + 62), w: 520, h: 44 },
        [message],
        { align: 'center' },
      );
    }
  }


  /** 高屏底部补一条「小麦 → 面粉 → 面包」的流程图，顺带说明餐厅在哪。 */
  private drawChainBand(
    ctx: CanvasRenderingContext2D,
    width: number,
    top: number,
    bottom: number,
  ): void {
    const height = bottom - top;
    const panelH = Math.min(320, height);
    const panel: Rect = { x: 48, y: top + (height - panelH) / 2, w: width - 96, h: panelH };
    drawPaperPanel(ctx, panel, {
      fill: 'rgba(255,253,248,0.72)',
      radius: RADIUS.lg,
      stitch: true,
      seed: 1699,
    });
    const cy = panel.y + panelH * 0.52;
    drawText(ctx, '这条链会一直走到餐厅', width / 2, panel.y + 28, {
      size: 15,
      weight: '700',
      color: COLORS.inkSoft,
      align: 'center',
    });

    const steps = ['小麦', '面粉', '面包', '上菜'];
    const stepGap = Math.min(190, (width - 200) / (steps.length - 1));
    const startX = width / 2 - (stepGap * (steps.length - 1)) / 2;
    for (let index = 0; index < steps.length; index += 1) {
      const x = startX + index * stepGap;
      inkRoundRect(ctx, x - 48, cy - 48, 96, 96, 22, COLORS.paper, {
        stroke: 'rgba(58,46,42,0.14)',
        width: 1.6,
        seed: 1701 + index,
      });
      if (index === 0) {
        ctx.strokeStyle = COLORS.honeyDeep;
        ctx.lineWidth = 4;
        for (let stalk = -1; stalk <= 1; stalk += 1) {
          ctx.beginPath();
          ctx.moveTo(x + stalk * 13, cy + 22);
          ctx.quadraticCurveTo(x + stalk * 20, cy - 2, x + stalk * 16, cy - 20);
          ctx.stroke();
          for (let grain = 0; grain < 3; grain += 1) {
            ctx.beginPath();
            ctx.ellipse(
              x + stalk * 18,
              cy - 5 - grain * 9,
              4.5,
              2.8,
              (stalk + 1) * 0.5,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = COLORS.honey;
            ctx.fill();
          }
        }
      } else if (index === 1) {
        inkRoundRect(ctx, x - 24, cy - 24, 48, 52, 11, '#F3E2C4', {
          stroke: COLORS.ink,
          width: 2.4,
          seed: 1711,
        });
        inkRoundRect(ctx, x - 19, cy - 30, 38, 11, 5, COLORS.pathDeep, { width: 0 });
        drawText(ctx, '粉', x, cy + 8, {
          size: 17,
          weight: '700',
          color: COLORS.honeyDeep,
          align: 'center',
        });
      } else if (index === 2) {
        inkRoundRect(ctx, x - 32, cy - 15, 64, 38, 15, '#E8B871', {
          stroke: COLORS.ink,
          width: 2.6,
          seed: 1721,
        });
        ctx.strokeStyle = COLORS.inkSoft;
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x + i * 15 - 5, cy - 8);
          ctx.lineTo(x + i * 15 + 5, cy + 10);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.ellipse(x, cy + 6, 31, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.paper;
        ctx.fill();
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        inkRoundRect(ctx, x - 17, cy - 19, 34, 21, 9, COLORS.peach, {
          stroke: COLORS.ink,
          width: 2.2,
          seed: 1731,
        });
        drawStar(ctx, x, cy - 8, 6, 2.6, COLORS.gold);
      }
      drawText(ctx, steps[index], x, cy + 66, {
        size: 14,
        weight: '700',
        color: COLORS.inkSoft,
        align: 'center',
      });
      if (index < steps.length - 1) {
        drawText(ctx, '→', x + stepGap / 2, cy, {
          size: 22,
          color: 'rgba(58,46,42,0.28)',
          align: 'center',
        });
      }
    }
    drawText(ctx, '小麦在农场，面粉和面包在原料间，上菜在餐厅', width / 2, panel.y + panelH - 22, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });
  }

  /** 高屏底部留白时补一排成品货架。 */
  private drawShelf(
    ctx: CanvasRenderingContext2D,
    width: number,
    top: number,
    bottom: number,
  ): void {
    const height = Math.min(300, bottom - top);
    const shelfY = top + height * 0.52;
    drawText(ctx, '今日出炉', width / 2, shelfY - 104, {
      size: 14,
      color: COLORS.inkSoft,
      align: 'center',
    });
    for (const [index, tier] of [1, 2, 3].entries()) {
      const x = width / 2 + (index - 1) * 190;
      drawMergeItem(ctx, x, shelfY - 28, 86, tier);
    }
    inkRoundRect(ctx, 90, shelfY, width - 180, 18, 7, COLORS.pathDeep, {
      stroke: 'rgba(58,46,42,0.2)',
      width: 1.6,
      seed: 1661,
    });
    inkRoundRect(ctx, 90, shelfY + 18, width - 180, 8, 4, 'rgba(58,46,42,0.12)', {
      width: 0,
    });
    drawText(ctx, '卖成品也能赚王都币', width / 2, shelfY + 58, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'center',
    });
  }

  hitTest(x: number, y: number): MergeHit | null {
    if (inside(x, y, this.layout.back)) return { kind: 'back' };
    if (inside(x, y, this.layout.tabs.board)) return { kind: 'tab', tab: 'board' };
    if (inside(x, y, this.layout.tabs.pantry)) return { kind: 'tab', tab: 'pantry' };
    for (const recipe of this.layout.recipes) {
      if (inside(x, y, recipe.rect)) return { kind: 'recipe', id: recipe.id };
    }
    for (const restock of this.layout.restocks) {
      if (inside(x, y, restock.rect)) return { kind: 'restock', id: restock.id };
    }
    for (let index = 0; index < this.layout.cells.length; index += 1) {
      if (inside(x, y, this.layout.cells[index])) return { kind: 'cell', index };
    }
    if (inside(x, y, this.layout.order)) return { kind: 'order' };
    if (inside(x, y, this.layout.spawn)) return { kind: 'spawn' };
    if (inside(x, y, this.layout.fulfill)) return { kind: 'order' };
    if (inside(x, y, this.layout.sell)) return { kind: 'sell' };
    return null;
  }

  private drawOrder(ctx: CanvasRenderingContext2D, rect: Rect, save: MergeSave): void {
    drawPaperPanel(ctx, rect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 1641,
    });
    const order = currentMergeOrder(save);
    drawText(ctx, '今日加工单', rect.x + 18, rect.y + 22, {
      size: 13,
      color: COLORS.inkSoft,
    });
    drawText(ctx, order.title, rect.x + 18, rect.y + 48, {
      size: 18,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 190,
    });

    let x = rect.x + 18;
    for (const need of order.needs) {
      const item = mergeItem(need.tier);
      const have = needCount(save, need.tier);
      const ready = have >= need.amount;
      drawMergeItem(ctx, x + 20, rect.y + 78, 34, need.tier);
      drawText(ctx, `${item.short} ${have}/${need.amount}`, x + 42, rect.y + 78, {
        size: 14,
        color: ready ? COLORS.jade : COLORS.inkSoft,
        weight: ready ? '700' : 'normal',
      });
      x += 132;
    }

    drawWangduCoin(ctx, rect.x + 20, rect.y + rect.h - 20, 11);
    drawText(ctx, `+${order.coins}`, rect.x + 38, rect.y + rect.h - 20, {
      size: 17,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, `繁荣 +${order.prosperity}`, rect.x + 94, rect.y + rect.h - 20, {
      size: 13,
      color: COLORS.inkSoft,
    });
    drawStar(ctx, rect.x + rect.w - 34, rect.y + 30, 10, 4.2, COLORS.gold);
  }
}

function inside(x: number, y: number, rect: Rect): boolean {
  return rect.w > 0 && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
