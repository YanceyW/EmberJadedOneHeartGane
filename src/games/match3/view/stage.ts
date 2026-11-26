import {
  drawPanel,
  drawStar,
  drawText,
  drawWangduCoin,
  fillRoundRect,
} from '../../../shared/design-system/draw';
import { drawRoyalPair, RoyalMood, RoyalOutfitId } from '../../../shared/design-system/royals';
import { COLORS, RADIUS } from '../../../shared/design-system/tokens';
import { CHEST_TIERS, liveRoundCoins } from '../systems/rewards';
import { tempoLabel, tempoMultiplier } from '../systems/tempo';

export interface Match3StageState {
  score: number;
  target: number;
  progress: number;
  tempo: number;
  tempoWindow: number;
  seconds: number;
  phase: 'playing' | 'won' | 'lost';
  reducedMotion: boolean;
  outfit: RoyalOutfitId;
  pulse: number;
  balance: number;
}

function moodOf(state: Match3StageState): RoyalMood {
  if (state.phase === 'won') return 'happy';
  if (state.phase === 'lost') return 'sad';
  if (state.seconds <= 10) return 'worried';
  return state.tempo >= 3 ? 'cheer' : 'idle';
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean): void {
  fillRoundRect(
    ctx,
    { x: x - 20, y: y - 14, w: 40, h: 28 },
    open ? COLORS.honey : 'rgba(58,46,42,0.10)',
    7,
  );
  fillRoundRect(
    ctx,
    { x: x - 22, y: y - 22, w: 44, h: 12 },
    open ? COLORS.gold : 'rgba(58,46,42,0.14)',
    5,
  );
  if (open) drawStar(ctx, x, y - 4, 7, 3, COLORS.paper);
}

function miniBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  base: number,
  w: number,
  h: number,
  wall: string,
  roof: string,
): void {
  fillRoundRect(ctx, { x, y: base - h, w, h }, wall, 10);
  ctx.beginPath();
  ctx.moveTo(x - 8, base - h + 8);
  ctx.quadraticCurveTo(x + w / 2, base - h - 18, x + w + 8, base - h + 8);
  ctx.lineTo(x + w + 2, base - h + 20);
  ctx.lineTo(x - 2, base - h + 20);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();

  fillRoundRect(
    ctx,
    { x: x + w * 0.18, y: base - h + 26, w: w * 0.28, h: h * 0.34 },
    COLORS.sky,
    5,
  );
  fillRoundRect(
    ctx,
    { x: x + w * 0.58, y: base - h + 26, w: w * 0.24, h: h * 0.34 },
    COLORS.sky,
    5,
  );
  fillRoundRect(
    ctx,
    { x: x + w * 0.4, y: base - h * 0.38, w: w * 0.22, h: h * 0.38 },
    COLORS.honeyDeep,
    5,
  );
}

function drawStageScene(
  ctx: CanvasRenderingContext2D,
  panel: { x: number; y: number; w: number; h: number },
  tempo: number,
  reducedMotion: boolean,
): void {
  const left = panel.x + 24;
  const right = panel.x + panel.w - 24;
  const base = panel.y + panel.h - 22;
  const top = panel.y + 224;

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = COLORS.grass;
  ctx.beginPath();
  ctx.ellipse(panel.x + panel.w / 2, base - 2, panel.w * 0.44, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  miniBuilding(ctx, right - 176, base, 48, 62, COLORS.mint, COLORS.berry);
  miniBuilding(ctx, right - 116, base, 62, 88, COLORS.honey, COLORS.cream);
  miniBuilding(ctx, right - 46, base, 42, 54, COLORS.sky, COLORS.waterDeep);

  // 小树
  for (const [x, h] of [
    [left + 188, 34],
    [right - 196, 28],
  ] as const) {
    ctx.strokeStyle = COLORS.pathDeep;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, base - h - 8, 20, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.leaf;
    ctx.fill();
  }

  // 小喷泉：水柱高度跟随节奏。
  const fountainX = left + 124;
  const fountainY = base - 4;
  const jet = 18 + Math.min(6, tempo) * 9;
  ctx.beginPath();
  ctx.ellipse(fountainX, fountainY, 34, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.pathDeep;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(fountainX, fountainY - 4, 27, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.sky;
  ctx.fill();
  ctx.strokeStyle = COLORS.water;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const dx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(fountainX + dx, fountainY - 8);
    ctx.quadraticCurveTo(
      fountainX + dx + (reducedMotion ? 0 : dx * 0.8),
      fountainY - 8 - jet * 0.6,
      fountainX + dx,
      fountainY - 8 - jet,
    );
    ctx.stroke();
  }

  // 三角彩旗
  ctx.strokeStyle = COLORS.pathDeep;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.quadraticCurveTo(panel.x + panel.w / 2, top + 16, right, top);
  ctx.stroke();
  const flagColors = [COLORS.petal, COLORS.gold, COLORS.mint, COLORS.berry];
  for (let i = 0; i < 8; i += 1) {
    const x = left + (i * (right - left)) / 7;
    ctx.beginPath();
    ctx.moveTo(x, top + Math.sin((i / 7) * Math.PI) * 8);
    ctx.lineTo(x + 8, top + 16 + Math.sin((i / 7) * Math.PI) * 8);
    ctx.lineTo(x - 4, top + 16 + Math.sin((i / 7) * Math.PI) * 8);
    ctx.closePath();
    ctx.fillStyle = flagColors[i % flagColors.length];
    ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let i = 0; i < 6; i += 1) {
    const x = left + 70 + ((i * 97) % (right - left - 100));
    const y = top + 56 + ((i * 53) % 90);
    drawStar(ctx, x, y, i % 2 === 0 ? 5 : 3.5, 2, i % 2 === 0 ? COLORS.gold : COLORS.petal);
  }
  ctx.restore();
}

export class Match3Stage {
  render(
    ctx: CanvasRenderingContext2D,
    renderer: { width: number; height: number; safeBottom: number },
    boardBottom: number,
    state: Match3StageState,
  ): void {
    const top = boardBottom + 108;
    const bottom = renderer.height - renderer.safeBottom - 18;
    const panel = {
      x: 36,
      y: top,
      w: renderer.width - 72,
      h: Math.max(220, bottom - top),
    };
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    drawText(ctx, '王都共鸣', panel.x + 22, panel.y + 30, {
      size: 20,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '2 秒内接续消除，节奏会升调', panel.x + 140, panel.y + 31, {
      size: 14,
      color: COLORS.inkSoft,
    });

    const live = liveRoundCoins(state.score, state.target);
    drawWangduCoin(ctx, panel.x + panel.w - 112, panel.y + 30, 12);
    drawText(ctx, `+${live}`, panel.x + panel.w - 94, panel.y + 30, {
      size: 18,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, '本局王都币', panel.x + panel.w - 22, panel.y + 52, {
      size: 12,
      color: COLORS.inkSoft,
      align: 'right',
    });

    this.drawTempo(ctx, panel, state);
    this.drawRail(ctx, panel, state);

    const compact = panel.h < 430;
    const stageY = panel.y + panel.h - 22;
    if (!compact) {
      drawStageScene(ctx, panel, state.tempo, state.reducedMotion);
      drawRoyalPair(
        ctx,
        panel.x + 66,
        stageY,
        0.62,
        state.outfit,
        moodOf(state),
        state.pulse,
        state.reducedMotion,
      );
    } else {
      drawRoyalPair(
        ctx,
        panel.x + 84,
        panel.y + panel.h - 12,
        0.58,
        state.outfit,
        moodOf(state),
        state.pulse,
        state.reducedMotion,
      );
    }
  }

  private drawTempo(
    ctx: CanvasRenderingContext2D,
    panel: { x: number; y: number; w: number; h: number },
    state: Match3StageState,
  ): void {
    const y = panel.y + 66;
    const width = panel.w - 44;
    const rect = { x: panel.x + 22, y, w: width, h: 66 };
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.04)', RADIUS.md);

    const multiplier = tempoMultiplier(state.tempo);
    drawText(
      ctx,
      state.tempo > 0 ? tempoLabel(state.tempo) : '等待接续',
      rect.x + 14,
      rect.y + 20,
      {
        size: 16,
        weight: '700',
        color: state.tempo >= 3 ? COLORS.honeyDeep : COLORS.jade,
      },
    );
    drawText(ctx, `x${multiplier.toFixed(2)}`, rect.x + rect.w - 14, rect.y + 20, {
      size: 20,
      weight: '700',
      color: state.tempo >= 3 ? COLORS.gold : COLORS.jade,
      align: 'right',
    });

    const dotY = rect.y + 44;
    const dotGap = (rect.w - 60) / 6;
    for (let i = 0; i < 6; i += 1) {
      const filled = i < state.tempo;
      ctx.beginPath();
      ctx.arc(rect.x + 28 + i * dotGap, dotY, filled ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = filled
        ? i >= 5
          ? COLORS.gold
          : i >= 3
            ? COLORS.jade
            : COLORS.mint
        : 'rgba(58,46,42,0.12)';
      ctx.fill();
    }

    const bar = { x: rect.x + 14, y: rect.y + 58, w: rect.w - 28, h: 4 };
    fillRoundRect(ctx, bar, 'rgba(58,46,42,0.08)', 2);
    fillRoundRect(
      ctx,
      { ...bar, w: bar.w * Math.max(0, Math.min(1, state.tempoWindow)) },
      state.tempo >= 3 ? COLORS.gold : COLORS.jade,
      2,
    );
  }

  private drawRail(
    ctx: CanvasRenderingContext2D,
    panel: { x: number; y: number; w: number; h: number },
    state: Match3StageState,
  ): void {
    const y = panel.y + 144;
    const width = panel.w - 44;
    const rect = { x: panel.x + 22, y, w: width, h: 72 };
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.04)', RADIUS.md);
    drawText(ctx, '王都币奖励', rect.x + 14, rect.y + 18, {
      size: 14,
      color: COLORS.inkSoft,
    });
    drawText(ctx, `余额 ${state.balance}`, rect.x + rect.w - 14, rect.y + 18, {
      size: 13,
      color: COLORS.inkSoft,
      align: 'right',
    });

    CHEST_TIERS.forEach((tier, index) => {
      const x = rect.x + 52 + (index * (rect.w - 104)) / 2;
      const open = state.progress >= tier.at;
      drawChest(ctx, x, rect.y + 38, open);
      drawText(ctx, `${Math.round(tier.at * 100)}% · +${tier.coins}`, x, rect.y + 58, {
        size: 11,
        color: open ? COLORS.honeyDeep : COLORS.inkSoft,
        align: 'center',
      });
    });
  }
}
