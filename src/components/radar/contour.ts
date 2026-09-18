export interface Point {
  x: number;
  y: number;
}

export type Segment = readonly [Point, Point];

function lerpPoint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  av: number,
  bv: number,
  threshold: number,
): Point {
  const d = bv - av;
  const t = Math.abs(d) < 1e-6 ? 0.5 : Math.max(0, Math.min(1, (threshold - av) / d));
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
}

const CASE_SEGMENTS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [
    [3, 2],
    [0, 1],
  ],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[0, 2]],
  [
    [0, 3],
    [1, 2],
  ],
  [[1, 2]],
  [[1, 3]],
  [[0, 1]],
  [[3, 0]],
  [],
];

function edgePoint(
  edge: number,
  x: number,
  y: number,
  cellSize: number,
  values: readonly [number, number, number, number],
  threshold: number,
): Point {
  const x0 = x * cellSize;
  const y0 = y * cellSize;
  const x1 = (x + 1) * cellSize;
  const y1 = (y + 1) * cellSize;
  const [tl, tr, br, bl] = values;

  switch (edge) {
    case 0:
      return lerpPoint(x0, y0, x1, y0, tl, tr, threshold);
    case 1:
      return lerpPoint(x1, y0, x1, y1, tr, br, threshold);
    case 2:
      return lerpPoint(x0, y1, x1, y1, bl, br, threshold);
    default:
      return lerpPoint(x0, y0, x0, y1, tl, bl, threshold);
  }
}

export function marchingSquares(
  grid: ReadonlyArray<ReadonlyArray<number>>,
  threshold: number,
  cellSize = 1,
): Segment[] {
  const h = grid.length;
  if (h < 2) return [];
  const w = grid[0]?.length ?? 0;
  if (w < 2) return [];

  const segments: Segment[] = [];
  for (let y = 0; y < h - 1; y++) {
    const rowTop = grid[y];
    const rowBottom = grid[y + 1];
    if (!rowTop || !rowBottom || rowTop.length < w || rowBottom.length < w) continue;

    for (let x = 0; x < w - 1; x++) {
      const tl = rowTop[x] ?? 0;
      const tr = rowTop[x + 1] ?? 0;
      const br = rowBottom[x + 1] ?? 0;
      const bl = rowBottom[x] ?? 0;

      const idx =
        (tl >= threshold ? 1 : 0) |
        (tr >= threshold ? 2 : 0) |
        (br >= threshold ? 4 : 0) |
        (bl >= threshold ? 8 : 0);

      const rules = CASE_SEGMENTS[idx];
      if (!rules || rules.length === 0) continue;

      const values: readonly [number, number, number, number] = [tl, tr, br, bl];
      for (const [edgeA, edgeB] of rules) {
        segments.push([
          edgePoint(edgeA, x, y, cellSize, values, threshold),
          edgePoint(edgeB, x, y, cellSize, values, threshold),
        ]);
      }
    }
  }

  return segments;
}

function pointClose(a: Point, b: Point, epsilon: number): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

export function stitchSegments(
  segments: ReadonlyArray<Segment>,
  epsilon = 0.01,
): Point[][] {
  const used = new Array<boolean>(segments.length).fill(false);
  const out: Point[][] = [];

  const appendMatch = (
    points: Point[],
    atStart: boolean,
    atEnd: boolean,
  ): boolean => {
    const target = atStart ? points[0] : points[points.length - 1];
    if (!target) return false;

    for (let i = 0; i < segments.length; i++) {
      if (used[i]) continue;
      const [a, b] = segments[i] ?? [];
      if (!a || !b) continue;

      if (pointClose(a, target, epsilon)) {
        used[i] = true;
        if (atStart) points.unshift(b);
        else if (atEnd) points.push(b);
        return true;
      }
      if (pointClose(b, target, epsilon)) {
        used[i] = true;
        if (atStart) points.unshift(a);
        else if (atEnd) points.push(a);
        return true;
      }
    }

    return false;
  };

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    const [a, b] = segments[i] ?? [];
    if (!a || !b) continue;
    used[i] = true;

    const points: Point[] = [a, b];

    while (appendMatch(points, false, true));
    while (appendMatch(points, true, false));

    out.push(points);
  }

  return out;
}

export function chaikinSmooth(
  points: ReadonlyArray<Point>,
  iterations = 2,
): Point[] {
  if (points.length < 3 || iterations <= 0) return [...points];

  let current = [...points];
  for (let n = 0; n < iterations; n++) {
    const next: Point[] = [current[0] as Point];
    for (let i = 0; i < current.length - 1; i++) {
      const p = current[i] as Point;
      const q = current[i + 1] as Point;
      next.push(
        { x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 },
        { x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 },
      );
    }
    next.push(current[current.length - 1] as Point);
    current = next;
  }

  return current;
}
