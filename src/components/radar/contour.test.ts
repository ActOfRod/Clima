import { describe, expect, it } from "vitest";
import { chaikinSmooth, marchingSquares, stitchSegments } from "./contour";

describe("contour utils", () => {
  it("extracts contour segments from a binary block", () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ];

    const segments = marchingSquares(grid, 0.5);
    expect(segments.length).toBeGreaterThan(0);

    const lines = stitchSegments(segments);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]!.length).toBeGreaterThanOrEqual(4);
  });

  it("smooths a polyline with chaikin", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];

    const smoothed = chaikinSmooth(points, 1);
    expect(smoothed.length).toBeGreaterThan(points.length);
    expect(smoothed[0]).toEqual(points[0]);
    expect(smoothed.at(-1)).toEqual(points.at(-1));
  });
});
