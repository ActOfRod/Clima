import { dot, solve } from "./linalg";

export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * L2-regularized logistic regression fitted with Newton's method (IRLS).
 * Same conventions as `fitRidge`: scale-free lambda, column 0 is an unpenalized intercept.
 */
export function fitLogistic(
  x: number[][],
  y: number[],
  lambda: number,
  sampleWeights?: number[],
  iterations = 30,
): number[] {
  const p = x[0]?.length ?? 0;
  if (!p || x.length !== y.length) throw new Error("Bad logistic input");
  let wSum = 0;
  for (let i = 0; i < x.length; i++) wSum += sampleWeights?.[i] ?? 1;
  const penalty = lambda * wSum;
  let beta = new Array<number>(p).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    const grad = new Array<number>(p).fill(0);
    const hess = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < x.length; i++) {
      const w = sampleWeights?.[i] ?? 1;
      const row = x[i];
      const prob = sigmoid(dot(row, beta));
      const r = (prob - y[i]) * w;
      const s = Math.max(prob * (1 - prob), 1e-6) * w;
      for (let a = 0; a < p; a++) {
        grad[a] += r * row[a];
        const sa = s * row[a];
        for (let b = a; b < p; b++) hess[a][b] += sa * row[b];
      }
    }
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < a; b++) hess[a][b] = hess[b][a];
    }
    for (let a = 1; a < p; a++) {
      grad[a] += penalty * beta[a];
      hess[a][a] += penalty;
    }
    hess[0][0] += 1e-9 * wSum;
    const step = solve(hess, grad);
    beta = beta.map((b, i) => b - step[i]);
    if (Math.max(...step.map(Math.abs)) < 1e-7) break;
  }
  return beta;
}
