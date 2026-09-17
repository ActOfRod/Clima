import { describe, expect, it } from "vitest";
import {
  RADAR_OPACITY,
  blendOpacities,
  frameBlend,
  loopPos,
  tileUrls,
  tileUrlsForFrames,
  tileZoom,
  visibleTileRange,
} from "./radarPlayback";

describe("radarPlayback", () => {
  it("wraps loop positions", () => {
    expect(loopPos(11, 11)).toBe(0);
    expect(loopPos(-0.25, 11)).toBe(10.75);
    expect(loopPos(3.2, 0)).toBe(0);
  });

  it("blends into the next frame and wraps the last one", () => {
    expect(frameBlend(0, 11)).toEqual({ from: 0, to: 1, frac: 0 });
    expect(frameBlend(4.25, 11)).toEqual({ from: 4, to: 5, frac: 0.25 });
    expect(frameBlend(10.25, 11)).toEqual({ from: 10, to: 0, frac: 0.25 });
    expect(frameBlend(0, 1)).toEqual({ from: 0, to: 0, frac: 0 });
  });

  it("holds the current frame until the next tiles are ready", () => {
    expect(blendOpacities(0.4, false)).toEqual({ from: RADAR_OPACITY, to: 0 });
    expect(blendOpacities(0.5, true)).toEqual({
      from: RADAR_OPACITY / 2,
      to: RADAR_OPACITY / 2,
    });
    expect(blendOpacities(0, true)).toEqual({ from: RADAR_OPACITY, to: 0 });
    expect(blendOpacities(1, true)).toEqual({ from: 0, to: RADAR_OPACITY });
  });

  it("caps tile zoom at the native maximum", () => {
    expect(tileZoom(10.4, 8)).toBe(8);
    expect(tileZoom(3.6, 8)).toBe(4);
  });

  it("builds viewport tile ranges and both XYZ templates", () => {
    const range = visibleTileRange(
      { west: -84, south: 41, east: -82, north: 43 },
      7,
      0,
    );
    expect(range.z).toBe(7);
    expect(range.maxX).toBeGreaterThanOrEqual(range.minX);
    expect(range.maxY).toBeGreaterThanOrEqual(range.minY);

    const nexrad = tileUrls("https://tiles/{z}/{x}/{y}.png", {
      z: 2,
      minX: 1,
      maxX: 1,
      minY: 1,
      maxY: 1,
    });
    expect(nexrad).toEqual(["https://tiles/2/1/1.png"]);

    const gpm = tileUrls("https://tiles/{z}/{y}/{x}.png", {
      z: 2,
      minX: 1,
      maxX: 1,
      minY: 0,
      maxY: 0,
    });
    expect(gpm).toEqual(["https://tiles/2/0/1.png"]);
  });

  it("prefers earlier frames when the prefetch budget is tight", () => {
    const urls = tileUrlsForFrames(
      ["a/{z}/{x}/{y}", "b/{z}/{x}/{y}"],
      { z: 1, minX: 0, maxX: 1, minY: 0, maxY: 0 },
      3,
    );
    expect(urls).toEqual(["a/1/0/0", "a/1/1/0", "b/1/0/0"]);
  });
});
