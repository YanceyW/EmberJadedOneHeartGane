import { GameContext, GameInstance } from '../../core/types';
import { classifySwipe, PointerPoint, SwipeDirection, SwipeEvent } from '../../core/input/input';
import { Renderer } from '../../core/render/renderer';
import { createRng, hashString, Rng } from '../../core/rng';
import { drawPanel, Rect } from '../../shared/design-system/draw';
import { COLORS, RADIUS, SURFACE } from '../../shared/design-system/tokens';
import {
  Board,
  Cell,
  EMPTY,
  createBoard,
  findMatches,
  hasPossibleMove,
  resolveWithReport,
  ResolveStep,
  swapCells,
} from './systems/board';
import { LEVELS, levelById, Match3Level, starsFor } from './data/levels';
import { DAILY_SECONDS, DAILY_TARGET, dailySeed } from './data/daily';
import {
  RoundTimer,
  TEMPO_WINDOW,
  TempoState,
  clearTempo,
  createTempo,
  createTimer,
  formatClock,
  registerMatch,
  startTimer,
  stopTimer,
  tempoLabel,
  tempoMultiplier,
  tickTimer,
  timerExpired,
  updateTempo,
} from './systems/tempo';
import { Match3Save, mergeSaves, migrateSave } from './systems/save';
import { roundReward } from './systems/rewards';
import { BoardView } from './view/board-view';
import { BOARD_TOP_AFTER_HUD, HudState, match3HudTop, Match3Hud } from './view/hud';

const ROWS = 6;
const COLS = 8;
const BOARD_WIDTH = 660;
const BOARD_PAD = 18;
const CELL_W = BOARD_WIDTH / COLS;
const CELL_H = 82.5;
const INTRO_SECONDS = 0.35;

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
  private score = 0;
  private state: GameState = 'playing';
  private daily = false;
  private message = '';
  private messageUntil = 0;
  private pulse = 0;

  private readonly boardRect: Rect;
  private readonly view: BoardView;
  private readonly hud: Match3Hud;
  private readonly tempo: TempoState = createTempo();
  private timer: RoundTimer;
  private startCountdown = INTRO_SECONDS;
  private timeUp = false;
  private lastTickSecond = 0;
  private tempoMax = 0;
  private coinsEarned = 0;
  private coinsAwarded = false;
  private firstClear = false;
  private resultBursts: Array<{ at: number; dx: number }> = [];
  private bgGradient: CanvasGradient | null = null;

  constructor(private readonly ctx: GameContext) {
    this.saveData = migrateSave(ctx.storage.get<unknown>('save:match3', null));
    this.level = levelById(this.saveData.unlockedLevel);
    this.rng = createRng((Date.now() ^ hashString(ctx.gameId) ^ this.level.id) >>> 0);
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.timer = createTimer(this.level.seconds);

    this.boardRect = {
      x: 45,
      y: match3HudTop(ctx.renderer) + BOARD_TOP_AFTER_HUD,
      w: BOARD_WIDTH,
      h: CELL_H * ROWS,
    };

    this.view = new BoardView(ctx.tweens, ctx.atlas);
    this.view.configure(ROWS, COLS, CELL_W, CELL_H);
    this.view.setReducedMotion(ctx.quality.reducedMotion);
    this.view.setBoard(this.board);
    this.view.playIntro();
    this.hud = new Match3Hud(ctx.renderer);
  }

  enter(): void {
    // 分包 BGM 存在就切过去；缺失时 AudioService 会回退到大厅 BGM。
    this.ctx.audio.playBgm('match3', 'games/match3/assets/bgm.mp3');
    this.ctx.analytics.track('level_start', {
      game: 'match3',
      level: this.level.id,
      daily: this.daily,
      seconds: this.level.seconds,
      target: this.level.target,
    });
    void this.syncCloud();
  }

  exit(): void {
    stopTimer(this.timer);
    // 取消未完成的消除/下落动画，避免退出后回调再改状态。
    this.ctx.tweens.clear();
    this.resultBursts = [];
    this.view.skipAll();
    this.save();
    void this.syncCloud();
    this.ctx.particles.clear();
    this.ctx.feedback.resetCombo();
  }

  update(dt: number): void {
    this.pulse += dt;
    this.view.update(dt);
    this.updateResultBursts(dt);
    if (this.state !== 'playing') return;

    // 入场动画期间不计时，避免开局白丢 0.3 秒。
    if (this.startCountdown > 0) {
      this.startCountdown = Math.max(0, this.startCountdown - dt);
      if (this.startCountdown === 0) startTimer(this.timer);
      return;
    }

    tickTimer(this.timer, dt);
    updateTempo(this.tempo, this.timer.elapsed);
    this.tickClock();

    if (timerExpired(this.timer)) {
      this.timeUp = true;
      if (!this.view.isBusy) this.finishRound();
    }
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

    this.drawBoardGrid(ctx);
    this.view.render(ctx, this.boardRect, this.pulse);
    // 连锁横幅放在棋盘内部顶端，避免压住上方的分数/时间卡。
    this.view.renderCombo(ctx, renderer.width / 2, this.boardRect.y + 34);

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

    // 棋盘点击不再用于交换：只认滑动。
  }

  onPress(point: PointerPoint): void {
    const hudHit = this.hud.hitTest(point.x, point.y);
    if (hudHit) {
      this.hud.setPressed(hudHit);
      return;
    }
    if (this.state !== 'playing' || this.view.isBusy) return;
    const cell = this.cellAt(point.x, point.y);
    if (!cell || this.board[cell.r][cell.c] === EMPTY) return;
    this.view.setPress(cell);
    this.ctx.feedback.press();
  }

  onDrag(point: PointerPoint): void {
    if (this.state !== 'playing') return;
    this.view.dragPress(point.x, point.y);
  }

  onRelease(): void {
    this.hud.clearPressed();
    this.view.clearPress();
  }

  onSwipe(event: SwipeEvent): void {
    if (this.state !== 'playing' || this.view.isBusy) return;
    const from = this.cellAt(event.x, event.y);
    if (!from) return;
    const dir = classifySwipe(event.dx, event.dy);
    if (!dir) return;

    this.view.clearPress();
    this.view.showSwipeGuide(from, dir);
    const to = this.neighbor(from, dir);
    if (!to || this.board[to.r][to.c] === EMPTY) {
      this.ctx.feedback.invalid(this.cellCenterX(from), this.cellCenterY(from));
      this.view.playNudge(from, dir);
      this.flash('这边没有可以交换的方块');
      return;
    }

    this.trySwap(from, to);
  }

  private cellAt(x: number, y: number): Cell | null {
    if (!this.insideBoard(x, y)) return null;
    const c = Math.floor((x - this.boardRect.x) / CELL_W);
    const r = Math.floor((y - this.boardRect.y) / CELL_H);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  private neighbor(cell: Cell, dir: SwipeDirection): Cell | null {
    const next = { ...cell };
    if (dir === 'up') next.r -= 1;
    else if (dir === 'down') next.r += 1;
    else if (dir === 'left') next.c -= 1;
    else next.c += 1;
    if (next.r < 0 || next.r >= ROWS || next.c < 0 || next.c >= COLS) return null;
    return next;
  }

  private cellCenterX(cell: Cell): number {
    return this.boardRect.x + (cell.c + 0.5) * CELL_W;
  }

  private cellCenterY(cell: Cell): number {
    return this.boardRect.y + (cell.r + 0.5) * CELL_H;
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
      this.view.playInvalid(a, b);
      return;
    }

    // 以「成功交换开始」为节奏时间点：动画再长也不会吃掉玩家的 2 秒窗口。
    const streak = registerMatch(this.tempo, this.timer.elapsed);
    this.tempoMax = Math.max(this.tempoMax, streak);
    const multiplier = tempoMultiplier(streak);
    const report = resolveWithReport(this.board, this.level.colors, this.rng);

    this.view.beginMove(
      pre,
      a,
      b,
      report,
      this.board,
      () => this.ctx.feedback.tap(),
      (step) => this.onStep(step, streak, multiplier),
      () => this.onMoveComplete(),
    );
  }

  private onStep(step: ResolveStep, streak: number, multiplier: number): void {
    const gained = Math.max(1, Math.round(step.gained * multiplier));
    this.score += gained;

    let sx = 0;
    let sy = 0;
    for (const cell of step.cleared) {
      sx += this.boardRect.x + (cell.c + 0.5) * CELL_W;
      sy += this.boardRect.y + (cell.r + 0.5) * CELL_H;
    }
    const count = Math.max(1, step.cleared.length);
    const cx = sx / count;
    const cy = sy / count;

    this.view.showScore(`+${gained}`, cx, cy, streak > 1 ? COLORS.gold : COLORS.jade);
    if (step.index > 1 || streak > 1) {
      const tempoPart = streak > 1 ? ` · ${tempoLabel(streak)}` : '';
      const label =
        step.index > 1
          ? `连锁 x${step.index}${tempoPart} +${gained}`
          : `${tempoLabel(streak)} +${gained}`;
      this.view.showCombo(label);
      this.ctx.tweens.setTimeScale(
        Math.max(0.7, 1 - (step.index - 1) * 0.12 - (streak - 1) * 0.03),
      );
    }

    this.ctx.feedback.match(step.index, cx, cy, streak);
    if (step.cleared.length >= 5) this.ctx.feedback.burst('sugar', cx, cy, 0.9);
    if (streak >= 3 && step.index === 1) this.ctx.feedback.burst('ring', cx, cy, 1);
  }

  private onMoveComplete(): void {
    this.ctx.tweens.setTimeScale(1);

    if (this.score >= this.level.target) {
      this.finishWin();
      return;
    }
    if (this.timeUp || timerExpired(this.timer)) {
      this.finishLose();
      return;
    }
    if (!hasPossibleMove(this.board)) this.reshuffle();
  }

  private reshuffle(): void {
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.view.setBoard(this.board);
    this.view.playIntro();
    this.flash('没有可交换的组合，重新洗牌');
    clearTempo(this.tempo);
    this.ctx.feedback.drop(
      this.boardRect.x + this.boardRect.w / 2,
      this.boardRect.y + this.boardRect.h / 2,
    );
  }

  private finishRound(): void {
    if (this.state !== 'playing') return;
    if (this.score >= this.level.target) this.finishWin();
    else this.finishLose();
  }

  private tickClock(): void {
    const second = Math.ceil(this.timer.remaining);
    if (second <= 10 && second > 0 && second !== this.lastTickSecond) {
      this.lastTickSecond = second;
      this.ctx.feedback.tick();
    }
  }

  private finishWin(): void {
    if (this.state !== 'playing') return;
    stopTimer(this.timer);
    this.state = 'won';
    const stars = this.daily ? 0 : starsFor(this.level, this.score);
    const key = `${this.level.id}`;
    this.firstClear = this.daily
      ? this.saveData.dailyDate !== this.ctx.time.todayKey()
      : (this.saveData.stars[key] ?? 0) === 0;

    this.recordBest();
    this.saveData.wins += 1;

    if (!this.daily) {
      this.saveData.stars[key] = Math.max(this.saveData.stars[key] ?? 0, stars);
      this.saveData.unlockedLevel = Math.max(
        this.saveData.unlockedLevel,
        Math.min(this.level.id + 1, LEVELS.length),
      );
    }

    this.awardCoins(true, stars);
    this.save();
    this.ctx.analytics.track(this.daily ? 'daily_complete' : 'level_complete', {
      game: 'match3',
      level: this.level.id,
      score: this.score,
      tempoMax: this.tempoMax,
      secondsLeft: Math.round(this.timer.remaining),
    });

    const cx = this.ctx.renderer.width / 2;
    const cy = this.ctx.renderer.height / 2;
    this.ctx.feedback.win(cx, cy);
    this.celebrateStars();
    void this.submitScore();
  }

  private finishLose(): void {
    if (this.state !== 'playing') return;
    stopTimer(this.timer);
    this.state = 'lost';
    this.firstClear = false;
    this.recordBest();
    this.awardCoins(false, 0);
    this.ctx.feedback.fail();
    this.ctx.analytics.track(this.daily ? 'daily_fail' : 'level_fail', {
      game: 'match3',
      level: this.level.id,
      score: this.score,
      reason: 'time',
      tempoMax: this.tempoMax,
    });
    void this.submitScore();
  }

  private awardCoins(won: boolean, stars: number): void {
    if (this.coinsAwarded) return;
    this.coinsAwarded = true;
    const reward = roundReward({
      score: this.score,
      target: this.level.target,
      daily: this.daily,
      firstClear: this.firstClear,
      stars,
      won,
    });
    this.coinsEarned = reward.total;
    if (reward.total > 0) {
      this.ctx.profile.addCoins(reward.total);
      this.ctx.feedback.coin(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2 + 180);
    }
  }

  /** 时间制下，失败局的高分也应进入最佳与排行榜。 */
  private recordBest(): void {
    this.saveData.bestScore = Math.max(this.saveData.bestScore, this.score);
    if (this.daily) {
      const today = this.ctx.time.todayKey();
      const previous = this.saveData.dailyDate === today ? this.saveData.dailyBest : 0;
      this.saveData.dailyDate = today;
      this.saveData.dailyBest = Math.max(previous, this.score);
    }
    this.save();
  }

  /** 星星逐个弹出 + 星屑，成本低但仪式感明显。 */
  private celebrateStars(): void {
    if (this.ctx.quality.reducedMotion) return;
    this.resultBursts = [-1, 0, 1].map((dx, index) => ({
      at: 0.12 + index * 0.09,
      dx: dx * 92,
    }));
  }

  private updateResultBursts(dt: number): void {
    if (this.resultBursts.length === 0) return;
    const cx = this.ctx.renderer.width / 2;
    const cy = this.ctx.renderer.height / 2;
    const remaining: Array<{ at: number; dx: number }> = [];
    for (const burst of this.resultBursts) {
      burst.at -= dt;
      if (burst.at <= 0) {
        this.ctx.feedback.burst('sparkle', cx + burst.dx, cy - 50, 0.9);
      } else {
        remaining.push(burst);
      }
    }
    this.resultBursts = remaining;
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
      seconds: DAILY_SECONDS,
      target: DAILY_TARGET,
      colors: 5,
    };
    this.rng = createRng(dailySeed(this.ctx.time.todayKey()));
    this.beginRound();
    this.flash('每日挑战：每天固定棋盘');
    this.ctx.analytics.track('daily_start', {
      game: 'match3',
      seconds: this.level.seconds,
      target: this.level.target,
    });
  }

  private startLevel(levelId: number, retry: boolean): void {
    this.daily = false;
    this.level = levelById(levelId);
    this.rng = createRng((Date.now() ^ hashString(`${this.ctx.gameId}:${this.level.id}`)) >>> 0);
    this.beginRound();
    this.ctx.analytics.track('level_start', {
      game: 'match3',
      level: this.level.id,
      retry,
      seconds: this.level.seconds,
      target: this.level.target,
    });
  }

  private beginRound(): void {
    // 换局时直接丢弃旧动画，不触发 onComplete，避免旧棋盘覆盖新棋盘。
    this.ctx.tweens.clear();
    this.ctx.tweens.setTimeScale(1);
    this.resultBursts = [];
    this.view.skipAll();
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.view.setBoard(this.board);
    this.view.playIntro();
    this.score = 0;
    this.timer = createTimer(this.level.seconds);
    this.startCountdown = INTRO_SECONDS;
    this.timeUp = false;
    this.lastTickSecond = 0;
    this.state = 'playing';
    this.message = '';
    this.tempoMax = 0;
    this.coinsEarned = 0;
    this.coinsAwarded = false;
    this.firstClear = false;
    clearTempo(this.tempo);
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
    const result = await this.ctx.cloud.submitScore(
      'match3',
      this.score,
      this.level.id,
      this.ctx.profile.get().displayName,
    );
    if (result) this.flash(`最高分第 ${result.rank} 名`);
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
        ? `每天固定棋盘 · 目标 ${this.level.target} · 最佳 ${best}`
        : `第 ${this.level.id} 关 · ${this.level.title} · 最佳 ${best}`,
      score: this.score,
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
      clock: formatClock(this.timer.remaining),
      seconds: this.timer.remaining,
      totalSeconds: this.timer.total,
      tempo: this.tempo.streak,
      tempoWindow: this.tempo.windowLeft / TEMPO_WINDOW,
      reducedMotion: this.ctx.quality.reducedMotion,
      coinsEarned: this.coinsEarned,
      coinBalance: this.ctx.profile.get().coins,
      outfit: this.ctx.profile.get().cosmetics.royalOutfit as
        'classic' | 'garden' | 'winter' | 'starlight',
    };
  }

  private drawBoardGrid(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.boardRect;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(168,230,207,0.18)' : 'rgba(255,253,248,0.5)';
        ctx.fillRect(x + c * CELL_W + 2, y + r * CELL_H + 2, CELL_W - 4, CELL_H - 4);
      }
    }
    ctx.strokeStyle = 'rgba(58,46,42,0.07)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c += 1) {
      ctx.beginPath();
      ctx.moveTo(x + c * CELL_W, y);
      ctx.lineTo(x + c * CELL_W, y + h);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r += 1) {
      ctx.beginPath();
      ctx.moveTo(x, y + r * CELL_H);
      ctx.lineTo(x + w, y + r * CELL_H);
      ctx.stroke();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, renderer: Renderer): void {
    if (!this.bgGradient) {
      const gradient = ctx.createLinearGradient(0, 0, 0, renderer.height);
      gradient.addColorStop(0, SURFACE.top);
      gradient.addColorStop(0.6, SURFACE.mid);
      gradient.addColorStop(1, SURFACE.bottom);
      this.bgGradient = gradient;
    }
    ctx.fillStyle = this.bgGradient;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.arc(renderer.width - 110, renderer.safeTop + 96, 82, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = COLORS.paper;
    const cloudX = renderer.width - 214;
    const cloudY = renderer.safeTop + 188;
    const parts: Array<[number, number, number]> = [
      [0, 0, 30],
      [34, -12, 38],
      [72, 2, 28],
      [34, 9, 30],
    ];
    for (const [dx, dy, radius] of parts) {
      ctx.beginPath();
      ctx.arc(cloudX + dx, cloudY + dy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
