import { TweenManager } from '../../../core/anim/tween';
import { Easing } from '../../../core/anim/easing';
import { DURATION } from '../../../shared/design-system/motion';
import { SpriteAtlas, SpriteId } from '../../../shared/design-system/sprite-atlas';
import { COLORS, FONT } from '../../../shared/design-system/tokens';
import { drawText, fillRoundRect, Rect } from '../../../shared/design-system/draw';
import { Cell, ResolveReport, ResolveStep } from '../systems/board';

const TILE_SPRITES: SpriteId[] = ['tile-berry', 'tile-honey', 'tile-mint', 'tile-sky', 'tile-lilac'];

interface Ghost {
  r: number;
  c: number;
  value: number;
  scale: number;
  alpha: number;
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
  private scale: number[] = [];
  private alpha: number[] = [];
  private flash: number[] = [];
  private ghosts: Ghost[] = [];
  private comboLabel = '';
  private comboUntil = 0;
  private busy = false;
  private staticBoard: number[][] | null = null;

  constructor(
    private readonly tweens: TweenManager,
    private readonly atlas: SpriteAtlas,
  ) {}

  configure(rows: number, cols: number, cellW: number, cellH: number): void {
    this.geometry = { rows, cols, cellW, cellH };
    this.resetVisuals();
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
    this.scale = new Array<number>(count).fill(1);
    this.alpha = new Array<number>(count).fill(1);
    this.flash = new Array<number>(count).fill(0);
  }

  setBoard(board: number[][]): void {
    this.display = board.map((row) => [...row]);
    this.ghosts = [];
    this.resetVisuals();
    this.busy = false;
    this.staticBoard = board.map((row) => [...row]);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get comboText(): string {
    return Date.now() < this.comboUntil ? this.comboLabel : '';
  }

  /** 交换：两块沿直线互换（board 已是交换后的状态，靠偏移表现「从对方位置过来」）。 */
  playSwap(a: Cell, b: Cell, onDone: () => void): void {
    this.busy = true;
    const ai = this.index(a.r, a.c);
    const bi = this.index(b.r, b.c);
    const ax = b.c - a.c;
    const ay = b.r - a.r;

    this.tweens.to({
      duration: DURATION.fast,
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

  /** 非法交换：先换过去再弹回，幅度很小，不做红屏。 */
  playInvalid(a: Cell, b: Cell, onDone: () => void): void {
    this.busy = true;
    const ai = this.index(a.r, a.c);
    const bi = this.index(b.r, b.c);
    const ax = b.c - a.c;
    const ay = b.r - a.r;

    this.tweens.to({
      duration: DURATION.base,
      easing: Easing.outQuad,
      onUpdate: (t) => {
        // 0→1 时前进到一半再回到 0
        const offset = Math.sin(Math.PI * t) * 0.28;
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
        onDone();
      },
    });
  }

  /** 依次播放每一段连锁：消除 → 下落/补充。 */
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
      duration: DURATION.fast,
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

    const popDuration = DURATION.fast;
    this.tweens.to({
      duration: popDuration,
      easing: Easing.outQuad,
      onUpdate: (t) => {
        for (const ghost of this.ghosts) {
          ghost.scale = 1 + 0.25 * t;
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
    this.scale.fill(1);
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

    const duration = Math.min(DURATION.slow + 0.02 * maxDistance, 0.32);
    const startDy = this.dy.slice();

    this.tweens.to({
      duration,
      easing: Easing.outCubic,
      onUpdate: (t) => {
        for (let i = 0; i < this.dy.length; i += 1) {
          if (startDy[i] !== 0) this.dy[i] = startDy[i] * (1 - t);
        }
        // 落地前略微压扁，配合挤压回弹
        const settle = t > 0.75 ? 1 : 1 + 0.04 * Math.sin(Math.PI * t);
        for (let i = 0; i < this.scale.length; i += 1) {
          if (startDy[i] !== 0) this.scale[i] = settle;
        }
      },
      onComplete: () => {
        this.dx.fill(0);
        this.dy.fill(0);
        this.scale.fill(1);
        onDone();
      },
    });
  }

  showCombo(text: string, duration = 0.9): void {
    this.comboLabel = text;
    this.comboUntil = Date.now() + duration * 1000;
  }

  /** 切后台 / 退出 / 减少动效时：直接落到终态，不留半截动画。 */
  skipAll(): void {
    if (this.staticBoard) this.display = this.staticBoard.map((row) => [...row]);
    this.ghosts = [];
    this.resetVisuals();
    this.busy = false;
    this.comboLabel = '';
    this.comboUntil = 0;
  }

  render(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    selected: Cell | null,
    pulse: number,
  ): void {
    const { rows, cols, cellW, cellH } = this.geometry;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const value = this.display[r]?.[c] ?? -1;
        if (value < 0) continue;
        const i = this.index(r, c);
        const x = rect.x + (c + this.dx[i]) * cellW;
        const y = rect.y + (r + this.dy[i]) * cellH;
        const isSelected = Boolean(selected && selected.r === r && selected.c === c);
        const lift = Math.max(0, -this.dy[i]);

        if (lift > 0.02) {
          this.drawShadow(ctx, x, y, cellW, cellH, lift);
        }
        this.drawTile(ctx, x, y, cellW, cellH, value, isSelected, this.scale[i], this.alpha[i], this.flash[i]);
      }
    }

    for (const ghost of this.ghosts) {
      const x = rect.x + ghost.c * cellW;
      const y = rect.y + ghost.r * cellH;
      this.drawTile(ctx, x, y, cellW, cellH, ghost.value, false, ghost.scale, ghost.alpha, 0.6);
    }

    void pulse;
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
    selected: boolean,
    scale: number,
    alpha: number,
    flash: number,
  ): void {
    const sprite = TILE_SPRITES[value % TILE_SPRITES.length] ?? TILE_SPRITES[0];
    const frame = this.atlas.frame(sprite);
    const pad = 3;
    const w = cellW * scale - pad * 2;
    const h = cellH * scale - pad * 2;
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
      fillRoundRect(
        ctx,
        { x: cx - w / 2, y: cy - h / 2, w, h },
        COLORS.paper,
        16,
      );
    }

    if (selected) {
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
    const width = Math.max(180, text.length * 26 + 56);
    fillRoundRect(ctx, { x: x - width / 2, y: y - 26, w: width, h: 52 }, 'rgba(58,46,42,0.82)', 26);
    drawText(ctx, text, x, y, {
      size: FONT.body,
      color: COLORS.paper,
      align: 'center',
      weight: '700',
    });
  }
}
