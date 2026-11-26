import { GameContext, GameInstance } from '../../core/types';
import { Renderer } from '../../core/render/renderer';
import { createRng, hashString, Rng } from '../../core/rng';
import {
  drawBerry,
  drawDiamond,
  drawHex,
  drawPanel,
  drawPetal,
  drawStar,
  drawText,
  fillRoundRect,
  pointInRect,
  Rect,
  strokeRoundRect,
} from '../../shared/design-system/draw';
import { COLORS, FONT, RADIUS } from '../../shared/design-system/tokens';
import {
  Board,
  Cell,
  createBoard,
  findMatches,
  hasPossibleMove,
  isAdjacent,
  resolveBoard,
  swapCells,
} from './systems/board';
import { LEVELS, levelById, Match3Level, starsFor } from './data/levels';
import { DAILY_MOVES, DAILY_TARGET, dailySeed } from './data/daily';
import { Match3Save, migrateSave } from './systems/save';

const ROWS = 6;
const COLS = 8;
const BOARD_WIDTH = 660;
const CELL = BOARD_WIDTH / COLS;

interface TileStyle {
  fill: string;
  ink: string;
  symbol: 'berry' | 'star' | 'diamond' | 'hex' | 'petal';
}

const TILE_STYLES: TileStyle[] = [
  { fill: '#F7A8C4', ink: '#8A3650', symbol: 'berry' },
  { fill: '#F6C667', ink: '#8A641F', symbol: 'star' },
  { fill: '#A8E6CF', ink: '#2F8F7B', symbol: 'diamond' },
  { fill: '#8CCFE8', ink: '#2C6D86', symbol: 'hex' },
  { fill: '#C9B6E4', ink: '#5D4A82', symbol: 'petal' },
];

type GameState = 'playing' | 'won' | 'lost';

export class Match3Game implements GameInstance {
  private readonly ctx: GameContext;
  private rng: Rng;
  private board: Board;
  private level: Match3Level;
  private readonly saveData: Match3Save;
  private selected: Cell | null = null;
  private score = 0;
  private moves = 0;
  private state: GameState = 'playing';
  private daily = false;
  private message = '';
  private messageUntil = 0;
  private pulse = 0;

  private readonly boardRect: Rect;
  private readonly backRect: Rect;
  private readonly dailyRect: Rect;
  private nextRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private restartRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private homeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.saveData = migrateSave(ctx.storage.get<unknown>('save:match3', null));
    this.level = levelById(this.saveData.unlockedLevel);
    this.rng = createRng((Date.now() ^ hashString(ctx.gameId) ^ this.level.id) >>> 0);
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.moves = this.level.moves;
    this.boardRect = {
      x: 45,
      y: ctx.renderer.safeTop + 250,
      w: BOARD_WIDTH,
      h: CELL * ROWS,
    };
    this.backRect = { x: 40, y: ctx.renderer.safeTop + 22, w: 104, h: 64 };
    this.dailyRect = {
      x: ctx.renderer.width - 40 - 128,
      y: ctx.renderer.safeTop + 22,
      w: 128,
      h: 64,
    };
  }

  enter(): void {
    this.ctx.analytics.track('level_start', { game: 'match3', level: this.level.id });
  }

  exit(): void {
    this.save();
  }

  update(dt: number): void {
    this.pulse += dt;
  }

  render(renderer: Renderer): void {
    const ctx = renderer.ctx;
    this.drawBackground(ctx, renderer);
    this.drawHeader(ctx, renderer);
    this.drawBoard(ctx);
    this.drawFooter(ctx, renderer);
    if (this.state !== 'playing') this.drawResult(ctx, renderer);
    this.drawMessage(ctx, renderer);
  }

  onTap(x: number, y: number): void {
    if (pointInRect(x, y, this.backRect)) {
      this.ctx.exitGame();
      return;
    }
    if (pointInRect(x, y, this.dailyRect)) {
      this.startDaily();
      return;
    }

    if (this.state !== 'playing') {
      if (this.nextRect.w > 0 && pointInRect(x, y, this.nextRect)) {
        this.startLevel(this.level.id + 1, false);
      } else if (pointInRect(x, y, this.restartRect)) {
        this.reset();
      } else if (pointInRect(x, y, this.homeRect)) {
        this.ctx.exitGame();
      }
      return;
    }

    if (!pointInRect(x, y, this.boardRect)) return;
    const c = Math.floor((x - this.boardRect.x) / CELL);
    const r = Math.floor((y - this.boardRect.y) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (this.board[r][c] === -1) return;

    if (!this.selected) {
      this.selected = { r, c };
      this.ctx.audio.playSfx('select');
      return;
    }

    if (this.selected.r === r && this.selected.c === c) {
      this.selected = null;
      return;
    }

    if (!isAdjacent(this.selected, { r, c })) {
      this.selected = { r, c };
      return;
    }

    const from = this.selected;
    this.selected = null;
    this.trySwap(from, { r, c });
  }

  private trySwap(a: Cell, b: Cell): void {
    swapCells(this.board, a, b);
    if (findMatches(this.board).size === 0) {
      swapCells(this.board, a, b);
      this.flash('这样交换没有三连哦');
      return;
    }

    this.moves -= 1;
    this.ctx.audio.playSfx('swap');
    const result = resolveBoard(this.board, this.level.colors, this.rng);
    this.score += result.score;
    if (result.cascades > 1) {
      this.flash(`连锁 x${result.cascades}，+${result.score}`);
    }
    if (!hasPossibleMove(this.board)) {
      this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
      this.selected = null;
      this.flash('没有可交换的组合，重新洗牌');
    }

    if (this.score >= this.level.target) {
      this.state = 'won';
      this.saveData.bestScore = Math.max(this.saveData.bestScore, this.score);
      this.saveData.wins += 1;

      if (this.daily) {
        const today = this.ctx.time.todayKey();
        const previousBest = this.saveData.dailyDate === today ? this.saveData.dailyBest : 0;
        this.saveData.dailyDate = today;
        this.saveData.dailyBest = Math.max(previousBest, this.score);
        this.save();
        this.ctx.analytics.track('daily_complete', {
          game: 'match3',
          score: this.score,
        });
      } else {
        const stars = starsFor(this.level, this.score);
        const key = `${this.level.id}`;
        this.saveData.stars[key] = Math.max(this.saveData.stars[key] ?? 0, stars);
        this.saveData.unlockedLevel = Math.max(
          this.saveData.unlockedLevel,
          Math.min(this.level.id + 1, LEVELS.length),
        );
        this.save();
        this.ctx.analytics.track('level_complete', {
          game: 'match3',
          level: this.level.id,
          score: this.score,
          stars,
        });
      }
    } else if (this.moves <= 0) {
      this.state = 'lost';
      this.ctx.analytics.track(this.daily ? 'daily_fail' : 'level_fail', {
        game: 'match3',
        level: this.level.id,
        score: this.score,
      });
    }
  }

  private reset(): void {
    if (this.daily) {
      this.startDaily();
    } else {
      this.startLevel(this.level.id, true);
    }
  }

  private startDaily(): void {
    this.daily = true;
    this.level = {
      id: 0,
      title: '每日挑战',
      moves: DAILY_MOVES,
      target: DAILY_TARGET,
      colors: 5,
    };
    const date = this.ctx.time.todayKey();
    this.rng = createRng(dailySeed(date));
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.selected = null;
    this.score = 0;
    this.moves = this.level.moves;
    this.state = 'playing';
    this.nextRect = { x: 0, y: 0, w: 0, h: 0 };
    this.flash('每日挑战：每天固定棋盘');
    this.ctx.analytics.track('daily_start', { game: 'match3' });
  }

  private startLevel(levelId: number, retry: boolean): void {
    this.daily = false;
    this.level = levelById(levelId);
    const seed = (Date.now() ^ hashString(`${this.ctx.gameId}:${this.level.id}`)) >>> 0;
    this.rng = createRng(seed);
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.selected = null;
    this.score = 0;
    this.moves = this.level.moves;
    this.state = 'playing';
    this.message = '';
    this.nextRect = { x: 0, y: 0, w: 0, h: 0 };
    this.ctx.analytics.track('level_start', {
      game: 'match3',
      level: this.level.id,
      retry,
    });
  }

  private save(): void {
    this.ctx.storage.set('save:match3', this.saveData);
  }

  private flash(text: string): void {
    this.message = text;
    this.messageUntil = Date.now() + 1400;
  }

  private drawBackground(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, renderer.height);
    gradient.addColorStop(0, '#FFF9EF');
    gradient.addColorStop(0.6, '#F0FAF2');
    gradient.addColorStop(1, '#E2F3EA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
  }

  private drawHeader(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    drawPanel(ctx, this.backRect, { fill: COLORS.paper, radius: RADIUS.md });
    drawText(ctx, '返回', this.backRect.x + this.backRect.w / 2, this.backRect.y + 32, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'center',
    });

    drawPanel(ctx, this.dailyRect, {
      fill: this.daily ? COLORS.jade : COLORS.paper,
      radius: RADIUS.md,
    });
    drawText(ctx, '每日', this.dailyRect.x + this.dailyRect.w / 2, this.dailyRect.y + 32, {
      size: FONT.caption,
      color: this.daily ? COLORS.paper : COLORS.inkSoft,
      align: 'center',
      weight: '700',
    });

    const title = this.daily ? '每日挑战' : '王都三消';
    const best = this.daily
      ? this.saveData.dailyDate === this.ctx.time.todayKey()
        ? this.saveData.dailyBest
        : 0
      : this.saveData.bestScore;
    const subtitle = this.daily
      ? `今天 · ${this.level.moves} 步 · 目标 ${this.level.target} · 最佳 ${best}`
      : `第 ${this.level.id} 关 · ${this.level.title} · 最佳 ${best}`;

    drawText(ctx, title, renderer.width / 2, renderer.safeTop + 54, {
      size: FONT.display,
      weight: '700',
      color: COLORS.ink,
      align: 'center',
    });
    drawText(ctx, subtitle, renderer.width / 2, renderer.safeTop + 96, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'center',
      maxWidth: renderer.width - 220,
    });

    const hudY = renderer.safeTop + 126;
    const scoreRect = { x: 40, y: hudY, w: 320, h: 88 };
    const movesRect = { x: 390, y: hudY, w: 320, h: 88 };
    drawPanel(ctx, scoreRect, { fill: COLORS.paper, radius: RADIUS.lg });
    drawPanel(ctx, movesRect, { fill: COLORS.paper, radius: RADIUS.lg });

    drawText(ctx, '分数', scoreRect.x + 24, scoreRect.y + 28, {
      size: 18,
      color: COLORS.inkSoft,
    });
    drawText(ctx, `${this.score}`, scoreRect.x + 24, scoreRect.y + 62, {
      size: FONT.subtitle,
      weight: '700',
      color: COLORS.jade,
    });
    drawText(ctx, '步数', movesRect.x + 24, movesRect.y + 28, {
      size: 18,
      color: COLORS.inkSoft,
    });
    drawText(ctx, `${this.moves}`, movesRect.x + 24, movesRect.y + 62, {
      size: FONT.subtitle,
      weight: '700',
      color: this.moves <= 5 ? COLORS.coral : COLORS.ink,
    });
  }

  private drawBoard(ctx: CanvasRenderingContext2D): void {
    drawPanel(
      ctx,
      {
        x: this.boardRect.x - 18,
        y: this.boardRect.y - 18,
        w: this.boardRect.w + 36,
        h: this.boardRect.h + 36,
      },
      { fill: COLORS.paper, radius: RADIUS.xl },
    );

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const value = this.board[r][c];
        if (value === -1) continue;
        const x = this.boardRect.x + c * CELL;
        const y = this.boardRect.y + r * CELL;
        this.drawTile(ctx, x, y, value, Boolean(this.selected?.r === r && this.selected?.c === c));
      }
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: number,
    selected: boolean,
  ): void {
    const style = TILE_STYLES[value % TILE_STYLES.length];
    const pad = selected ? 4 : 7;
    const rect = { x: x + pad, y: y + pad, w: CELL - pad * 2, h: CELL - pad * 2 };

    fillRoundRect(ctx, rect, style.fill, RADIUS.lg);
    strokeRoundRect(ctx, rect, selected ? COLORS.gold : 'rgba(58,46,42,0.28)', selected ? 4 : 2, RADIUS.lg);

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(rect.x + rect.w * 0.34, rect.y + rect.h * 0.3, rect.w * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
    ctx.restore();

    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const size = rect.w * 0.27;

    switch (style.symbol) {
      case 'berry':
        drawBerry(ctx, cx, cy, size, style.ink);
        break;
      case 'star':
        drawStar(ctx, cx, cy, size, size * 0.46, COLORS.paper);
        break;
      case 'diamond':
        drawDiamond(ctx, cx, cy, size, COLORS.paper);
        break;
      case 'hex':
        drawHex(ctx, cx, cy, size, COLORS.paper);
        break;
      case 'petal':
        drawPetal(ctx, cx, cy, size, COLORS.paper);
        break;
    }
  }

  private drawFooter(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    const y = this.boardRect.y + this.boardRect.h + 34;
    const bar = { x: 45, y, w: BOARD_WIDTH, h: 16 };
    fillRoundRect(ctx, bar, 'rgba(58,46,42,0.12)', 8);
    const progress = Math.min(1, this.score / this.level.target);
    fillRoundRect(ctx, { ...bar, w: bar.w * progress }, COLORS.jade, 8);
    drawText(ctx, `目标 ${this.level.target} · 步数 ${this.level.moves}`, 45, y + 42, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });
    drawText(ctx, '点击两个相邻甜品交换，凑成三个或更多', renderer.width / 2, y + 92, {
      size: 20,
      color: COLORS.inkSoft,
      align: 'center',
      maxWidth: renderer.width - 80,
    });
  }

  private drawResult(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    const width = renderer.width;
    const height = renderer.height;
    const panel = { x: 75, y: height / 2 - 270, w: width - 150, h: 540 };

    ctx.fillStyle = 'rgba(58,46,42,0.42)';
    ctx.fillRect(0, 0, width, height);
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    const won = this.state === 'won';
    const stars = won && !this.daily ? starsFor(this.level, this.score) : 0;
    const title = this.daily
      ? won
        ? '今日挑战完成！'
        : '今日挑战失败'
      : won
        ? stars >= 3
          ? '三星达成！'
          : `${stars} 星过关！`
        : '步数用完了';
    drawText(ctx, title, width / 2, panel.y + 84, {
      size: FONT.display,
      weight: '700',
      color: won ? COLORS.jade : COLORS.coral,
      align: 'center',
    });
    drawText(ctx, `本局得分 ${this.score} / ${this.level.target}`, width / 2, panel.y + 142, {
      size: FONT.body,
      color: COLORS.inkSoft,
      align: 'center',
    });

    if (won && !this.daily) {
      for (let i = 0; i < 3; i += 1) {
        const scale = 1 + Math.sin(this.pulse * 3 + i) * 0.06;
        drawStar(
          ctx,
          width / 2 + (i - 1) * 92,
          panel.y + 220,
          30 * scale,
          14 * scale,
          i < stars ? COLORS.gold : 'rgba(58,46,42,0.12)',
        );
      }
    }

    const hasNext = !this.daily && won && this.level.id < LEVELS.length;
    this.nextRect = hasNext
      ? { x: width / 2 - 160, y: panel.y + 270, w: 320, h: 72 }
      : { x: 0, y: 0, w: 0, h: 0 };
    this.restartRect = { x: width / 2 - 160, y: panel.y + (hasNext ? 356 : 280), w: 320, h: 64 };
    this.homeRect = { x: width / 2 - 160, y: panel.y + (hasNext ? 444 : 370), w: 320, h: 56 };

    if (hasNext) {
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
        this.daily ? '再试一次' : won ? '重玩本关' : '重新挑战',
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

  private drawMessage(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    if (!this.message || Date.now() >= this.messageUntil) return;
    const width = Math.min(renderer.width - 120, Math.max(340, this.message.length * 26 + 64));
    const rect = { x: (renderer.width - width) / 2, y: renderer.height - 180, w: width, h: 72 };
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.88)', RADIUS.xl);
    drawText(ctx, this.message, renderer.width / 2, rect.y + 36, {
      size: FONT.body,
      color: COLORS.paper,
      align: 'center',
      maxWidth: rect.w - 48,
    });
  }
}
