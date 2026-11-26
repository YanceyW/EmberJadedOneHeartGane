import { Easing } from '../../../core/anim/easing';
import { Renderer } from '../../../core/render/renderer';
import {
  drawPanel,
  drawStar,
  drawText,
  drawWangduCoin,
  fillRoundRect,
  Rect,
} from '../../../shared/design-system/draw';
import { DURATION } from '../../../shared/design-system/motion';
import { RoyalOutfitId } from '../../../shared/design-system/royals';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { tempoLabel, timerUrgency } from '../systems/tempo';
import { Match3Stage } from './stage';

export const HUD_TOP_GAP = 16;
export const BOARD_TOP_AFTER_HUD = 208;

export function match3HudTop(renderer: Renderer): number {
  return Math.max(renderer.safeTop, renderer.capsuleBottom) + HUD_TOP_GAP;
}

export type HudHit = 'back' | 'daily' | 'restart' | 'home' | 'next';

export interface HudState {
  title: string;
  subtitle: string;
  score: number;
  target: number;
  progress: number;
  daily: boolean;
  phase: 'playing' | 'won' | 'lost';
  stars: number;
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
  coinsEarned: number;
  coinBalance: number;
  outfit: RoyalOutfitId;
}

/**
 * 三消的 HUD 与结果面板。只画不判定，点击命中也只回报语义 id。
 */
export class Match3Hud {
  readonly backRect: Rect;
  readonly dailyRect: Rect;
  private restartRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private homeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private nextRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
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
    this.dailyRect = {
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
    if (this.hit(x, y, this.dailyRect)) return 'daily';
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

    this.drawBackButton(ctx);
    this.drawDailyButton(ctx, state);

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
    this.drawProgress(ctx, state);
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
    });
    this.drawMessage(ctx, state);

    if (state.phase !== 'playing') this.drawResult(ctx, state);
  }

  private drawBackButton(ctx: CanvasRenderingContext2D): void {
    const rect = this.backRect;
    const sink = this.pressed === 'back' ? 3 : 0;
    fillRoundRect(ctx, { ...rect, y: rect.y + 4 }, 'rgba(58,46,42,0.12)', RADIUS.md);
    drawPanel(ctx, { ...rect, y: rect.y + sink }, { fill: COLORS.paper, radius: RADIUS.md });
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2 + sink;
    ctx.save();
    ctx.strokeStyle = COLORS.inkSoft;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 11);
    ctx.lineTo(cx - 6, cy);
    ctx.lineTo(cx + 7, cy + 11);
    ctx.stroke();
    ctx.restore();
  }

  private drawDailyButton(ctx: CanvasRenderingContext2D, state: HudState): void {
    const rect = this.dailyRect;
    const sink = this.pressed === 'daily' ? 3 : 0;
    fillRoundRect(
      ctx,
      { ...rect, y: rect.y + 4 },
      state.daily ? COLORS.teal : 'rgba(58,46,42,0.12)',
      RADIUS.md,
    );
    drawPanel(
      ctx,
      { ...rect, y: rect.y + sink },
      { fill: state.daily ? COLORS.jade : COLORS.paper, radius: RADIUS.md },
    );
    drawText(ctx, '每日', rect.x + rect.w / 2, rect.y + 28 + sink, {
      size: 18,
      color: state.daily ? COLORS.paper : COLORS.inkSoft,
      align: 'center',
      weight: '700',
    });
  }

  private drawStats(ctx: CanvasRenderingContext2D, state: HudState): void {
    const hudY = this.hudTop + 112;
    const scoreRect: Rect = { x: 40, y: hudY, w: 360, h: 88 };
    const timeRect: Rect = { x: 420, y: hudY, w: 290, h: 88 };

    drawPanel(ctx, scoreRect, { fill: COLORS.paper, radius: RADIUS.lg });
    drawPanel(ctx, timeRect, { fill: COLORS.paper, radius: RADIUS.lg });

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
    drawText(ctx, `${state.score}`, 0, 0, {
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

    const urgency = timerUrgency(state.seconds);
    const timeColor = urgency === 'normal' ? COLORS.ink : COLORS.coral;
    drawText(ctx, '剩余时间', timeRect.x + 22, timeRect.y + 22, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });

    const pulse =
      urgency === 'critical' && !state.reducedMotion ? 1 + Math.sin(state.pulse * 7) * 0.03 : 1;
    ctx.save();
    ctx.translate(timeRect.x + 22, timeRect.y + 58);
    ctx.scale(pulse, pulse);
    drawText(ctx, state.clock, 0, 0, {
      size: FONT.title,
      weight: '700',
      color: timeColor,
    });
    ctx.restore();

    const bar: Rect = { x: timeRect.x + 18, y: timeRect.y + 74, w: timeRect.w - 36, h: 6 };
    fillRoundRect(ctx, bar, 'rgba(58,46,42,0.10)', 3);
    fillRoundRect(
      ctx,
      { ...bar, w: bar.w * Math.max(0, Math.min(1, state.seconds / state.totalSeconds)) },
      timeColor,
      3,
    );

    if (urgency === 'critical' && Math.sin(state.pulse * 7) > 0.2) {
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
    fillRoundRect(ctx, bar, 'rgba(58,46,42,0.12)', 7);
    fillRoundRect(
      ctx,
      { ...bar, w: bar.w * Math.min(1, Math.max(0, state.progress)) },
      COLORS.jade,
      7,
    );
    drawText(ctx, `目标 ${state.target}`, 45, y + 38, {
      size: 18,
      color: COLORS.inkSoft,
    });
    drawText(
      ctx,
      `${Math.min(100, Math.round(state.progress * 100))}%`,
      this.renderer.width - 45,
      y + 38,
      {
        size: 18,
        color: COLORS.inkSoft,
        align: 'right',
      },
    );
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
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.88)', RADIUS.lg);
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

    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    const won = state.phase === 'won';
    const title = state.daily
      ? won
        ? '今日挑战完成！'
        : '今日挑战失败'
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
    drawText(ctx, `本局得分 ${state.score} / ${state.target}`, width / 2, panel.y + 142, {
      size: FONT.body,
      color: COLORS.inkSoft,
      align: 'center',
    });

    drawWangduCoin(ctx, width / 2 - 64, panel.y + 180, 13);
    drawText(ctx, `+${state.coinsEarned} 王都币`, width / 2 - 44, panel.y + 180, {
      size: 20,
      weight: '700',
      color: COLORS.honeyDeep,
    });
    drawText(ctx, `余额 ${state.coinBalance}`, width / 2 + 118, panel.y + 180, {
      size: 16,
      color: COLORS.inkSoft,
      maxWidth: 120,
    });

    if (won && !state.daily) {
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
    }

    this.nextRect = state.hasNext
      ? { x: width / 2 - 160, y: panel.y + 270, w: 320, h: 72 }
      : { x: 0, y: 0, w: 0, h: 0 };
    this.restartRect = {
      x: width / 2 - 160,
      y: panel.y + (state.hasNext ? 356 : 280),
      w: 320,
      h: 64,
    };
    this.homeRect = {
      x: width / 2 - 160,
      y: panel.y + (state.hasNext ? 444 : 370),
      w: 320,
      h: 56,
    };

    if (state.hasNext) {
      this.drawButton(ctx, this.nextRect, 'next', '下一关', COLORS.jade, COLORS.teal, COLORS.paper);
      this.drawButton(
        ctx,
        this.restartRect,
        'restart',
        '重玩本关',
        'rgba(58,46,42,0.08)',
        'rgba(58,46,42,0.16)',
        COLORS.inkSoft,
      );
    } else {
      this.drawButton(
        ctx,
        this.restartRect,
        'restart',
        state.daily ? '再试一次' : won ? '重玩本关' : '重新挑战',
        COLORS.jade,
        COLORS.teal,
        COLORS.paper,
      );
    }

    this.drawButton(
      ctx,
      this.homeRect,
      'home',
      '返回大厅',
      'rgba(58,46,42,0.06)',
      'rgba(58,46,42,0.12)',
      COLORS.inkSoft,
    );
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    id: HudHit,
    label: string,
    fill: string,
    edge: string,
    textColor: string,
  ): void {
    const sink = this.pressed === id ? 4 : 0;
    fillRoundRect(ctx, { ...rect, y: rect.y + 5 }, edge, RADIUS.md);
    fillRoundRect(ctx, { ...rect, y: rect.y + sink }, fill, RADIUS.md);
    drawText(ctx, label, rect.x + rect.w / 2, rect.y + sink + rect.h / 2, {
      size: id === 'next' ? FONT.subtitle : FONT.body,
      color: textColor,
      align: 'center',
      weight: id === 'home' ? 'normal' : '700',
    });
  }
}
