import { Renderer } from '../../../core/render/renderer';
import {
  drawPanel,
  drawStar,
  drawText,
  fillRoundRect,
  Rect,
} from '../../../shared/design-system/draw';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';

export type HudHit = 'back' | 'daily' | 'restart' | 'home' | 'next';

export interface HudState {
  title: string;
  subtitle: string;
  score: number;
  moves: number;
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

  constructor(private readonly renderer: Renderer) {
    this.backRect = { x: 40, y: renderer.safeTop + 22, w: 104, h: 64 };
    this.dailyRect = {
      x: renderer.width - 40 - 128,
      y: renderer.safeTop + 22,
      w: 128,
      h: 64,
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

  render(ctx: CanvasRenderingContext2D, state: HudState): void {
    const renderer = this.renderer;
    const width = renderer.width;

    // 回到对局时清空结算面板的命中区域，避免误触到旧按钮。
    if (state.phase === 'playing') {
      this.bounds = { x: 0, y: 0, w: 0, h: 0 };
      this.nextRect = { x: 0, y: 0, w: 0, h: 0 };
      this.restartRect = { x: 0, y: 0, w: 0, h: 0 };
      this.homeRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    drawPanel(ctx, this.backRect, { fill: COLORS.paper, radius: RADIUS.md });
    drawText(ctx, '返回', this.backRect.x + this.backRect.w / 2, this.backRect.y + 32, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'center',
    });

    drawPanel(ctx, this.dailyRect, {
      fill: state.daily ? COLORS.jade : COLORS.paper,
      radius: RADIUS.md,
    });
    drawText(ctx, '每日', this.dailyRect.x + this.dailyRect.w / 2, this.dailyRect.y + 32, {
      size: FONT.caption,
      color: state.daily ? COLORS.paper : COLORS.inkSoft,
      align: 'center',
      weight: '700',
    });

    drawText(ctx, state.title, width / 2, renderer.safeTop + 54, {
      size: FONT.display,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, state.subtitle, width / 2, renderer.safeTop + 96, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'center',
      maxWidth: width - 220,
    });

    this.drawStats(ctx, state);
    this.drawProgress(ctx, state);
    this.drawMessage(ctx, state);

    if (state.phase !== 'playing') this.drawResult(ctx, state);
  }

  private drawStats(ctx: CanvasRenderingContext2D, state: HudState): void {
    const safeTop = this.renderer.safeTop;
    const hudY = safeTop + 126;
    const scoreRect: Rect = { x: 40, y: hudY, w: 320, h: 88 };
    const movesRect: Rect = { x: 390, y: hudY, w: 320, h: 88 };

    drawPanel(ctx, scoreRect, { fill: COLORS.paper, radius: RADIUS.lg });
    drawPanel(ctx, movesRect, { fill: COLORS.paper, radius: RADIUS.lg });

    drawText(ctx, '分数', scoreRect.x + 24, scoreRect.y + 28, {
      size: 18,
      color: COLORS.inkSoft,
    });
    drawText(ctx, `${state.score}`, scoreRect.x + 24, scoreRect.y + 62, {
      size: FONT.subtitle,
      weight: '700',
      color: COLORS.jade,
    });

    drawText(ctx, '步数', movesRect.x + 24, movesRect.y + 28, {
      size: 18,
      color: COLORS.inkSoft,
    });
    drawText(ctx, `${state.moves}`, movesRect.x + 24, movesRect.y + 62, {
      size: FONT.subtitle,
      weight: '700',
      color: state.moves <= 5 ? COLORS.coral : COLORS.ink,
    });
  }

  private drawProgress(ctx: CanvasRenderingContext2D, state: HudState): void {
    const y = state.boardBottom + 34;
    const bar: Rect = { x: 45, y, w: this.renderer.width - 90, h: 16 };
    fillRoundRect(ctx, bar, 'rgba(58,46,42,0.12)', 8);
    fillRoundRect(
      ctx,
      { ...bar, w: bar.w * Math.min(1, Math.max(0, state.progress)) },
      COLORS.jade,
      8,
    );
    drawText(ctx, `目标 ${state.target}`, 45, y + 42, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });
  }

  private drawMessage(ctx: CanvasRenderingContext2D, state: HudState): void {
    if (!state.message) return;
    const width = Math.min(
      this.renderer.width - 120,
      Math.max(340, state.message.length * 26 + 64),
    );
    const rect: Rect = {
      x: (this.renderer.width - width) / 2,
      y: state.boardBottom + 96,
      w: width,
      h: 72,
    };
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.88)', RADIUS.xl);
    drawText(ctx, state.message, this.renderer.width / 2, rect.y + 36, {
      size: FONT.body,
      color: COLORS.paper,
      align: 'center',
      maxWidth: rect.w - 48,
    });
  }

  private drawResult(ctx: CanvasRenderingContext2D, state: HudState): void {
    const width = this.renderer.width;
    const height = this.renderer.height;
    const panel: Rect = { x: 75, y: height / 2 - 270, w: width - 150, h: 540 };
    this.bounds = panel;

    ctx.fillStyle = 'rgba(58,46,42,0.42)';
    ctx.fillRect(0, 0, width, height);
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
        : '步数用完了';

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

    if (won && !state.daily) {
      for (let i = 0; i < 3; i += 1) {
        const scale = 1 + Math.sin(state.pulse * 3 + i) * 0.06;
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
      fillRoundRect(ctx, this.nextRect, COLORS.jade, RADIUS.md);
      drawText(ctx, '下一关', width / 2, this.nextRect.y + 36, {
        size: FONT.subtitle,
        color: COLORS.paper,
        align: 'center',
        weight: '700',
      });
      fillRoundRect(ctx, this.restartRect, 'rgba(58,46,42,0.08)', RADIUS.md);
      drawText(ctx, '重玩本关', width / 2, this.restartRect.y + 32, {
        size: FONT.body,
        color: COLORS.inkSoft,
        align: 'center',
      });
    } else {
      fillRoundRect(ctx, this.restartRect, COLORS.jade, RADIUS.md);
      drawText(
        ctx,
        state.daily ? '再试一次' : won ? '重玩本关' : '重新挑战',
        width / 2,
        this.restartRect.y + 32,
        {
          size: FONT.subtitle,
          color: COLORS.paper,
          align: 'center',
          weight: '700',
        },
      );
    }

    fillRoundRect(ctx, this.homeRect, 'rgba(58,46,42,0.06)', RADIUS.md);
    drawText(ctx, '返回大厅', width / 2, this.homeRect.y + 28, {
      size: FONT.body,
      color: COLORS.inkSoft,
      align: 'center',
    });
  }
}
