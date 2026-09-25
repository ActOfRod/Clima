import { describe, expect, it } from "vitest";
import { fitLogistic, sigmoid } from "./logistic";
import { fitRidge } from "./ridge";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("fitRidge", () => {
  it("recovers known coefficients with a tiny penalty", () => {
    const rand = rng(1);
    const x: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = rand() * 10 - 5;
      const b = rand() * 10 - 5;
      x.push([1, a, b]);
      y.push(2 + 0.5 * a - 1.5 * b + (rand() - 0.5) * 0.1);
    }
    const w = fitRidge(x, y, 1e-6);
    expect(w[0]).toBeCloseTo(2, 1);
    expect(w[1]).toBeCloseTo(0.5, 1);
    expect(w[2]).toBeCloseTo(-1.5, 1);
  });

  it("shrinks slopes but not the intercept as the penalty grows", () => {
    const x = Array.from({ length: 50 }, (_, i) => [1, i / 10]);
    const y = x.map(([, a]) => 3 + 2 * a);
    const loose = fitRidge(x, y, 1e-6);
    const tight = fitRidge(x, y, 100);
    expect(Math.abs(tight[1])).toBeLessThan(Math.abs(loose[1]));
    expect(tight[0]).toBeGreaterThan(3);
  });
});

describe("fitLogistic", () => {
  it("learns that more model rain means higher odds", () => {
    const rand = rng(7);
    const x: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 600; i++) {
      const signal = rand();
      x.push([1, signal]);
      y.push(rand() < sigmoid(-3 + 6 * signal) ? 1 : 0);
    }
    const w = fitLogistic(x, y, 1e-4);
    expect(w[1]).toBeGreaterThan(3);
    expect(sigmoid(w[0] + w[1] * 0.9)).toBeGreaterThan(0.8);
    expect(sigmoid(w[0] + w[1] * 0.1)).toBeLessThan(0.2);
  });
});
