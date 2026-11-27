import { Easing } from '../../../core/anim/easing';
import { Renderer } from '../../../core/render/renderer';
import {
  drawStar,
  drawText,
  drawWangduCoin,
  fillRoundRect,
  Rect,
} from '../../../shared/design-system/draw';
import { inkRoundRect } from '../../../shared/design-system/paint';
import { drawPaperPanel, drawStickerButton } from '../../../shared/design-system/paper-ui';
import { DURATION } from '../../../shared/design-system/motion';
import { RoyalOutfitId } from '../../../shared/design-system/royals';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber, formatDuration } from '../../../shared/format';
import { tempoLabel, timerUrgency } from '../systems/tempo';
import { Match3Stage } from './stage';

export const HUD_TOP_GAP = 16;
export const BOARD_TOP_AFTER_HUD = 208;

export function match3HudTop(renderer: Renderer): number {
  return Math.max(renderer.safeTop, renderer.capsuleBottom) + HUD_TOP_GAP;
}

export type HudHit = 'back' | 'modes' | 'restart' | 'home' | 'next' | 'settle';

export interface HudState {
  title: string;
  subtitle: string;
  mode: 'campaign' | 'endless';
  /** 无时间限制的成功交换次数。 */
  swaps: number;
  /** 无时间限制已用秒数。 */
  elapsedSeconds: number;
  score: number;
  target: number;
  /** 相对目标分的进度，允许 >1；给「王都共鸣」宝箱用。 */
  progress: number;
  /** 相对三星门槛的进度，0–1；给顶部进度条用。 */
  barProgress: number;
  /** 当前星级 0–3；无时间限制恒为 0（没有星级，只看分数）。 */
  stars: number;
  /** 已达成目标，可以继续冲星或提前结算。 */
  targetReached: boolean;
  /** 下一颗星的门槛分；三星已满为 null。 */
  nextStarAt: number | null;
  phase: 'playing' | 'won' | 'lost';
  hasNext: boolean;
  pulse: number;
  message: string;
  boardTop: number;
  boardBottom: number;
  clock: string;
  seconds: number;
  totalSeconds: number;
  tempo: number;
  tempoWindow: number;
  reducedMotion: boolean;
  liveCoins?: number;
  coinsEarned: number;
  coinBalance: number;
  /** 本模式的最高分，结果面板用来对比纪录。 */
  bestScore?: number;
  /** 无时间限制单局最长用时（秒）。 */
  bestSeconds?: number;
  /** 无时间限制本局刷新了最高分。 */
  isRecord?: boolean;
  outfit: RoyalOutfitId;
}

/**
 * 三消的 HUD 与结果面板。只画不判定，点击命中也只回报语义 id。
 */
export class Match3Hud {
  readonly backRect: Rect;
  readonly modeRect: Rect;
  private restartRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private homeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private nextRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private settleRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private pressed: HudHit | null = null;
  private resultSince = 0;
  private lastPhase: HudState['phase'] = 'playing';
  private lastScore = 0;
  private scorePulseAt = 0;
  private readonly hudTop: number;
  private readonly stage = new Match3Stage();

  constructor(private readonly renderer: Renderer) {
    this.hudTop = match3HudTop(renderer);
    this.backRect = { x: 40, y: this.hudTop, w: 96, h: 56 };
    this.modeRect = {
      x: renderer.width - 40 - 120,
      y: this.hudTop,
      w: 120,
      h: 56,
    };
  }

  private hit(x: number, y: number, rect: Rect): boolean {
    return rect.w > 0 && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  hitTest(x: number, y: number): HudHit | null {
    if (this.hit(x, y, this.backRect)) return 'back';
    if (this.hit(x, y, this.modeRect)) return 'modes';
    if (this.hit(x, y, this.settleRect)) return 'settle';
    if (!this.hit(x, y, this.bounds)) return null;
    if (this.hit(x, y, this.nextRect)) return 'next';
    if (this.hit(x, y, this.restartRect)) return 'restart';
    if (this.hit(x, y, this.homeRect)) return 'home';
    return null;
  }

  setPressed(hit: HudHit): void {
    this.pressed = hit;
  }

  clearPressed(): void {
    this.pressed = null;
  }

  render(ctx: CanvasRenderingContext2D, state: HudState): void {
    const renderer = this.renderer;
    const width = renderer.width;
    const now = Date.now();

    if (state.phase !== this.lastPhase) {
      this.resultSince = state.phase === 'playing' ? 0 : now;
      this.lastPhase = state.phase;
    }
    if (state.score !== this.lastScore) {
      this.lastScore = state.score;
      this.scorePulseAt = now;
    }

    // 回到对局时清空结算面板的命中区域，避免误触到旧按钮。
    if (state.phase === 'playing') {
      this.bounds = { x: 0, y: 0, w: 0, h: 0 };
      this.nextRect = { x: 0, y: 0, w: 0, h: 0 };
      this.restartRect = { x: 0, y: 0, w: 0, h: 0 };
      this.homeRect = { x: 0, y: 0, w: 0, h: 0 };
    }
    if (state.mode !== 'campaign' || state.phase !== 'playing' || !state.targetReached) {
      this.settleRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    this.drawBackButton(ctx);
    this.drawModeButton(ctx);

    drawText(ctx, state.title, width / 2, this.hudTop + 50, {
      size: FONT.display,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, state.subtitle, width / 2, this.hudTop + 86, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'center',
      maxWidth: width - 220,
    });

    this.drawStats(ctx, state);
    if (state.mode === 'campaign') this.drawProgress(ctx, state);
    if (state.mode === 'campaign' && state.phase === 'playing' && state.targetReached) {
      this.drawSettle(ctx);
    }
    this.stage.render(ctx, this.renderer, state.boardBottom, {
      score: state.score,
      target: state.target,
      progress: state.progress,
      tempo: state.tempo,
      tempoWindow: state.tempoWindow,
      seconds: state.seconds,
      phase: state.phase,
      reducedMotion: state.reducedMotion,
      outfit: state.outfit,
      pulse: state.pulse,
      balance: state.coinBalance,
      endless: state.mode === 'endless',
      liveCoins: state.liveCoins,
    });
    this.drawMessage(ctx, state);

    if (state.phase !== 'playing') this.drawResult(ctx, state);
  }

  private drawBackButton(ctx: CanvasRenderingContext2D): void {
    drawStickerButton(ctx, this.backRect, '←', {
      fill: COLORS.paper,
      textColor: COLORS.ink,
      fontSize: 30,
      radius: RADIUS.md,
      pressed: this.pressed === 'back',
      seed: 901,
    });
  }

  private drawModeButton(ctx: CanvasRenderingContext2D): void {
    drawStickerButton(ctx, this.modeRect, '模式', {
      fill: COLORS.paper,
      textColor: COLORS.inkSoft,
      fontSize: 18,
      radius: RADIUS.md,
      pressed: this.pressed === 'modes',
      seed: 903,
    });
  }

  private drawStats(ctx: CanvasRenderingContext2D, state: HudState): void {
    const hudY = this.hudTop + 112;
    const scoreRect: Rect = { x: 40, y: hudY, w: 360, h: 88 };
    const timeRect: Rect = { x: 420, y: hudY, w: 290, h: 88 };

    drawPaperPanel(ctx, scoreRect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 905,
    });
    drawPaperPanel(ctx, timeRect, {
      fill: COLORS.paper,
      radius: RADIUS.lg,
      stitch: true,
      seed: 907,
    });

    drawText(ctx, '分数', scoreRect.x + 22, scoreRect.y + 22, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });
    const scoreScale =
      state.reducedMotion || this.scorePulseAt === 0
        ? 1
        : 1 + 0.08 * Math.max(0, 1 - (Date.now() - this.scorePulseAt) / (DURATION.fast * 1000));
    ctx.save();
    ctx.translate(scoreRect.x + 22, scoreRect.y + 58);
    ctx.scale(scoreScale, scoreScale);
    drawText(ctx, compactNumber(state.score), 0, 0, {
      size: FONT.subtitle,
      weight: '700',
      color: COLORS.jade,
    });
    ctx.restore();
    this.drawTempoChip(ctx, state, {
      x: scoreRect.x + scoreRect.w - 174,
      y: scoreRect.y + 42,
      w: 154,
      h: 38,
    });

    const endless = state.mode === 'endless';
    const urgency = timerUrgency(state.seconds);
    const timeColor = endless
      ? COLORS.ink
      : urgency === 'normal'
        ? COLORS.ink
        : COLORS.coral;
    drawText(ctx, endless ? '已用时间' : '剩余时间', timeRect.x + 22, timeRect.y + 22, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });

    const pulse = !endless && urgency === 'critical' && !state.reducedMotion
      ? 1 + Math.sin(state.pulse * 7) * 0.03
      : 1;
    ctx.save();
    ctx.translate(timeRect.x + 22, timeRect.y + 58);
    ctx.scale(pulse, pulse);
    drawText(ctx, state.clock, 0, 0, {
      size: FONT.title,
      weight: '700',
      color: timeColor,
    });
    ctx.restore();

    if (endless) {
      drawText(ctx, `交换 ${state.swaps} 次 · 随时退出结算`, timeRect.x + 22, timeRect.y + 74, {
        size: 12,
        color: 'rgba(107,91,84,0.75)',
        maxWidth: timeRect.w - 40,
      });
    } else {
      const bar: Rect = { x: timeRect.x + 18, y: timeRect.y + 74, w: timeRect.w - 36, h: 6 };
      const ratio = state.seconds / Math.max(1, state.totalSeconds);
      fillRoundRect(ctx, bar, 'rgba(58,46,42,0.10)', 3);
      fillRoundRect(
        ctx,
        { ...bar, w: bar.w * Math.max(0, Math.min(1, ratio)) },
        timeColor,
        3,
      );
    }

    if (!endless && urgency === 'critical' && Math.sin(state.pulse * 7) > 0.2) {
      ctx.beginPath();
      ctx.arc(timeRect.x + timeRect.w - 24, timeRect.y + 26, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.coral;
      ctx.fill();
    }
  }

  private drawTempoChip(ctx: CanvasRenderingContext2D, state: HudState, rect: Rect): void {
    if (state.tempo <= 0) {
      drawText(ctx, '2 秒内接续', rect.x + rect.w, rect.y + 20, {
        size: FONT.caption,
        color: 'rgba(107,91,84,0.65)',
        align: 'right',
      });
      return;
    }

    const color = state.tempo >= 6 ? COLORS.gold : state.tempo >= 3 ? COLORS.jade : COLORS.mint;
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.06)', RADIUS.md);
    fillRoundRect(
      ctx,
      { ...rect, w: rect.w * Math.max(0, Math.min(1, state.tempoWindow)) },
      'rgba(47,143,123,0.10)',
      RADIUS.md,
    );
    drawText(ctx, tempoLabel(state.tempo), rect.x + rect.w - 10, rect.y + 14, {
      size: FONT.caption,
      color,
      align: 'right',
      weight: '700',
    });
    const bar: Rect = { x: rect.x + 10, y: rect.y + rect.h - 12, w: rect.w - 20, h: 5 };
    fillRoundRect(ctx, bar, 'rgba(58,46,42,0.10)', 3);
    fillRoundRect(
      ctx,
      { ...bar, w: bar.w * Math.max(0, Math.min(1, state.tempoWindow)) },
      color,
      3,
    );
  }

  private drawProgress(ctx: CanvasRenderingContext2D, state: HudState): void {
    const y = state.boardBottom + 14;
    const bar: Rect = { x: 45, y, w: this.renderer.width - 90, h: 14 };
    const goals = [state.target, Math.round(state.target * 1.25), Math.round(state.target * 1.5)];
    const max = goals[goals.length - 1] || state.target;
    const ratio = Math.max(0, Math.min(1, state.barProgress));
    const reached = state.score >= state.target;

    inkRoundRect(ctx, bar.x, bar.y, bar.w, bar.h, 7, 'rgba(58,46,42,0.10)', {
      stroke: 'rgba(58,46,42,0.16)',
      width: 1.5,
      seed: 941,
      wobble: 0.2,
    });
    inkRoundRect(ctx, bar.x, bar.y, bar.w * ratio, bar.h, 7, reached ? COLORS.gold : COLORS.jade, {
      width: 0,
    });

    // 星门槛刻度：让玩家一眼看到「再打多少分能升星」。
    goals.forEach((goal, index) => {
      const x = bar.x + bar.w * Math.min(1, goal / max);
      const filled = state.score >= goal;
      drawStar(
        ctx,
        x,
        bar.y - 2,
        8,
        3.4,
        filled ? COLORS.gold : 'rgba(58,46,42,0.16)',
      );
      if (index === goals.length - 1) return;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(255,253,248,0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, bar.y + 2);
      ctx.lineTo(x, bar.y + bar.h - 2);
      ctx.stroke();
      ctx.restore();
    });

    drawText(ctx, `目标 ${compactNumber(state.target)} · ${state.stars}/3 星`, 45, y + 38, {
      size: 18,
      color: reached ? COLORS.honeyDeep : COLORS.inkSoft,
      weight: reached ? '700' : 'normal',
    });

    // 进度条按三星门槛走，右侧也用「还差多少分」而不是百分比，避免条和数字对不上。
    const gap = state.nextStarAt === null ? 0 : Math.max(0, state.nextStarAt - state.score);
    const right =
      state.nextStarAt === null
        ? '三星达成！'
        : state.targetReached
          ? `距 ${state.stars + 1} 星 ${compactNumber(gap)} 分`
          : `距过关 ${compactNumber(gap)} 分`;
    drawText(ctx, right, this.renderer.width - 45, y + 38, {
      size: 18,
      color: state.targetReached ? COLORS.honeyDeep : COLORS.inkSoft,
      align: 'right',
      maxWidth: 360,
    });
  }

  private drawSettle(ctx: CanvasRenderingContext2D): void {
    const rect: Rect = {
      x: this.modeRect.x,
      y: this.modeRect.y + this.modeRect.h + 8,
      w: this.modeRect.w,
      h: 44,
    };
    this.settleRect = rect;
    drawStickerButton(ctx, rect, '提前结算', {
      fill: COLORS.gold,
      textColor: COLORS.honeyDeep,
      fontSize: 16,
      radius: RADIUS.md,
      pressed: this.pressed === 'settle',
      seed: 943,
    });
  }

  private drawMessage(ctx: CanvasRenderingContext2D, state: HudState): void {
    if (!state.message) return;
    const width = Math.min(
      this.renderer.width - 120,
      Math.max(340, state.message.length * 24 + 56),
    );
    const rect: Rect = {
      x: (this.renderer.width - width) / 2,
      y: state.boardBottom + 58,
      w: width,
      h: 44,
    };
    inkRoundRect(
      ctx,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      RADIUS.lg,
      'rgba(58,46,42,0.88)',
      { stroke: 'rgba(255,253,248,0.22)', width: 1.5, seed: 947 },
    );
    drawText(ctx, state.message, this.renderer.width / 2, rect.y + 22, {
      size: 18,
      color: COLORS.paper,
      align: 'center',
      maxWidth: rect.w - 36,
    });
  }

  private drawResult(ctx: CanvasRenderingContext2D, state: HudState): void {
    const width = this.renderer.width;
    const height = this.renderer.height;
    const progress =
      state.reducedMotion || this.resultSince === 0
        ? 1
        : Math.min(1, (Date.now() - this.resultSince) / (DURATION.base * 1000));
    const eased = 1 - (1 - progress) ** 3;
    const shake =
      state.phase === 'lost' && !state.reducedMotion && progress < 1
        ? Math.sin(progress * Math.PI * 6) * 5 * (1 - progress)
        : 0;

    const panel: Rect = {
      x: 75 + shake,
      y: height / 2 - 270 + (1 - eased) * 28,
      w: width - 150,
      h: 540,
    };
    this.bounds = panel;

    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 1.3);
    ctx.fillStyle = 'rgba(58,46,42,0.42)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 915,
    });

    const won = state.phase === 'won';
    const endless = state.mode === 'endless';
    const title = endless
      ? '这局结束啦'
      : won
        ? state.stars >= 3
          ? '三星达成！'
          : `${state.stars} 星过关！`
        : '时间到啦';

    drawText(ctx, title, width / 2, panel.y + 84, {
      size: FONT.display,
      weight: '700',
      color: won ? COLORS.jade : COLORS.coral,
      align: 'center',
    });
    drawText(
      ctx,
      endless
        ? `本局得分 ${compactNumber(state.score)}`
        : `本局得分 ${state.score} / ${state.target}`,
      width / 2,
      panel.y + 142,
      {
        size: FONT.body,
        color: COLORS.inkSoft,
        align: 'center',
      },
    );
    if (endless) {
      drawText(
        ctx,
        `用时 ${formatDuration(state.elapsedSeconds)} · 交换 ${state.swaps} 次`,
        width / 2,
        panel.y + 172,
        {
          size: 16,
          color: 'rgba(107,91,84,0.85)',
          align: 'center',
        },
      );
    }

    const coinY = panel.y + (endless ? 210 : 180);
    drawWangduCoin(ctx, width / 2 - 64, coinY, 13);
    drawText(ctx, `+${state.coinsEarned} 王都币`, width / 2 - 44, coinY, {
      size: 20,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, `余额 ${state.coinBalance}`, width / 2 + 118, coinY, {
      size: 16,
      color: COLORS.inkSoft,
      maxWidth: 120,
    });

    if (won && state.mode === 'campaign') {
      const since = this.resultSince === 0 ? 9999 : Date.now() - this.resultSince;
      for (let i = 0; i < 3; i += 1) {
        const local = state.reducedMotion
          ? 1
          : Math.min(1, Math.max(0, (since - 120 - i * 90) / 180));
        const scale = local === 1 ? 1 : Math.max(0, Easing.outBack(local));
        drawStar(
          ctx,
          width / 2 + (i - 1) * 92,
          panel.y + 220,
          30 * scale,
          14 * scale,
          i < state.stars ? COLORS.gold : 'rgba(58,46,42,0.12)',
        );
      }
    } else if (endless) {
      const pill: Rect = { x: width / 2 - 168, y: panel.y + 240, w: 336, h: 56 };
      inkRoundRect(
        ctx,
        pill.x,
        pill.y,
        pill.w,
        pill.h,
        18,
        state.isRecord ? 'rgba(242,193,78,0.28)' : 'rgba(168,230,207,0.3)',
        {
          stroke: state.isRecord ? 'rgba(185,134,47,0.5)' : 'rgba(58,46,42,0.14)',
          width: 1.8,
          seed: 927,
        },
      );
      if (state.isRecord) drawStar(ctx, pill.x + 46, pill.y + 28, 15, 7, COLORS.gold);
      drawText(
        ctx,
        state.isRecord
          ? '新纪录！'
          : `最高分 ${compactNumber(state.bestScore ?? state.score)}`,
        width / 2,
        pill.y + 28,
        {
          size: 19,
          weight: '700',
          color: state.isRecord ? COLORS.honeyDeep : COLORS.jade,
          align: 'center',
        },
      );
    }

    // 无时间限制多了一行用时和多一块纪录胶囊，按钮整体下移。
    const buttonDrop = endless ? 52 : 0;
    this.nextRect = state.hasNext
      ? { x: width / 2 - 160, y: panel.y + 270, w: 320, h: 72 }
      : { x: 0, y: 0, w: 0, h: 0 };
    this.restartRect = {
      x: width / 2 - 160,
      y: panel.y + (state.hasNext ? 356 : 280) + buttonDrop,
      w: 320,
      h: 64,
    };
    this.homeRect = {
      x: width / 2 - 160,
      y: panel.y + (state.hasNext ? 444 : 370) + buttonDrop,
      w: 320,
      h: 56,
    };

    if (state.hasNext) {
      this.drawButton(ctx, this.nextRect, 'next', '下一关', COLORS.jade, COLORS.paper);
      this.drawButton(
        ctx,
        this.restartRect,
        'restart',
        '重玩本关',
        'rgba(58,46,42,0.08)',
        COLORS.inkSoft,
      );
    } else {
      this.drawButton(
        ctx,
        this.restartRect,
        'restart',
        state.mode === 'endless' ? '再来一局' : won ? '重玩本关' : '重新挑战',
        COLORS.jade,
        COLORS.paper,
      );
    }

    this.drawButton(
      ctx,
      this.homeRect,
      'home',
      '选择模式',
      'rgba(58,46,42,0.06)',
      COLORS.inkSoft,
    );
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    id: HudHit,
    label: string,
    fill: string,
    textColor: string,
  ): void {
    drawStickerButton(ctx, rect, label, {
      fill,
      textColor,
      fontSize: id === 'next' ? FONT.subtitle : FONT.body,
      radius: RADIUS.md,
      pressed: this.pressed === id,
      seed: 931 + rect.y,
    });
  }
}
