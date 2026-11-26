import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import {
  Board,
  EMPTY,
  createBoard,
  findMatches,
  resolveBoard,
  resolveWithReport,
} from '../src/games/match3/systems/board';

describe('resolve report', () => {
  it('reports one step per cascade with cleared cells', () => {
    const board: Board = [
      [0, 0, 0, 1],
      [2, 1, 3, 1],
      [2, 4, 4, 1],
      [2, 1, 3, 4],
    ];
    const report = resolveWithReport(board, 5, createRng(7));

    expect(report.steps.length).toBe(report.cascades);
    expect(report.steps[0].index).toBe(1);
    expect(report.steps[0].cleared.length).toBeGreaterThanOrEqual(6);
    expect(report.steps[0].gained).toBe(report.steps[0].cleared.length * 10);
    expect(findMatches(board).size).toBe(0);
  });

  it('falls always move downward and appear in the spawn rows', () => {
    const board: Board = [
      [0, 0, 0],
      [1, 2, 3],
      [4, 5, 6],
    ];
    const report = resolveWithReport(board, 5, createRng(11));
    const step = report.steps[0];

    for (const fall of step.falls) {
      expect(fall.to.r).toBeGreaterThan(fall.from.r);
      expect(fall.to.c).toBe(fall.from.c);
    }
    for (const spawn of step.spawns) {
      expect(spawn.r).toBeGreaterThanOrEqual(0);
      expect(spawn.c).toBeGreaterThanOrEqual(0);
      expect(spawn.value).toBeGreaterThanOrEqual(0);
      expect(spawn.value).toBeLessThan(5);
    }
  });

  it('spawn positions are unique within a step', () => {
    const board = createBoard(6, 8, 5, createRng(3));
    board[5][0] = EMPTY;
    board[5][1] = EMPTY;
    const report = resolveWithReport(board, 5, createRng(3));
    for (const step of report.steps) {
      const keys = step.spawns.map((s) => `${s.r}-${s.c}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('matches resolveBoard exactly for the same seed', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const source = createBoard(6, 8, 5, createRng(seed * 17));
      // 制造一次消除：强制首行三连
      source[0][0] = 2;
      source[0][1] = 2;
      source[0][2] = 2;

      const a = source.map((row) => [...row]);
      const b = source.map((row) => [...row]);

      const aggregated = resolveBoard(a, 5, createRng(seed));
      const report = resolveWithReport(b, 5, createRng(seed));

      expect(report.cleared).toBe(aggregated.cleared);
      expect(report.cascades).toBe(aggregated.cascades);
      expect(report.score).toBe(aggregated.score);
      expect(a).toEqual(b);
    }
  });

  it('reports nothing when there is no match', () => {
    const board: Board = [
      [0, 1],
      [1, 0],
    ];
    const report = resolveWithReport(board, 5, createRng(1));
    expect(report.steps).toHaveLength(0);
    expect(report.score).toBe(0);
  });
});
