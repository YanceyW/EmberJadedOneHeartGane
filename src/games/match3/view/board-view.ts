import { TweenManager } from '../../../core/anim/tween';
import { Easing } from '../../../core/anim/easing';
import { SwipeDirection } from '../../../core/input/input';
import { DURATION } from '../../../shared/design-system/motion';
import { SpriteAtlas, SpriteId } from '../../../shared/design-system/sprite-atlas';
import { COLORS, FONT } from '../../../shared/design-system/tokens';
import { drawText, fillRoundRect, Rect } from '../../../shared/design-system/draw';
import { Cell, ResolveReport, ResolveStep } from '../systems/board';
import { TILE_THEMES } from '../systems/tiles';

const INTRO_DURATION = DURATION.slow;
const INTRO_ROW_DELAY = 0.015;
const PRESS_DRAG_LIMIT = 10;

interface Ghost {
  r: number;
  c: number;
  value: number;
  scale: number;
  alpha: number;
}

interface ScorePopup {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
}

interface GuideState {
  r: number;
  c: number;
  dx: number;
  dy: number;
  life: number;
  max: number;
}

export interface BoardGeometry {
  rows: number;
  cols: number;
  cellW: number;
  cellH: number;
}

/**
 * 棋盘表现层：只负责「把事件流画成动画」，不参与任何判定。
 *
 * 动画数据用定长数组按格子索引存放（dx/dy 以格为单位），
 * 因此不会每帧创建对象；skipAll() 可随时直接落到终态。
 */
export class BoardView {
  private geometry: BoardGeometry = { rows: 6, cols: 8, cellW: 82.5, cellH: 82.5 };
  private display: number[][] = [];
  private dx: number[] = [];
  private dy: number[] = [];
  private scaleX: number[] = [];
  private scaleY: number[] = [];
  private alpha: number[] = [];
  private flash: number[] = [];
  private ghosts: Ghost[] = [];
  private popups: ScorePopup[] = [];
  private guide: GuideState | null = null;
  private press: Cell | null = null;
  private pressX = 0;
  private pressY = 0;
  private comboLabel = '';
  private comboUntil = 0;
  private comboScale = 1;
  private busy = false;
  private staticBoard: number[][] | null = null;
  private introActive = false;
  private introElapsed = 0;
  private reducedMotion = false;
  private rect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private tileSprites: readonly SpriteId[] = TILE_THEMES.sweets.sprites;

  constructor(
    private readonly tweens: TweenManager,
    private readonly atlas: SpriteAtlas,
  ) {}

  configure(rows: number, cols: number, cellW: number, cellH: number): void {
    this.geometry = { rows, cols, cellW, cellH };
    this.resetVisuals();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  /** 换关时切主题：值 0–4 不变，只映射到不同场馆的方块。 */
  setTileSprites(sprites: readonly SpriteId[]): void {
    if (sprites.length > 0) this.tileSprites = sprites;
  }

  private get cellCount(): number {
    return this.geometry.rows * this.geometry.cols;
  }

  private index(r: number, c: number): number {
    return r * this.geometry.cols + c;
  }

  private resetVisuals(): void {
    const count = this.cellCount;
    this.dx = new Array<number>(count).fill(0);
    this.dy = new Array<number>(count).fill(0);
    this.scaleX = new Array<number>(count).fill(1);
    this.scaleY = new Array<number>(count).fill(1);
    this.alpha = new Array<number>(count).fill(1);
    this.flash = new Array<number>(count).fill(0);
  }

  setBoard(board: number[][]): void {
    this.display = board.map((row) => [...row]);
    this.ghosts = [];
    this.popups.length = 0;
    this.guide = null;
    this.clearPress();
    this.resetVisuals();
    this.busy = false;
    this.introActive = false;
    this.staticBoard = board.map((row) => [...row]);
  }

  /** 开局 / 洗牌：从上方逐行落入，skipAll 可直接落终态。 */
  playIntro(): void {
    if (this.geometry.rows === 0) return;
    if (this.reducedMotion) {
      this.introActive = false;
      this.dy.fill(0);
      this.busy = false;
      return;
    }
    this.introActive = true;
    this.introElapsed = 0;
    this.busy = true;
    for (let r = 0; r < this.geometry.rows; r += 1) {
      for (let c = 0; c < this.geometry.cols; c += 1) {
        this.dy[this.index(r, c)] = -(r + 2);
      }
    }
  }

  update(dt: number): void {
    if (this.introActive) {
      this.introElapsed += dt;
      for (let r = 0; r < this.geometry.rows; r += 1) {
        const start = r * INTRO_ROW_DELAY;
        const t = Math.min(1, Math.max(0, (this.introElapsed - start) / INTRO_DURATION));
        const eased = Easing.outCubic(t);
        for (let c = 0; c < this.geometry.cols; c += 1) {
          this.dy[this.index(r, c)] = -(r + 2) * (1 - eased);
        }
      }
      const total = INTRO_DURATION + (this.geometry.rows - 1) * INTRO_ROW_DELAY;
      if (this.introElapsed >= total) {
        this.introActive = false;
        this.dy.fill(0);
        this.busy = false;
      }
    }

    if (this.guide) {
      this.guide.life -= dt;
      if (this.guide.life <= 0) this.guide = null;
    }

    let write = 0;
    for (let i = 0; i < this.popups.length; i += 1) {
      const popup = this.popups[i];
      popup.life -= dt;
      if (!this.reducedMotion) popup.y -= 58 * dt;
      if (popup.life > 0) this.popups[write++] = popup;
    }
    this.popups.length = write;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get comboText(): string {
    return Date.now() < this.comboUntil ? this.comboLabel : '';
  }

  get popupCount(): number {
    return this.popups.length;
  }

  get hasGuide(): boolean {
    return this.guide !== null;
  }

  get pressCell(): Cell | null {
    return this.press;
  }

  setPress(cell: Cell): void {
    this.press = cell;
    this.pressX = 0;
    this.pressY = 0;
  }

  dragPress(x: number, y: number): void {
    const cell = this.press;
    if (!cell) return;
    const { cellW, cellH } = this.geometry;
    const cx = this.rect.x + (cell.c + 0.5) * cellW;
    const cy = this.rect.y + (cell.r + 0.5) * cellH;
    this.pressX = Math.max(-PRESS_DRAG_LIMIT, Math.min(PRESS_DRAG_LIMIT, x - cx));
    this.pressY = Math.max(-PRESS_DRAG_LIMIT, Math.min(PRESS_DRAG_LIMIT, y - cy));
  }

  clearPress(): void {
    this.press = null;
    this.pressX = 0;
    this.pressY = 0;
  }

  /** 朝界外 / 空格滑动时的轻推反馈，比单纯报错更容易理解。 */
  playNudge(cell: Cell, dir: SwipeDirection): void {
    const i = this.index(cell.r, cell.c);
    if (i < 0) return;
    const vector: Record<SwipeDirection, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    const [vx, vy] = vector[dir];
    this.busy = true;
    this.tweens.to({
      duration: this.reducedMotion ? DURATION.instant : DURATION.fast,
      easing: Easing.outQuad,
      onUpdate: (t) => {
        const offset = Math.sin(Math.PI * t) * 0.08;
        this.dx[i] = vx * offset;
        this.dy[i] = vy * offset;
      },
      onComplete: () => {
        this.dx[i] = 0;
        this.dy[i] = 0;
        this.busy = false;
      },
    });
  }

  /** 滑动手势的短箭头提示，让玩家立刻知道朝哪边生效。 */
  showSwipeGuide(from: Cell, dir: SwipeDirection): void {
    const vector: Record<SwipeDirection, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    const [dx, dy] = vector[dir];
    const life = this.reducedMotion ? DURATION.fast : 0.14;
    this.guide = { r: from.r, c: from.c, dx, dy, life, max: life };
  }

  showScore(text: string, x: number, y: number, color: string): void {
    const life = this.reducedMotion ? DURATION.fast : DURATION.ceremony;
    this.popups.push({ text, x, y, life, max: life, color });
    if (this.popups.length > 14) this.popups.shift();
  }

  /** 交换：两块沿直线互换（board 已是交换后的状态，靠偏移表现「从对方位置过来」）。 */
  playSwap(a: Cell, b: Cell, onDone: () => void): void {
    this.busy = true;
    const ai = this.index(a.r, a.c);
    const bi = this.index(b.r, b.c);
    const ax = b.c - a.c;
    const ay = b.r - a.r;

    this.tweens.to({
      duration: this.reducedMotion ? DURATION.instant : DURATION.fast,
      easing: Easing.outCubic,
      onUpdate: (t) => {
        this.dx[ai] = ax * (1 - t);
        this.dy[ai] = ay * (1 - t);
        this.dx[bi] = -ax * (1 - t);
        this.dy[bi] = -ay * (1 - t);
      },
      onComplete: () => {
        this.dx[ai] = 0;
        this.dy[ai] = 0;
        this.dx[bi] = 0;
        this.dy[bi] = 0;
        this.busy = false;
        onDone();
      },
    });
  }

  /** 非法交换：先探出去一点再弹回，幅度很小，不做红屏。 */
  playInvalid(a: Cell, b: Cell): void {
    this.busy = true;
    const ai = this.index(a.r, a.c);
    const bi = this.index(b.r, b.c);
    const ax = b.c - a.c;
    const ay = b.r - a.r;

    this.tweens.to({
      duration: this.reducedMotion ? DURATION.instant : DURATION.base,
      easing: Easing.outQuad,
      onUpdate: (t) => {
        const offset = Math.sin(Math.PI * t) * 0.14;
        this.dx[ai] = ax * offset;
        this.dy[ai] = ay * offset;
        this.dx[bi] = -ax * offset;
        this.dy[bi] = -ay * offset;
      },
      onComplete: () => {
        this.dx[ai] = 0;
        this.dy[ai] = 0;
        this.dx[bi] = 0;
        this.dy[bi] = 0;
        this.busy = false;
      },
    });
  }

  /** 依次播放每一段连锁：交换 → 消除 → 下落/补充。 */
  beginMove(
    pre: number[][],
    a: Cell,
    b: Cell,
    report: ResolveReport,
    finalBoard: number[][],
    onSwapDone: () => void,
    onStep: (step: ResolveStep) => void,
    onDone: () => void,
  ): void {
    this.clearPress();
    this.guide = null;
    this.display = pre.map((row) => [...row]);
    this.resetVisuals();
    this.ghosts = [];
    this.staticBoard = finalBoard.map((row) => [...row]);
    this.busy = true;

    // 交换后的棋盘（用于衔接第一段消除）
    const swapped = pre.map((row) => [...row]);
    const tmp = swapped[a.r][a.c];
    swapped[a.r][a.c] = swapped[b.r][b.c];
    swapped[b.r][b.c] = tmp;

    const ai = this.index(a.r, a.c);
    const bi = this.index(b.r, b.c);
    const ax = b.c - a.c;
    const ay = b.r - a.r;

    this.tweens.to({
      duration: this.reducedMotion ? DURATION.instant : DURATION.fast,
      easing: Easing.outCubic,
      onUpdate: (t) => {
        this.dx[ai] = ax * (1 - t);
        this.dy[ai] = ay * (1 - t);
        this.dx[bi] = -ax * (1 - t);
        this.dy[bi] = -ay * (1 - t);
      },
      onComplete: () => {
        this.resetVisuals();
        this.display = swapped;
        onSwapDone();
        this.runSteps(report, onStep, onDone);
      },
    });
  }

  private runSteps(
    report: ResolveReport,
    onStep: (step: ResolveStep) => void,
    onDone: () => void,
  ): void {
    const steps = report.steps;
    if (steps.length === 0) {
      this.busy = false;
      onDone();
      return;
    }

    let index = 0;
    const next = (): void => {
      if (index >= steps.length) {
        this.busy = false;
        onDone();
        return;
      }
      const step = steps[index];
      index += 1;
      onStep(step);
      this.playStep(step, next);
    };
    next();
  }

  /** 依次播放每一段连锁：消除 → 下落/补充。 */
  playResolve(
    report: ResolveReport,
    finalBoard: number[][],
    onStep: (step: ResolveStep) => void,
    onDone: () => void,
  ): void {
    this.busy = true;
    this.staticBoard = finalBoard.map((row) => [...row]);
    const steps = report.steps;

    if (steps.length === 0) {
      this.busy = false;
      onDone();
      return;
    }

    let index = 0;

    const next = (): void => {
      if (index >= steps.length) {
        this.busy = false;
        onDone();
        return;
      }
      const step = steps[index];
      index += 1;
      this.playStep(step, next);
      onStep(step);
    };

    next();
  }

  private playStep(step: ResolveStep, onDone: () => void): void {
    // 1) 消除：格子变空 + 幽灵放大淡出 + 白闪
    for (const cell of step.cleared) {
      const i = this.index(cell.r, cell.c);
      if (i >= 0 && i < this.display.length * this.geometry.cols) {
        this.display[cell.r][cell.c] = -1;
        this.flash[i] = 1;
      }
    }
    this.ghosts = step.cleared.map((cell) => ({
      r: cell.r,
      c: cell.c,
      value: cell.value,
      scale: 1,
      alpha: 1,
    }));

    this.tweens.to({
      duration: DURATION.instant,
      easing: Easing.outQuad,
      onUpdate: (t) => {
        for (const ghost of this.ghosts) {
          ghost.scale = 1 + 0.22 * t;
          ghost.alpha = 1 - t;
        }
        for (let i = 0; i < this.flash.length; i += 1) {
          if (this.flash[i] > 0) this.flash[i] = Math.max(0, this.flash[i] - t * 0.5);
        }
      },
      onComplete: () => {
        this.ghosts = [];
        this.flash.fill(0);
        this.startFall(step, onDone);
      },
    });
  }

  private startFall(step: ResolveStep, onDone: () => void): void {
    this.display = step.snapshot.map((row) => [...row]);

    // 清空上一段的位移，再按本段的 from→to 设置初始偏移（单位：格）
    this.dx.fill(0);
    this.dy.fill(0);
    this.scaleX.fill(1);
    this.scaleY.fill(1);
    this.alpha.fill(1);

    let maxDistance = 0;
    for (const fall of step.falls) {
      const i = this.index(fall.to.r, fall.to.c);
      this.dy[i] = fall.from.r - fall.to.r;
      maxDistance = Math.max(maxDistance, Math.abs(this.dy[i]));
    }
    for (const spawn of step.spawns) {
      const i = this.index(spawn.r, spawn.c);
      // 从棋盘上方落入：行号越小越靠上，出生点再往上留一行
      this.dy[i] = -(spawn.r + 1);
      maxDistance = Math.max(maxDistance, Math.abs(this.dy[i]));
    }

    if (maxDistance === 0) {
      onDone();
      return;
    }

    const duration = this.reducedMotion ? DURATION.instant : DURATION.fast;
    const startDy = this.dy.slice();

    this.tweens.to({
      duration,
      easing: Easing.outCubic,
      onUpdate: (t) => {
        for (let i = 0; i < this.dy.length; i += 1) {
          if (startDy[i] !== 0) this.dy[i] = startDy[i] * (1 - t);
        }
        // 近大远小 + 落地挤压：横向变宽、纵向变矮，结束后回弹到 1。
        const grow = 0.94 + 0.06 * t;
        const impact = t > 0.8 ? Math.sin(((t - 0.8) / 0.2) * Math.PI) : 0;
        for (let i = 0; i < this.scaleX.length; i += 1) {
          if (startDy[i] === 0) continue;
          this.scaleX[i] = grow * (1 + 0.06 * impact);
          this.scaleY[i] = grow * (1 - 0.08 * impact);
        }
      },
      onComplete: () => {
        this.dx.fill(0);
        this.dy.fill(0);
        this.scaleX.fill(1);
        this.scaleY.fill(1);
        onDone();
      },
    });
  }

  showCombo(text: string, duration = 0.9): void {
    this.comboLabel = text;
    this.comboUntil = Date.now() + duration * 1000;
    if (this.reducedMotion) {
      this.comboScale = 1;
      return;
    }
    this.comboScale = 0.86;
    this.tweens.to({
      duration: DURATION.base,
      easing: Easing.outBack,
      onUpdate: (t) => {
        this.comboScale = 0.86 + 0.14 * t;
      },
      onComplete: () => {
        this.comboScale = 1;
      },
    });
  }

  /** 切后台 / 退出 / 减少动效时：直接落到终态，不留半截动画。 */
  skipAll(): void {
    if (this.staticBoard) this.display = this.staticBoard.map((row) => [...row]);
    this.ghosts = [];
    this.popups.length = 0;
    this.guide = null;
    this.clearPress();
    this.introActive = false;
    this.introElapsed = 0;
    this.resetVisuals();
    this.busy = false;
    this.comboLabel = '';
    this.comboUntil = 0;
    this.comboScale = 1;
  }

  render(ctx: CanvasRenderingContext2D, rect: Rect, pulse: number): void {
    this.rect = rect;
    const { rows, cols, cellW, cellH } = this.geometry;
    const pressedIndex = this.press ? this.index(this.press.r, this.press.c) : -1;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const value = this.display[r]?.[c] ?? -1;
        if (value < 0) continue;
        const i = this.index(r, c);
        if (i === pressedIndex) continue;
        const x = rect.x + (c + this.dx[i]) * cellW;
        const y = rect.y + (r + this.dy[i]) * cellH;
        const lift = Math.max(0, -this.dy[i]);

        if (lift > 0.02) {
          this.drawShadow(ctx, x, y, cellW, cellH, lift);
        }
        this.drawTile(
          ctx,
          x,
          y,
          cellW,
          cellH,
          value,
          this.scaleX[i],
          this.scaleY[i],
          this.alpha[i],
          this.flash[i],
          false,
        );
      }
    }

    for (const ghost of this.ghosts) {
      const x = rect.x + ghost.c * cellW;
      const y = rect.y + ghost.r * cellH;
      this.drawTile(
        ctx,
        x,
        y,
        cellW,
        cellH,
        ghost.value,
        ghost.scale,
        ghost.scale,
        ghost.alpha,
        0.6,
        false,
      );
    }

    if (this.press && pressedIndex >= 0) {
      const { r, c } = this.press;
      const value = this.display[r]?.[c] ?? -1;
      if (value >= 0) {
        const x = rect.x + c * cellW + this.pressX;
        const y = rect.y + r * cellH + this.pressY;
        this.drawShadow(ctx, x, y, cellW, cellH, 0.8);
        const scale = 1.06 + Math.sin(pulse * 8) * 0.01;
        this.drawTile(ctx, x, y, cellW, cellH, value, scale, scale, 1, 0, true);
      }
    }

    this.drawSwipeGuide(ctx, rect);
    this.renderPopups(ctx);
  }

  private drawSwipeGuide(ctx: CanvasRenderingContext2D, rect: Rect): void {
    const guide = this.guide;
    if (!guide) return;
    const { cellW, cellH } = this.geometry;
    const alpha = Math.max(0, guide.life / guide.max);
    const cx = rect.x + (guide.c + 0.5) * cellW;
    const cy = rect.y + (guide.r + 0.5) * cellH;
    const reach = cellW * 0.52;
    const tipX = cx + guide.dx * reach;
    const tipY = cy + guide.dy * reach;
    const perpX = -guide.dy;
    const perpY = guide.dx;

    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = COLORS.jade;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + guide.dx * cellW * 0.18, cy + guide.dy * cellH * 0.18);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tipX - guide.dx * 12 + perpX * 9, tipY - guide.dy * 12 + perpY * 9);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX - guide.dx * 12 - perpX * 9, tipY - guide.dy * 12 - perpY * 9);
    ctx.stroke();
    ctx.restore();
  }

  private renderPopups(ctx: CanvasRenderingContext2D): void {
    for (const popup of this.popups) {
      const alpha = Math.min(1, popup.life / 0.22);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawText(ctx, popup.text, popup.x, popup.y, {
        size: FONT.subtitle,
        weight: '700',
        color: popup.color,
        align: 'center',
      });
      ctx.restore();
    }
  }

  private drawShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellW: number,
    cellH: number,
    lift: number,
  ): void {
    const frame = this.atlas.frame('shadow');
    const spread = Math.min(1.35, 0.75 + lift * 0.08);
    const w = cellW * spread;
    const h = cellH * 0.34 * spread;
    ctx.save();
    ctx.globalAlpha = Math.max(0.1, 0.42 - lift * 0.05);
    ctx.drawImage(
      frame.canvas,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x + (cellW - w) / 2,
      y + cellH * 0.78 - h / 2,
      w,
      h,
    );
    ctx.restore();
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellW: number,
    cellH: number,
    value: number,
    scaleX: number,
    scaleY: number,
    alpha: number,
    flash: number,
    pressed: boolean,
  ): void {
    const sprite = this.tileSprites[value % this.tileSprites.length] ?? this.tileSprites[0];
    const frame = this.atlas.frame(sprite);
    const pad = 3;
    const w = cellW * scaleX - pad * 2;
    const h = cellH * scaleY - pad * 2;
    const cx = x + cellW / 2;
    const cy = y + cellH / 2;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(
      frame.canvas,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      cx - w / 2,
      cy - h / 2,
      w,
      h,
    );

    if (flash > 0.01) {
      ctx.globalAlpha = Math.min(0.75, flash * 0.75);
      fillRoundRect(ctx, { x: cx - w / 2, y: cy - h / 2, w, h }, COLORS.paper, 16);
    }

    if (pressed) {
      ctx.globalAlpha = 0.9;
      const frameSel = this.atlas.frame('p-ring');
      const size = Math.max(w, h) * 1.05;
      ctx.drawImage(
        frameSel.canvas,
        frameSel.sx,
        frameSel.sy,
        frameSel.sw,
        frameSel.sh,
        cx - size / 2,
        cy - size / 2,
        size,
        size,
      );
    }
    ctx.restore();
  }

  renderCombo(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const text = this.comboText;
    if (!text) return;
    const width = Math.max(180, text.length * 24 + 52);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.comboScale, this.comboScale);
    fillRoundRect(ctx, { x: -width / 2, y: -22, w: width, h: 44 }, 'rgba(58,46,42,0.82)', 22);
    drawText(ctx, text, 0, 0, {
      size: FONT.caption,
      color: COLORS.paper,
      align: 'center',
      weight: '700',
    });
    ctx.restore();
  }
}
