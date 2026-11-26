import { Rng } from '../../../core/rng';

export type Board = number[][];

export const EMPTY = -1;

export interface Cell {
  r: number;
  c: number;
}

export interface ResolveResult {
  cleared: number;
  cascades: number;
  score: number;
}

export interface CellRef {
  r: number;
  c: number;
  value: number;
}

export interface FallMove {
  from: CellRef;
  to: { r: number; c: number };
}

export interface SpawnEntry {
  r: number;
  c: number;
  value: number;
}

/** 一段连锁：表现层按这个顺序播「消除 → 下落 → 补充」。 */
export interface ResolveStep {
  index: number;
  cleared: CellRef[];
  falls: FallMove[];
  spawns: SpawnEntry[];
  gained: number;
  /** 本段结算后的棋盘快照，供表现层逐段插值。 */
  snapshot: Board;
}

export interface ResolveReport extends ResolveResult {
  steps: ResolveStep[];
}

export function swapCells(board: Board, a: Cell, b: Cell): void {
  const value = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = value;
}

export function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function findMatches(board: Board): Set<number> {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const matched = new Set<number>();

  for (let r = 0; r < rows; r += 1) {
    let runStart = 0;
    for (let c = 1; c <= cols; c += 1) {
      const same = c < cols && board[r][c] !== EMPTY && board[r][c] === board[r][runStart];
      if (same) continue;
      if (board[r][runStart] !== EMPTY && c - runStart >= 3) {
        for (let x = runStart; x < c; x += 1) matched.add(r * cols + x);
      }
      runStart = c;
    }
  }

  for (let c = 0; c < cols; c += 1) {
    let runStart = 0;
    for (let r = 1; r <= rows; r += 1) {
      const same = r < rows && board[r][c] !== EMPTY && board[r][c] === board[runStart][c];
      if (same) continue;
      if (board[runStart][c] !== EMPTY && r - runStart >= 3) {
        for (let y = runStart; y < r; y += 1) matched.add(y * cols + c);
      }
      runStart = r;
    }
  }

  return matched;
}

export function hasPossibleMove(board: Board): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c] === EMPTY) continue;
      if (c + 1 < cols && board[r][c + 1] !== EMPTY) {
        swapCells(board, { r, c }, { r, c: c + 1 });
        const found = findMatches(board).size > 0;
        swapCells(board, { r, c }, { r, c: c + 1 });
        if (found) return true;
      }
      if (r + 1 < rows && board[r + 1][c] !== EMPTY) {
        swapCells(board, { r, c }, { r: r + 1, c });
        const found = findMatches(board).size > 0;
        swapCells(board, { r, c }, { r: r + 1, c });
        if (found) return true;
      }
    }
  }

  return false;
}

export function collapse(board: Board, colors: number, rng: Rng): void {
  collapseWithReport(board, colors, rng);
}

export function collapseWithReport(
  board: Board,
  colors: number,
  rng: Rng,
): { falls: FallMove[]; spawns: SpawnEntry[] } {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const falls: FallMove[] = [];
  const spawns: SpawnEntry[] = [];

  for (let c = 0; c < cols; c += 1) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r -= 1) {
      const value = board[r][c];
      if (value === EMPTY) continue;
      if (r !== write) {
        falls.push({ from: { r, c, value }, to: { r: write, c } });
        board[write][c] = value;
        board[r][c] = EMPTY;
      }
      write -= 1;
    }
    for (let r = write; r >= 0; r -= 1) {
      const value = rng.int(colors);
      board[r][c] = value;
      spawns.push({ r, c, value });
    }
  }

  return { falls, spawns };
}

export function resolveWithReport(board: Board, colors: number, rng: Rng): ResolveReport {
  const steps: ResolveStep[] = [];
  let cleared = 0;
  let cascades = 0;
  let score = 0;
  const cols = board[0]?.length ?? 0;

  for (;;) {
    const matches = findMatches(board);
    if (matches.size === 0) break;

    cascades += 1;
    const gained = matches.size * 10 * cascades;
    cleared += matches.size;
    score += gained;

    const clearedCells: CellRef[] = [];
    for (const key of matches) {
      const r = Math.floor(key / cols);
      const c = key % cols;
      clearedCells.push({ r, c, value: board[r][c] });
      board[r][c] = EMPTY;
    }

    const { falls, spawns } = collapseWithReport(board, colors, rng);
    steps.push({
      index: cascades,
      cleared: clearedCells,
      falls,
      spawns,
      gained,
      snapshot: board.map((row) => [...row]),
    });
  }

  return { steps, cleared, cascades, score };
}

export function resolveBoard(board: Board, colors: number, rng: Rng): ResolveResult {
  const report = resolveWithReport(board, colors, rng);
  return { cleared: report.cleared, cascades: report.cascades, score: report.score };
}

function wouldCreateMatch(board: Board, r: number, c: number, value: number): boolean {
  if (c >= 2 && board[r][c - 1] === value && board[r][c - 2] === value) return true;
  if (r >= 2 && board[r - 1][c] === value && board[r - 2][c] === value) return true;
  return false;
}

export function createBoard(rows: number, cols: number, colors: number, rng: Rng): Board {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const board: Board = Array.from({ length: rows }, () => Array<number>(cols).fill(EMPTY));

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const candidates: number[] = [];
        for (let value = 0; value < colors; value += 1) {
          if (!wouldCreateMatch(board, r, c, value)) candidates.push(value);
        }
        board[r][c] = candidates.length > 0 ? rng.pick(candidates) : rng.int(colors);
      }
    }

    if (hasPossibleMove(board)) return board;
  }

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rng.int(colors)),
  );
}
