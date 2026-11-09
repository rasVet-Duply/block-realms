export const N = 8;
export type Grid = number[][];
export type Cell = [number, number];
export interface Shape { cells: Cell[]; w: number; h: number }

function S(rows: string[]): Shape {
  const cells: Cell[] = [];
  rows.forEach((row, r) => row.split('').forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  return { cells, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

const DEFS: [string[], number][] = [
  [['#'], 0.6], [['##'], 1], [['#', '#'], 1], [['###'], 1], [['#', '#', '#'], 1],
  [['####'], 0.8], [['#', '#', '#', '#'], 0.8], [['#####'], 0.5], [['#', '#', '#', '#', '#'], 0.5],
  [['##', '##'], 1.2], [['###', '###', '###'], 0.45], [['##', '##', '##'], 0.5], [['###', '###'], 0.5],
  [['#.', '#.', '##'], 0.6], [['###', '#..'], 0.6], [['##', '.#', '.#'], 0.6], [['..#', '###'], 0.6],
  [['.#', '.#', '##'], 0.6], [['#..', '###'], 0.6], [['##', '#.', '#.'], 0.6], [['###', '..#'], 0.6],
  [['#.', '##'], 0.8], [['.#', '##'], 0.8], [['##', '#.'], 0.8], [['##', '.#'], 0.8],
  [['###', '.#.'], 0.6], [['.#.', '###'], 0.6], [['#.', '##', '#.'], 0.6], [['.#', '##', '.#'], 0.6],
  [['.##', '##.'], 0.5], [['#.', '##', '.#'], 0.5], [['##.', '.##'], 0.5], [['.#', '##', '#.'], 0.5],
];
const SHAPES = DEFS.map(([r, w]) => ({ shape: S(r), weight: w }));
const TOTAL = SHAPES.reduce((a, s) => a + s.weight, 0);

export function randomShape(): Shape {
  let x = Math.random() * TOTAL;
  for (const s of SHAPES) { x -= s.weight; if (x <= 0) return s.shape; }
  return SHAPES[0].shape;
}

export const emptyGrid = (): Grid => Array.from({ length: N }, () => Array(N).fill(-1));

export function canPlace(g: Grid, s: Shape, r: number, c: number) {
  return s.cells.every(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && rr < N && cc >= 0 && cc < N && g[rr][cc] < 0;
  });
}

export function anyFit(g: Grid, s: Shape) {
  for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.w; c++) if (canPlace(g, s, r, c)) return true;
  return false;
}

export function fullLines(g: Grid) {
  const rows: number[] = [], cols: number[] = [];
  for (let i = 0; i < N; i++) {
    if (g[i].every((v) => v >= 0)) rows.push(i);
    if (g.every((row) => row[i] >= 0)) cols.push(i);
  }
  return { rows, cols };
}

export function linesAfter(g: Grid, s: Shape, r: number, c: number) {
  const copy = g.map((row) => row.slice());
  s.cells.forEach(([dr, dc]) => { copy[r + dr][c + dc] = 0; });
  return fullLines(copy);
}

/** Place shape at the spot that clears the most lines; returns resulting grid (lines removed) or null. */
function bestPlace(g: Grid, s: Shape): { grid: Grid; lines: number } | null {
  let best: { grid: Grid; lines: number } | null = null;
  for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.w; c++) {
    if (!canPlace(g, s, r, c)) continue;
    const copy = g.map((row) => row.slice());
    s.cells.forEach(([dr, dc]) => { copy[r + dr][c + dc] = 0; });
    const { rows, cols } = fullLines(copy);
    rows.forEach((rr) => copy[rr].fill(-1));
    cols.forEach((cc) => copy.forEach((row) => (row[cc] = -1)));
    const lines = rows.length + cols.length;
    if (!best || lines > best.lines) best = { grid: copy, lines };
  }
  return best;
}

/** Can all shapes be placed in some order? Returns max total lines cleared, or -1. */
function solve(g: Grid, shapes: Shape[]): number {
  if (!shapes.length) return 0;
  let best = -1;
  shapes.forEach((s, i) => {
    const p = bestPlace(g, s); if (!p) return;
    const rest = solve(p.grid, shapes.filter((_, j) => j !== i));
    if (rest >= 0) best = Math.max(best, rest + p.lines);
  });
  return best;
}

/** Calculated tray: every set is guaranteed placeable when possible, and favours sets that can clear lines. */
export function smartTray(g: Grid): Shape[] {
  let best: Shape[] = []; let bestScore = -Infinity;
  for (let i = 0; i < 14; i++) {
    const set = [randomShape(), randomShape(), randomShape()];
    const res = solve(g, set);
    const score = (res >= 0 ? 100 + res * 12 : set.some((s) => anyFit(g, s)) ? 0 : -100) + Math.random() * 18;
    if (score > bestScore) { bestScore = score; best = set; }
  }
  return best;
}
