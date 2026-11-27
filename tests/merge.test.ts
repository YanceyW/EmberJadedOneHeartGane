import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { MERGE_ORDERS, MERGE_ROWS, MERGE_COLS, SPAWN_COST } from '../src/games/merge/data/items';
import {
  canFulfillMergeOrder,
  createMergeSave,
  currentMergeOrder,
  emptyCells,
  fulfillMergeOrder,
  mergeCells,
  mergeScore,
  migrateMergeSave,
  sellFinished,
  spawnItem,
} from '../src/games/merge/systems/merge';

describe('processing house merge systems', () => {
  it('migrates broken saves into a 5x5 empty board', () => {
    const save = migrateMergeSave({ cells: [0, 9, 'x', 3], orderIndex: 99 });
    expect(save.cells).toHaveLength(MERGE_ROWS * MERGE_COLS);
    expect(save.cells[0]).toBe(0);
    expect(save.cells[1]).toBe(-1);
    expect(save.cells[3]).toBe(3);
    expect(save.orderIndex).toBe(99 % MERGE_ORDERS.length);
    expect(createMergeSave().cells.every((tier) => tier === -1)).toBe(true);
  });

  it('spawns into empty cells and merges two equal items', () => {
    const save = createMergeSave();
    const rng = createRng(7);
    const first = spawnItem(save, rng);
    const second = spawnItem(save, rng);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    save.cells[0] = 0;
    save.cells[1] = 0;
    expect(mergeCells(save, 0, 1)).toEqual({ tier: 1, index: 1 });
    expect(save.cells[0]).toBe(-1);
    expect(save.cells[1]).toBe(1);
    expect(save.totalMerges).toBe(1);
    expect(mergeCells(save, 1, 2)).toBeNull();
  });

  it('fulfills orders by consuming the requested tiers', () => {
    const save = createMergeSave();
    save.cells[0] = 1;
    save.cells[1] = 1;
    expect(canFulfillMergeOrder(save)).toBe(true);
    const order = currentMergeOrder(save);
    expect(fulfillMergeOrder(save)).toEqual({
      coins: order.coins,
      prosperity: order.prosperity,
    });
    expect(save.cells[0]).toBe(-1);
    expect(save.cells[1]).toBe(-1);
    expect(save.orderIndex).toBe(1);
    expect(save.totalOrders).toBe(1);
  });

  it('sells only tier 2+ items so low tiers stay mergeable', () => {
    const save = createMergeSave();
    save.cells[0] = 1;
    save.cells[1] = 2;
    save.cells[2] = 3;
    const result = sellFinished(save);
    expect(result.count).toBe(2);
    expect(result.coins).toBe(60);
    expect(save.cells[0]).toBe(1);
    expect(save.cells[1]).toBe(-1);
    expect(mergeScore(save)).toBe(0);
  });

  it('refuses to spawn when the board is full', () => {
    const save = createMergeSave();
    save.cells.fill(0);
    expect(emptyCells(save)).toHaveLength(0);
    expect(spawnItem(save, createRng(1))).toBeNull();
    expect(SPAWN_COST).toBeGreaterThan(0);
  });
});
