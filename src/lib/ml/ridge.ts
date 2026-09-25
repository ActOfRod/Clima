import { solve } from "./linalg";

/**
 * Weighted ridge regression. `lambda` is scale-free: the penalty is
 * lambda * sum(sampleWeights), so the same value works for 200 or 2000 rows.
 * Column 0 is treated as the intercept and is not penalized.
 */
export function fitRidge(
  x: number[][],
  y: number[],
  lambda: number,
  sampleWeights?: number[],
): number[] {
  const p = x[0]?.length ?? 0;
  if (!p || x.length !== y.length) throw new Error("Bad ridge input");
  const ata = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const atb = new Array<number>(p).fill(0);
  let wSum = 0;
  for (let i = 0; i < x.length; i++) {
    const w = sampleWeights?.[i] ?? 1;
    wSum += w;
    const row = x[i];
    for (let a = 0; a < p; a++) {
      const ra = row[a] * w;
      atb[a] += ra * y[i];
      for (let b = a; b < p; b++) ata[a][b] += ra * row[b];
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) ata[a][b] = ata[b][a];
  }
  const penalty = lambda * wSum;
  for (let a = 1; a < p; a++) ata[a][a] += penalty;
  ata[0][0] += 1e-9 * wSum;
  return solve(ata, atb);
}
