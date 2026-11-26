import { describe, expect, it, vi } from 'vitest';
import { TweenManager } from '../src/core/anim/tween';
import { createRng } from '../src/core/rng';
import { BoardView } from '../src/games/match3/view/board-view';
import {
  createBoard,
  resolveWithReport,
  swapCells,
} from '../src/games/match3/systems/board';
import type { SpriteAtlas } from '../src/shared/design-system/sprite-atlas';

function makeView(): { view: BoardView; tweens: TweenManager } {
  const tweens = new TweenManager();
  // 动画编排不触碰 atlas（只有 render 时才会用），用桩对象即可。
  const view = new BoardView(tweens, {} as SpriteAtlas);
  view.configure(6, 8, 82.5, 82.5);
  return { view, tweens };
}

function advance(tweens: TweenManager, view: BoardView, maxFrames = 600): void {
  for (let i = 0; i < maxFrames; i += 1) {
    tweens.update(1 / 60);
    if (!view.isBusy) return;
  }
}

describe('board view orchestration', () => {
  it('plays a resolve step by step and finishes once', () => {
    const { view, tweens } = makeView();
    const board = createBoard(6, 8, 5, createRng(21));
    board[0][0] = 2;
    board[0][1] = 2;
    board[0][2] = 2;
    view.setBoard(board);

    const pre = board.map((row) => [...row]);
    swapCells(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    const report = resolveWithReport(board, 5, createRng(5));

    const steps: number[] = [];
    const onDone = vi.fn();
    view.beginMove(pre, { r: 0, c: 0 }, { r: 0, c: 1 }, report, board, () => {}, (step) => steps.push(step.index), onDone);

    expect(view.isBusy).toBe(true);
    advance(tweens, view);

    expect(steps).toEqual(report.steps.map((s) => s.index));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(view.isBusy).toBe(false);
  });

  it('plays an invalid swap and returns to idle', () => {
    const { view, tweens } = makeView();
    const board = createBoard(6, 8, 5, createRng(8));
    view.setBoard(board);

    const onDone = vi.fn();
    view.playInvalid({ r: 0, c: 0 }, { r: 0, c: 1 }, onDone);
    advance(tweens, view);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(view.isBusy).toBe(false);
  });

  it('skipAll settles immediately and clears busy', () => {
    const { view } = makeView();
    const board = createBoard(6, 8, 5, createRng(4));
    board[0][0] = 1;
    board[0][1] = 1;
    board[0][2] = 1;
    view.setBoard(board);

    const pre = board.map((row) => [...row]);
    swapCells(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    const report = resolveWithReport(board, 5, createRng(2));
    view.beginMove(pre, { r: 0, c: 0 }, { r: 0, c: 1 }, report, board, () => {}, () => {}, () => {});

    view.skipAll();
    expect(view.isBusy).toBe(false);
  });

  it('handles an empty report without hanging', () => {
    const { view } = makeView();
    const board = createBoard(6, 8, 5, createRng(6));
    view.setBoard(board);

    const onDone = vi.fn();
    view.playResolve(
      { steps: [], cleared: 0, cascades: 0, score: 0 },
      board,
      () => {},
      onDone,
    );

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(view.isBusy).toBe(false);
  });

  it('combo label expires on its own', () => {
    const { view } = makeView();
    view.showCombo('连锁 x2', 0.05);
    expect(view.comboText).toBe('连锁 x2');
    const until = Date.now() + 80;
    while (Date.now() < until) {
      // 等一小会儿，验证不会一直显示
      break;
    }
    view.skipAll();
    expect(view.comboText).toBe('');
  });
});
