import { GameContext, GameInstance } from '../../core/types';
import { classifySwipe, PointerPoint, SwipeDirection, SwipeEvent } from '../../core/input/input';
import { Renderer } from '../../core/render/renderer';
import { createRng, hashString, Rng } from '../../core/rng';
import { drawPetal, Rect } from '../../shared/design-system/draw';
import { COLORS, RADIUS, SURFACE } from '../../shared/design-system/tokens';
import { inkRoundRect } from '../../shared/design-system/paint';
import { drawPaperPanel } from '../../shared/design-system/paper-ui';
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
import { endlessReward, roundReward } from './systems/rewards';
import { nextStarGap, starBarRatio } from './systems/progress';
import { tileTheme } from './systems/tiles';
import { BoardView } from './view/board-view';
import { BOARD_TOP_AFTER_HUD, HudState, match3HudTop, Match3Hud } from './view/hud';
import { ModeHit, ModeView } from './view/mode-view';
import { MATCH3_CAMPAIGN_BOARD, MATCH3_ENDLESS_BOARD } from '../../shared/content/leaderboards';
import { compactNumber, formatDuration } from '../../shared/format';

const ROWS = 6;
const COLS = 8;
const BOARD_WIDTH = 660;
const BOARD_PAD = 18;
const CELL_W = BOARD_WIDTH / COLS;
const CELL_H = 82.5;
const INTRO_SECONDS = 0.35;

type GameState = 'playing' | 'won' | 'lost';
export type Match3Mode = 'campaign' | 'endless';

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
  private choosing = true;
  private mode: Match3Mode = 'campaign';
  /** 无时间限制模式的成功交换次数，只做展示与埋点。 */
  private swaps = 0;
  private playSeconds = 0;
  private message = '';
  private messageUntil = 0;
  private pulse = 0;

  private readonly boardRect: Rect;
  private readonly view: BoardView;
  private readonly hud: Match3Hud;
  private readonly modes = new ModeView();
  private readonly tempo: TempoState = createTempo();
  private timer: RoundTimer;
  private startCountdown = INTRO_SECONDS;
  private timeUp = false;
  /** 目标分已达成：不再立刻结束，让玩家继续冲 2/3 星或手动结算。 */
  private targetReached = false;
  private lastTickSecond = 0;
  private tempoMax = 0;
  private coinsEarned = 0;
  private coinsAwarded = false;
  private firstClear = false;
  /** 无时间限制本局是否刷新了纪录，用于结果面板的「新纪录」。 */
  private endlessRecord = false;
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
    this.view.setTileSprites(tileTheme(this.tileStyle()).sprites);
    this.view.setBoard(this.board);
    this.view.playIntro();
    this.hud = new Match3Hud(ctx.renderer);
  }

  enter(): void {
    // 分包 BGM 存在就切过去；缺失时 AudioService 会回退到大厅 BGM。
    this.ctx.audio.playBgm('match3', 'games/match3/assets/bgm.mp3');
    this.ctx.analytics.track('match3_open', { game: 'match3' });
    void this.syncCloud();
  }

  exit(): void {
    if (!this.choosing && this.state === 'playing') {
      // 闯关已达标按胜利结算；无尽模式离开也把当前成绩落盘。
      if (this.mode === 'campaign' && this.targetReached) this.finishWin();
      else if (this.mode === 'endless') this.finishEndless();
    }
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
    if (this.choosing) return;

    this.view.update(dt);
    this.updateResultBursts(dt);
    if (this.state !== 'playing') return;

    // 入场动画期间不计时，避免开局白丢 0.3 秒。
    if (this.startCountdown > 0) {
      this.startCountdown = Math.max(0, this.startCountdown - dt);
      if (this.startCountdown === 0 && this.mode === 'campaign') startTimer(this.timer);
      return;
    }

    if (this.mode === 'campaign') {
      tickTimer(this.timer, dt);
      this.tickClock();
      if (timerExpired(this.timer)) {
        this.timeUp = true;
        if (!this.view.isBusy) this.finishRound();
      }
    } else {
      this.playSeconds += dt;
    }
    updateTempo(this.tempo, this.clock());
  }

  render(renderer: Renderer): void {
    if (this.choosing) {
      this.modes.render(
        renderer,
        this.saveData,
        this.ctx.profile.get().coins,
        this.tileStyle(),
        this.ctx.profile.get().cosmetics.ownedTiles,
        this.ctx.atlas,
        Date.now() < this.messageUntil ? this.message : '',
      );
      return;
    }

    const ctx = renderer.ctx;
    this.drawBackground(ctx, renderer);

    drawPaperPanel(
      ctx,
      {
        x: this.boardRect.x - BOARD_PAD,
        y: this.boardRect.y - BOARD_PAD,
        w: this.boardRect.w + BOARD_PAD * 2,
        h: this.boardRect.h + BOARD_PAD * 2,
      },
      { fill: COLORS.paper, radius: RADIUS.xl, stitch: true, seed: 911 },
    );

    this.drawBoardGrid(ctx);
    this.view.render(ctx, this.boardRect, this.pulse);
    // 连锁横幅放在棋盘内部顶端，避免压住上方的分数/时间卡。
    this.view.renderCombo(ctx, renderer.width / 2, this.boardRect.y + 34);

    this.hud.render(ctx, this.hudState());
  }

  onTap(x: number, y: number): void {
    if (this.choosing) {
      this.onChooserTap(x, y);
      return;
    }

    const hit = this.hud.hitTest(x, y);
    if (hit === 'back' || hit === 'home' || hit === 'modes') {
      this.ctx.feedback.tap();
      this.openChooser();
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
    if (hit === 'settle') {
      this.ctx.feedback.tap();
      this.settleNow();
      return;
    }

    // 棋盘点击不再用于交换：只认滑动。
  }

  onPress(point: PointerPoint): void {
    if (this.choosing) return;
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
    if (this.choosing || this.state !== 'playing') return;
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

    if (this.mode === 'endless') this.swaps += 1;

    // 以「成功交换开始」为节奏时间点：动画再长也不会吃掉玩家的 2 秒窗口。
    const streak = registerMatch(this.tempo, this.clock());
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

    if (this.mode === 'endless') {
      if (!hasPossibleMove(this.board)) this.reshuffle();
      return;
    }

    if (!this.targetReached && this.score >= this.level.target) {
      this.markTargetReached();
    }
    if (this.timeUp || timerExpired(this.timer)) {
      this.finishRound();
      return;
    }
    this.syncStarProgress();
    if (!hasPossibleMove(this.board)) this.reshuffle();
  }

  /** 冲星途中就把新星级落盘，中途退出也不会丢 2/3 星。 */
  private syncStarProgress(): void {
    if (this.mode !== 'campaign' || this.state !== 'playing' || !this.targetReached) return;
    const key = `${this.level.id}`;
    const stars = starsFor(this.level, this.score);
    if (stars <= (this.saveData.stars[key] ?? 0)) return;

    this.saveData.stars[key] = stars;
    this.recordBest();
    this.flash(stars >= 3 ? '三星达成！' : `${stars} 星达成！`, 2200);
    const cx = this.ctx.renderer.width / 2;
    const cy = this.boardRect.y + this.boardRect.h / 2;
    this.ctx.feedback.reward(cx, cy);
    this.ctx.feedback.burst('sparkle', cx, cy - 110, 1.2);
  }

  private markTargetReached(): void {
    this.targetReached = true;
    const key = `${this.level.id}`;
    this.firstClear = (this.saveData.stars[key] ?? 0) === 0;

    // 达成目标就算过关：先落盘星级与解锁，避免中途退出丢进度。
    const stars = starsFor(this.level, this.score);
    this.saveData.stars[key] = Math.max(this.saveData.stars[key] ?? 0, stars);
    this.saveData.unlockedLevel = Math.max(
      this.saveData.unlockedLevel,
      Math.min(this.level.id + 1, LEVELS.length),
    );
    this.saveData.bestScore = Math.max(this.saveData.bestScore, this.score);
    this.save();

    const cx = this.ctx.renderer.width / 2;
    const cy = this.boardRect.y + this.boardRect.h / 2;
    this.ctx.feedback.reward(cx, cy);
    this.ctx.feedback.burst('sparkle', cx, cy - 130, 1.4);
    this.flash('目标达成！继续冲三星，或点「提前结算」', 3200);
  }

  private settleNow(): void {
    if (this.state !== 'playing' || !this.targetReached) return;
    this.finishWin();
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
    const stars = starsFor(this.level, this.score);
    const key = `${this.level.id}`;
    // 达成目标时已经算过 firstClear，这里不能因为星级已落盘而误判成「不是首通」。
    if (!this.targetReached) {
      this.targetReached = this.score >= this.level.target;
      this.firstClear = (this.saveData.stars[key] ?? 0) === 0;
    }

    this.recordBest();
    this.saveData.wins += 1;
    this.saveData.stars[key] = Math.max(this.saveData.stars[key] ?? 0, stars);
    this.saveData.unlockedLevel = Math.max(
      this.saveData.unlockedLevel,
      Math.min(this.level.id + 1, LEVELS.length),
    );

    this.awardCoins(true, stars);
    this.save();
    this.ctx.analytics.track('level_complete', {
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

  private finishEndless(): void {
    if (this.state !== 'playing') return;
    stopTimer(this.timer);
    this.state = 'won';
    this.endlessRecord = this.score > this.saveData.endlessBest;
    this.saveData.endlessBest = Math.max(this.saveData.endlessBest, this.score);
    const seconds = Math.floor(this.playSeconds);
    this.saveData.endlessBestSeconds = Math.max(this.saveData.endlessBestSeconds, seconds);
    this.save();
    if (!this.coinsAwarded) {
      this.coinsAwarded = true;
      this.coinsEarned = endlessReward(this.score);
      this.ctx.profile.addCoins(this.coinsEarned);
      this.ctx.feedback.coin(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2 + 180);
    }
    this.ctx.feedback.win(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
    this.ctx.analytics.track('endless_complete', {
      game: 'match3',
      score: this.score,
      seconds,
      swaps: this.swaps,
      tempoMax: this.tempoMax,
    });
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
    this.ctx.analytics.track('level_fail', {
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

  /** 失败局的高分也应进入最佳与排行榜。 */
  private recordBest(): void {
    this.saveData.bestScore = Math.max(this.saveData.bestScore, this.score);
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

  private onChooserTap(x: number, y: number): void {
    const hit = this.modes.hitTest(x, y);
    if (!hit) return;
    if (hit.kind === 'back') {
      this.ctx.feedback.tap();
      this.ctx.exitGame();
      return;
    }
    if (hit.kind === 'campaign') {
      this.ctx.feedback.tap();
      this.choosing = false;
      this.startCampaign();
      return;
    }
    if (hit.kind === 'endless') {
      this.ctx.feedback.tap();
      this.choosing = false;
      this.startEndless();
      return;
    }
    this.equipTileFromChooser(hit);
  }

  private equipTileFromChooser(hit: ModeHit & { kind: 'skin' }): void {
    const owned = this.ctx.profile.get().cosmetics.ownedTiles.includes(hit.id);
    if (!owned) {
      const skin = tileTheme(hit.id);
      this.ctx.feedback.invalid();
      this.flash(
        skin.unlockHint ? `${skin.unlockHint}后即可使用` : '去王都小铺的「方块」页购买这套皮肤',
        2400,
      );
      return;
    }
    this.ctx.profile.equipTile(hit.id);
    this.view.setTileSprites(tileTheme(hit.id).sprites);
    this.ctx.feedback.select();
    this.flash('已换上这套方块，下一局生效', 1600);
  }

  private startCampaign(): void {
    this.mode = 'campaign';
    this.startLevel(this.saveData.unlockedLevel, false);
  }

  private startEndless(): void {
    this.mode = 'endless';
    this.level = {
      id: 0,
      title: '无尽模式',
      seconds: 0,
      target: 0,
      colors: 5,
    };
    this.rng = createRng((Date.now() ^ hashString(`${this.ctx.gameId}:endless`)) >>> 0);
    this.beginRound();
    this.ctx.analytics.track('endless_start', { game: 'match3' });
  }

  private openChooser(): void {
    if (this.state === 'playing' && this.mode === 'campaign' && this.targetReached) {
      this.finishWin();
    } else if (this.state === 'playing' && this.mode === 'endless') {
      this.finishEndless();
    }
    stopTimer(this.timer);
    this.ctx.tweens.clear();
    this.view.skipAll();
    this.resultBursts = [];
    this.ctx.particles.clear();
    this.choosing = true;
    this.message = '';
  }

  private reset(): void {
    if (this.mode === 'endless') this.startEndless();
    else this.startLevel(this.level.id, true);
  }

  private startLevel(levelId: number, retry: boolean): void {
    this.mode = 'campaign';
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
    this.view.setTileSprites(tileTheme(this.tileStyle()).sprites);
    this.board = createBoard(ROWS, COLS, this.level.colors, this.rng);
    this.view.setBoard(this.board);
    this.view.playIntro();
    this.score = 0;
    this.swaps = 0;
    this.playSeconds = 0;
    this.timer = createTimer(this.level.seconds);
    this.startCountdown = INTRO_SECONDS;
    this.timeUp = false;
    this.targetReached = false;
    this.lastTickSecond = 0;
    this.state = 'playing';
    this.message = '';
    this.tempoMax = 0;
    this.coinsEarned = 0;
    this.coinsAwarded = false;
    this.endlessRecord = false;
    this.firstClear = false;
    clearTempo(this.tempo);
    this.ctx.particles.clear();
    this.ctx.feedback.resetCombo();
  }

  private tileStyle(): string {
    return this.ctx.profile.get().cosmetics.tileStyle;
  }

  private clock(): number {
    return this.mode === 'campaign' ? this.timer.elapsed : this.playSeconds;
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
    const board = this.mode === 'campaign' ? MATCH3_CAMPAIGN_BOARD : MATCH3_ENDLESS_BOARD;
    const result = await this.ctx.cloud.submitScore(
      board,
      this.score,
      this.mode === 'campaign' ? this.level.id : this.swaps,
      this.ctx.profile.get().displayName,
    );
    if (result && !this.choosing) this.flash(`最高分第 ${result.rank} 名`);
    await this.syncCloud();
  }

  private flash(text: string, ms = 1400): void {
    this.message = text;
    this.messageUntil = Date.now() + ms;
  }

  private hudState(): HudState {
    const theme = tileTheme(this.tileStyle());
    const endless = this.mode === 'endless';
    const best = endless ? this.saveData.endlessBest : this.saveData.bestScore;
    const stars = endless ? 0 : starsFor(this.level, this.score);
    const gap = endless ? null : nextStarGap(this.level, this.score);

    return {
      title: endless ? '王都三消 · 无尽' : '王都三消',
      subtitle: endless
        ? `无时间限制 · 不计时 · ${theme.name} · 最佳 ${compactNumber(best)}`
        : `第 ${this.level.id} 关 · ${this.level.title} · ${theme.name} · 最佳 ${best}`,
      mode: this.mode,
      swaps: this.swaps,
      elapsedSeconds: Math.floor(this.playSeconds),
      score: this.score,
      target: this.level.target,
      progress: this.level.target > 0 ? this.score / this.level.target : 0,
      barProgress: endless ? 0 : starBarRatio(this.level, this.score),
      stars,
      targetReached: this.targetReached,
      nextStarAt: gap?.at ?? null,
      phase: this.state,
      hasNext: !endless && this.state === 'won' && this.level.id < LEVELS.length,
      pulse: this.pulse,
      message: Date.now() < this.messageUntil ? this.message : '',
      boardTop: this.boardRect.y,
      boardBottom: this.boardRect.y + this.boardRect.h,
      clock: endless ? formatDuration(this.playSeconds) : formatClock(this.timer.remaining),
      seconds: endless ? 0 : this.timer.remaining,
      totalSeconds: endless ? 0 : this.timer.total,
      tempo: this.tempo.streak,
      tempoWindow: this.tempo.windowLeft / TEMPO_WINDOW,
      reducedMotion: this.ctx.quality.reducedMotion,
      liveCoins: endless ? endlessReward(this.score) : undefined,
      coinsEarned: this.coinsEarned,
      coinBalance: this.ctx.profile.get().coins,
      bestScore: best,
      bestSeconds: this.saveData.endlessBestSeconds,
      isRecord: endless && this.endlessRecord,
      outfit: this.ctx.profile.get().cosmetics.royalOutfit as
        'classic' | 'garden' | 'winter' | 'starlight',
    };
  }

  private drawBoardGrid(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.boardRect;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const alternating = (r + c) % 2 === 0;
        inkRoundRect(
          ctx,
          x + c * CELL_W + 3,
          y + r * CELL_H + 3,
          CELL_W - 6,
          CELL_H - 6,
          14,
          alternating ? 'rgba(168,230,207,0.26)' : 'rgba(255,246,233,0.64)',
          {
            stroke: 'rgba(58,46,42,0.10)',
            width: 1.2,
            seed: 921 + r * COLS + c,
            wobble: 0.25,
          },
        );
      }
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
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(renderer.width - 110, renderer.safeTop + 96, 82, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = 'rgba(58,46,42,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

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
    ctx.globalAlpha = 0.18;
    drawPetal(ctx, 68, renderer.safeTop + 250, 9, COLORS.petal);
    drawPetal(ctx, 112, renderer.safeTop + 310, 6, COLORS.honey);
    drawPetal(ctx, renderer.width - 58, renderer.safeTop + 330, 7, COLORS.berry);
    ctx.restore();
  }
}
