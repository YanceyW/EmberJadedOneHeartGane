import { GameContext, GameInstance } from '../../core/types';
import { Renderer } from '../../core/render/renderer';
import { createRng, hashString, Rng } from '../../core/rng';
import { DURATION } from '../../shared/design-system/motion';
import { drawPanel, Rect } from '../../shared/design-system/draw';
import { COLORS, RADIUS } from '../../shared/design-system/tokens';
import {
  Board,
  Cell,
  EMPTY,
  createBoard,
  findMatches,
  hasPossibleMove,
  isAdjacent,
  resolveWithReport,
  swapCells,
} from './systems/board';
import { LEVELS, levelById, Match3Level, starsFor } from './data/levels';
import { DAILY_MOVES, DAILY_TARGET, dailySeed } from './data/daily';
import { Match3Save, mergeSaves, migrateSave } from './systems/save';
import { BoardView } from './view/board-view';
import { HudState, Match3Hud } from './view/hud';

const ROWS = 6;
const COLS = 8;
const BOARD_WIDTH = 660;
const BOARD_PAD = 18;
const CELL_W = BOARD_WIDTH / COLS;
const CELL_H = 82.5;

type GameState = 'playing' | 'won' | 'lost';

/**
 * 王都三消控制器：只负责状态机、输入、存档与云同步。
 * 棋盘绘制/动画在 view/board-view.ts，HUD 在 view/hud.ts。
 */
export class Match3Game implements GameInstance {
  private rng: Rng;
  private board: Board;
  private level: Match3Level;
  private saveData: Match3Save;
  private selected: Cell | null = null;
  private score = 0;
  private moves = 0;
  private state: GameState = 'playing';
  private daily = false;
  private message = '';
  private messageUntil = 0;
  private pulse = 0;

  private readonly boardRect: Rect;
  private readonly view: BoardView;
  private readonly hud: Match3Hud;
  private pendingTap: Cell | null = null;

  constructor(private readonly ctx: GameContext) {
    this.saveData = migrateSave(ctx.storage.get<unknown>('save:match3', null));
    this.level = levelById(this.saveData.unlockedLevel);
    this.rng = createRng((Date.now() ^ hashString(ctx.gameId) ^ this.level.id) >>> 0);
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.moves = this.level.moves;

    this.boardRect = {
      x: 45,
      y: ctx.renderer.safeTop + 250,
      w: BOARD_WIDTH,
      h: CELL_H * ROWS,
    };

    this.view = new BoardView(ctx.tweens, ctx.atlas);
    this.view.configure(ROWS, COLS, CELL_W, CELL_H);
    this.view.setBoard(this.board);
    this.hud = new Match3Hud(ctx.renderer);
  }

  enter(): void {
    this.ctx.analytics.track('level_start', {
      game: 'match3',
      level: this.level.id,
      daily: this.daily,
    });
    void this.syncCloud();
  }

  exit(): void {
    this.view.skipAll();
    this.save();
    void this.syncCloud();
    this.ctx.particles.clear();
    this.ctx.feedback.resetCombo();
  }

  update(dt: number): void {
    this.pulse += dt;
  }

  render(renderer: Renderer): void {
    const ctx = renderer.ctx;
    this.drawBackground(ctx, renderer);

    drawPanel(
      ctx,
      {
        x: this.boardRect.x - BOARD_PAD,
        y: this.boardRect.y - BOARD_PAD,
        w: this.boardRect.w + BOARD_PAD * 2,
        h: this.boardRect.h + BOARD_PAD * 2,
      },
      { fill: COLORS.paper, radius: RADIUS.xl },
    );

    this.view.render(ctx, this.boardRect, this.selected, this.pulse);
    this.view.renderCombo(ctx, renderer.width / 2, this.boardRect.y - 34);

    this.hud.render(ctx, this.hudState());
  }

  onTap(x: number, y: number): void {
    const hit = this.hud.hitTest(x, y);
    if (hit === 'back' || hit === 'home') {
      this.ctx.feedback.tap();
      this.ctx.exitGame();
      return;
    }
    if (hit === 'daily') {
      this.ctx.feedback.tap();
      this.startDaily();
      return;
    }
    if (hit === 'restart') {
      this.ctx.feedback.tap();
      this.reset();
      return;
    }
    if (hit === 'next') {
      this.ctx.feedback.tap();
      this.startLevel(this.level.id + 1, false);
      return;
    }

    if (this.state !== 'playing') return;
    this.handleBoardTap(x, y);
  }

  private handleBoardTap(x: number, y: number): void {
    if (!this.insideBoard(x, y)) return;
    const c = Math.floor((x - this.boardRect.x) / CELL_W);
    const r = Math.floor((y - this.boardRect.y) / CELL_H);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    // 动画期间只记录最后一次点击，播完立刻消费，避免「点了没反应」。
    if (this.view.isBusy) {
      this.pendingTap = { r, c };
      return;
    }

    this.selectCell({ r, c });
  }

  private selectCell(cell: Cell): void {
    if (this.board[cell.r][cell.c] === EMPTY) return;

    if (!this.selected) {
      this.selected = cell;
      this.ctx.feedback.select();
      return;
    }

    if (this.selected.r === cell.r && this.selected.c === cell.c) {
      this.selected = null;
      return;
    }

    if (!isAdjacent(this.selected, cell)) {
      this.selected = cell;
      this.ctx.feedback.select();
      return;
    }

    const from = this.selected;
    this.selected = null;
    this.trySwap(from, cell);
  }

  private trySwap(a: Cell, b: Cell): void {
    const pre = this.board.map((row) => [...row]);
    swapCells(this.board, a, b);

    if (findMatches(this.board).size === 0) {
      swapCells(this.board, a, b);
      const cx = this.boardRect.x + ((a.c + b.c) / 2 + 0.5) * CELL_W;
      const cy = this.boardRect.y + ((a.r + b.r) / 2 + 0.5) * CELL_H;
      this.ctx.feedback.invalid(cx, cy);
      this.flash('这样交换没有三连哦');
      this.view.playInvalid(a, b, () => this.consumePendingTap());
      return;
    }

    this.moves -= 1;
    const report = resolveWithReport(this.board, this.level.colors, this.rng);

    this.view.beginMove(
      pre,
      a,
      b,
      report,
      this.board,
      () => this.ctx.feedback.tap(),
      (step) => this.onStep(step.index, step.gained, step.cleared),
      () => this.onMoveComplete(),
    );
  }

  private onStep(comboIndex: number, gained: number, cleared: { r: number; c: number }[]): void {
    this.score += gained;
    if (comboIndex > 1) {
      this.view.showCombo(`连锁 x${comboIndex}  +${gained}`);
      // 连击时整体加速，避免一次操作等太久
      this.ctx.tweens.setTimeScale(Math.max(0.7, 1 - (comboIndex - 1) * 0.12));
    }

    let sx = 0;
    let sy = 0;
    for (const cell of cleared) {
      sx += this.boardRect.x + (cell.c + 0.5) * CELL_W;
      sy += this.boardRect.y + (cell.r + 0.5) * CELL_H;
    }
    const count = Math.max(1, cleared.length);
    this.ctx.feedback.match(comboIndex, sx / count, sy / count);
  }

  private onMoveComplete(): void {
    this.ctx.tweens.setTimeScale(1);

    if (!hasPossibleMove(this.board)) {
      this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
      this.selected = null;
      this.view.setBoard(this.board);
      this.flash('没有可交换的组合，重新洗牌');
      this.ctx.feedback.drop(this.boardRect.x + this.boardRect.w / 2, this.boardRect.y + this.boardRect.h / 2);
    }

    if (this.score >= this.level.target) {
      this.finishWin();
    } else if (this.moves <= 0) {
      this.finishLose();
    }

    this.consumePendingTap();
  }

  private finishWin(): void {
    this.state = 'won';
    this.saveData.bestScore = Math.max(this.saveData.bestScore, this.score);
    this.saveData.wins += 1;

    if (this.daily) {
      const today = this.ctx.time.todayKey();
      const previous = this.saveData.dailyDate === today ? this.saveData.dailyBest : 0;
      this.saveData.dailyDate = today;
      this.saveData.dailyBest = Math.max(previous, this.score);
    } else {
      const stars = starsFor(this.level, this.score);
      const key = `${this.level.id}`;
      this.saveData.stars[key] = Math.max(this.saveData.stars[key] ?? 0, stars);
      this.saveData.unlockedLevel = Math.max(
        this.saveData.unlockedLevel,
        Math.min(this.level.id + 1, LEVELS.length),
      );
    }

    this.save();
    this.ctx.analytics.track(this.daily ? 'daily_complete' : 'level_complete', {
      game: 'match3',
      level: this.level.id,
      score: this.score,
    });

    const cx = this.ctx.renderer.width / 2;
    const cy = this.ctx.renderer.height / 2;
    this.ctx.feedback.win(cx, cy);
    this.celebrateStars(cx, cy);
    void this.submitScore();
  }

  private finishLose(): void {
    this.state = 'lost';
    this.ctx.feedback.fail();
    this.ctx.analytics.track(this.daily ? 'daily_fail' : 'level_fail', {
      game: 'match3',
      level: this.level.id,
      score: this.score,
    });
  }

  /** 星星逐个弹出 + 星屑，成本低但仪式感明显。 */
  private celebrateStars(cx: number, cy: number): void {
    if (this.ctx.quality.reducedMotion) return;
    for (let i = 0; i < 3; i += 1) {
      this.ctx.tweens.to({
        duration: DURATION.fast,
        delay: i * 0.09,
        easing: (t) => t,
        onUpdate: () => undefined,
        onComplete: () => {
          this.ctx.feedback.burst('sparkle', cx + (i - 1) * 92, cy - 50, 0.9);
        },
      });
    }
  }

  private consumePendingTap(): void {
    const pending = this.pendingTap;
    this.pendingTap = null;
    if (!pending || this.state !== 'playing') return;
    this.selectCell(pending);
  }

  private reset(): void {
    if (this.daily) this.startDaily();
    else this.startLevel(this.level.id, true);
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
    this.rng = createRng(dailySeed(this.ctx.time.todayKey()));
    this.beginRound();
    this.flash('每日挑战：每天固定棋盘');
    this.ctx.analytics.track('daily_start', { game: 'match3' });
  }

  private startLevel(levelId: number, retry: boolean): void {
    this.daily = false;
    this.level = levelById(levelId);
    this.rng = createRng(
      (Date.now() ^ hashString(`${this.ctx.gameId}:${this.level.id}`)) >>> 0,
    );
    this.beginRound();
    this.ctx.analytics.track('level_start', {
      game: 'match3',
      level: this.level.id,
      retry,
    });
  }

  private beginRound(): void {
    this.view.skipAll();
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.view.setBoard(this.board);
    this.selected = null;
    this.score = 0;
    this.moves = this.level.moves;
    this.state = 'playing';
    this.message = '';
    this.pendingTap = null;
    this.ctx.particles.clear();
    this.ctx.feedback.resetCombo();
  }

  private insideBoard(x: number, y: number): boolean {
    return (
      x >= this.boardRect.x &&
      x <= this.boardRect.x + this.boardRect.w &&
      y >= this.boardRect.y &&
      y <= this.boardRect.y + this.boardRect.h
    );
  }

  private save(): void {
    this.ctx.storage.set('save:match3', this.saveData);
  }

  private async syncCloud(): Promise<void> {
    const outcome = await this.ctx.cloudSave.syncGame('match3', this.saveData, mergeSaves);
    if (!outcome.synced) return;
    this.saveData = outcome.data;
    this.ctx.storage.set('save:match3', this.saveData);
  }

  private async submitScore(): Promise<void> {
    const week = this.ctx.time.weekKey();
    const result = await this.ctx.cloud.submitScore('match3', week, this.score, this.level.id);
    if (result) this.flash(`本周第 ${result.rank} 名`);
    await this.syncCloud();
  }

  private flash(text: string): void {
    this.message = text;
    this.messageUntil = Date.now() + 1400;
  }

  private hudState(): HudState {
    const today = this.ctx.time.todayKey();
    const best = this.daily
      ? this.saveData.dailyDate === today
        ? this.saveData.dailyBest
        : 0
      : this.saveData.bestScore;

    return {
      title: this.daily ? '每日挑战' : '王都三消',
      subtitle: this.daily
        ? `今天 · ${this.level.moves} 步 · 目标 ${this.level.target} · 最佳 ${best}`
        : `第 ${this.level.id} 关 · ${this.level.title} · 最佳 ${best}`,
      score: this.score,
      moves: this.moves,
      target: this.level.target,
      progress: this.score / this.level.target,
      daily: this.daily,
      phase: this.state,
      stars: this.state === 'won' && !this.daily ? starsFor(this.level, this.score) : 0,
      hasNext: !this.daily && this.state === 'won' && this.level.id < LEVELS.length,
      pulse: this.pulse,
      message: Date.now() < this.messageUntil ? this.message : '',
      boardTop: this.boardRect.y,
      boardBottom: this.boardRect.y + this.boardRect.h,
    };
  }

  private drawBackground(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, renderer.height);
    gradient.addColorStop(0, '#FFF9EF');
    gradient.addColorStop(0.6, '#F0FAF2');
    gradient.addColorStop(1, '#E2F3EA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
  }
}
