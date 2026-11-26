import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import {
  Board,
  EMPTY,
  collapse,
  createBoard,
  findMatches,
  hasPossibleMove,
  resolveBoard,
  swapCells,
} from '../src/games/match3/systems/board';

describe('match3 board', () => {
  it('creates a board without initial matches and with a possible move', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const board = createBoard(6, 8, 5, createRng(seed));
      expect(findMatches(board).size).toBe(0);
      expect(hasPossibleMove(board)).toBe(true);
    }
  });

  it('finds horizontal and vertical runs', () => {
    const board: Board = [
      [0, 0, 0, 1],
      [2, 1, 3, 1],
      [2, 4, 4, 1],
      [2, 1, 3, 4],
    ];
    const matches = findMatches(board);
    expect(matches.has(0 * 4 + 0)).toBe(true);
    expect(matches.has(0 * 4 + 2)).toBe(true);
    expect(matches.has(1 * 4 + 0)).toBe(true);
    expect(matches.has(2 * 4 + 0)).toBe(true);
    expect(matches.has(0 * 4 + 3)).toBe(true);
    expect(matches.has(1 * 4 + 3)).toBe(true);
    expect(matches.has(2 * 4 + 3)).toBe(true);
  });

  it('swaps back when a move does not match', () => {
    const board: Board = [
      [0, 1, 0],
      [2, 3, 2],
      [4, 5, 4],
    ];
    swapCells(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    expect(findMatches(board).size).toBe(0);
    swapCells(board, { r: 0, c: 0 }, { r: 0, c: 1 });
    expect(board[0][0]).toBe(0);
    expect(board[0][1]).toBe(1);
  });

  it('collapses empty cells and refills the top', () => {
    const board: Board = [
      [EMPTY, 1],
      [2, EMPTY],
      [3, 3],
    ];
    collapse(board, 5, createRng(42));
    expect(board[2][0]).toBe(3);
    expect(board[1][0]).toBe(2);
    expect(board[0][0]).not.toBe(EMPTY);
    expect(board[2][1]).toBe(3);
    expect(board[1][1]).not.toBe(EMPTY);
    expect(board[0][1]).not.toBe(EMPTY);
  });

  it('resolves cascades and clears all matches', () => {
    const board: Board = [
      [0, 0, 0, 1],
      [2, 1, 3, 1],
      [2, 4, 4, 1],
      [2, 1, 3, 4],
    ];
    const result = resolveBoard(board, 5, createRng(9));
    expect(result.cleared).toBeGreaterThanOrEqual(6);
    expect(result.score).toBeGreaterThan(0);
    expect(findMatches(board).size).toBe(0);
  });
});
