import { drawPetal, drawStar, drawText, drawWangduCoin, Rect } from '../shared/design-system/draw';
import {
  drawPaperPanel,
  drawStickerButton,
  drawTapeNote,
} from '../shared/design-system/paper-ui';
import { inkLine, inkRoundRect } from '../shared/design-system/paint';
import { COLORS } from '../shared/design-system/tokens';
import { compactNumber } from '../shared/format';
import { TownLayout } from './town/town-layout';
import { TownPhase } from './town/town-palette';

export interface ChromeNav {
  id: string;
  label: string;
  rect: Rect;
}

export interface ChromeState {
  layout: TownLayout;
  coins: number;
  displayName: string;
  phase: TownPhase;
  pressedNav: string | null;
  navs: ChromeNav[];
  walletRect: Rect;
  settingsRect: Rect;
}

function greeting(phase: TownPhase): string {
  switch (phase) {
    case 'dawn':
      return '清晨 · 空气甜甜的';
    case 'day':
      return '白天 · 适合逛王都';
    case 'dusk':
      return '傍晚 · 灯笼亮起';
    default:
      return '夜晚 · 星星出来了';
  }
}

function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  inkRoundRect(ctx, x - 24 * scale, y - 4 * scale, 48 * scale, 7 * scale, 3 * scale, COLORS.gold, {
    stroke: 'rgba(58,46,42,0.28)',
    width: 1.5,
    seed: 701,
  });
  ctx.beginPath();
  ctx.moveTo(x - 24 * scale, y - 4 * scale);
  ctx.lineTo(x - 18 * scale, y - 20 * scale);
  ctx.lineTo(x - 8 * scale, y - 8 * scale);
  ctx.lineTo(x, y - 24 * scale);
  ctx.lineTo(x + 8 * scale, y - 8 * scale);
  ctx.lineTo(x + 18 * scale, y - 20 * scale);
  ctx.lineTo(x + 24 * scale, y - 4 * scale);
  ctx.closePath();
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,46,42,0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawStar(ctx, x, y - 10 * scale, 3.4 * scale, 1.5 * scale, COLORS.paper);
}

export function drawHeader(ctx: CanvasRenderingContext2D, state: ChromeState): void {
  const { layout } = state;
  const top = layout.headerTop;
  drawPaperPanel(
    ctx,
    { x: 24, y: top - 10, w: 372, h: 184 },
    { fill: 'rgba(255,253,248,0.88)', radius: 30, stitch: true, seed: 711 },
  );
  drawCrown(ctx, 60, top + 36, 1.0);
  drawText(ctx, '休闲王都', 46, top + 44, {
    size: 42,
    weight: '700',
    color: COLORS.ink,
  });
  const underlineY = top + 94;
  inkLine(
    ctx,
    [
      { x: 48, y: underlineY },
      { x: 214, y: underlineY - 2 },
      { x: 292, y: underlineY + 2 },
    ],
    { stroke: COLORS.gold, width: 4, seed: 717, wobble: 0.6 },
  );
  drawText(ctx, greeting(state.phase), 48, top + 110, {
    size: 17,
    color: COLORS.inkSoft,
  });
  drawText(ctx, state.displayName, 48, top + 139, {
    size: 14,
    color: 'rgba(107,91,84,0.9)',
    maxWidth: 320,
  });

  // 钱包
  const wallet = state.walletRect;
  drawPaperPanel(ctx, wallet, {
    fill: COLORS.paper,
    radius: wallet.h / 2,
    shadow: true,
    seed: 721,
  });
  drawWangduCoin(ctx, wallet.x + 30, wallet.y + wallet.h / 2, 17);
  drawText(ctx, '王都币', wallet.x + 54, wallet.y + 20, {
    size: 12,
    color: COLORS.inkSoft,
  });
  drawText(ctx, compactNumber(state.coins), wallet.x + 54, wallet.y + 41, {
    size: 23,
    weight: '700',
    color: COLORS.ink,
  });

  // 设置
  const settings = state.settingsRect;
  drawPaperPanel(ctx, settings, {
    fill: COLORS.paper,
    radius: settings.w / 2,
    seed: 727,
  });
  const gx = settings.x + settings.w / 2;
  const gy = settings.y + settings.h / 2;
  ctx.strokeStyle = COLORS.inkSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx, gy, 8, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(a) * 11, gy + Math.sin(a) * 11);
    ctx.lineTo(gx + Math.cos(a) * 16, gy + Math.sin(a) * 16);
    ctx.stroke();
  }
}

function navIcon(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  active: boolean,
): void {
  if (id === 'rank') {
    for (let i = 0; i < 3; i += 1) {
      const h = [15, 23, 32][i];
      inkRoundRect(ctx, cx - 22 + i * 16, cy + 14 - h, 12, h, 4, i === 2 ? COLORS.jade : COLORS.mint, {
        stroke: 'rgba(58,46,42,0.24)',
        width: 1.5,
        seed: 731 + i,
      });
    }
    drawStar(ctx, cx + 4, cy - 17, 7, 3, COLORS.gold);
    return;
  }
  if (id === 'daily') {
    inkRoundRect(ctx, cx - 17, cy - 19, 34, 36, 7, COLORS.paper, {
      stroke: 'rgba(58,46,42,0.24)',
      width: 1.8,
      seed: 737,
    });
    inkRoundRect(ctx, cx - 17, cy - 19, 34, 11, 5, COLORS.petal, { width: 0 });
    drawStar(ctx, cx, cy + 4, 7, 3, COLORS.gold);
    return;
  }
  if (id === 'collection') {
    inkRoundRect(ctx, cx - 21, cy - 15, 42, 30, 7, COLORS.lilac, {
      stroke: 'rgba(58,46,42,0.24)',
      width: 1.8,
      seed: 739,
    });
    ctx.strokeStyle = COLORS.inkSoft;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();
    drawPetal(ctx, cx - 10, cy - 2, 4.5, COLORS.petal);
    drawPetal(ctx, cx + 10, cy - 2, 4.5, COLORS.honey);
    return;
  }
  // shop：金币袋 + 小金币
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 16, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.honey;
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,46,42,0.26)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  inkRoundRect(ctx, cx - 12, cy - 18, 24, 12, 5, COLORS.honeyDeep, { width: 0 });
  drawWangduCoin(ctx, cx, cy + 5, 8);
  if (active) drawStar(ctx, cx + 13, cy - 14, 4, 1.7, COLORS.gold);
}

export function drawDock(ctx: CanvasRenderingContext2D, state: ChromeState): void {
  const { layout } = state;
  drawPaperPanel(ctx, layout.dockRect, {
    fill: 'rgba(255,253,248,0.95)',
    radius: 30,
    stitch: true,
    seed: 743,
  });
  for (const nav of state.navs) {
    const pressed = state.pressedNav === nav.id;
    const sink = pressed ? 3 : 0;
    const active = nav.id === 'shop';
    const rect = { ...nav.rect, y: nav.rect.y + sink };
    if (active) {
      inkRoundRect(
        ctx,
        rect.x + 4,
        rect.y + 2,
        rect.w - 8,
        rect.h - 4,
        22,
        'rgba(242,193,78,0.20)',
        { width: 0 },
      );
    }
    const cx = rect.x + rect.w / 2;
    navIcon(ctx, nav.id, cx, rect.y + 32, active);
    drawText(ctx, nav.label, cx, rect.y + 72, {
      size: 15,
      weight: active ? '700' : 'normal',
      color: active ? COLORS.honeyDeep : COLORS.inkSoft,
      align: 'center',
      maxWidth: rect.w - 8,
    });
  }
}

export function drawLobbyToast(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  text: string,
): void {
  const width = Math.min(layout.width - 120, Math.max(340, text.length * 22 + 80));
  drawTapeNote(
    ctx,
    {
      x: (layout.width - width) / 2,
      y: layout.dockRect.y - 96,
      w: width,
      h: 70,
    },
    [text],
    { fill: 'rgba(255,253,248,0.96)' },
  );
}

export function drawPanHint(ctx: CanvasRenderingContext2D, layout: TownLayout): void {
  const rect = {
    x: layout.width / 2 - 150,
    y: layout.dockRect.y - 186,
    w: 300,
    h: 44,
  };
  drawStickerButton(ctx, rect, '← 左右拖动，逛逛王都 →', {
    fill: 'rgba(255,253,248,0.9)',
    textColor: COLORS.inkSoft,
    fontSize: 14,
    radius: 22,
    seed: 751,
  });
}
