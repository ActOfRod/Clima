import { describe, expect, it } from "vitest";
import {
  advancePlayback,
  frameMix,
  frameOpacity,
  startPlayback,
  type PlaybackTiming,
} from "./radarPlayback";

const timing: PlaybackTiming = { frameMs: 500, endHoldMs: 1000, wrapMs: 400 };
const allReady = () => true;

describe("advancePlayback", () => {
  it("moves continuously through frames", () => {
    const s = advancePlayback(startPlayback(0), 250, 5, allReady, timing);
    expect(s.pos).toBeCloseTo(0.5);
    expect(frameMix(s, 5)).toEqual({ from: 0, to: 1, frac: 0.5 });
  });

  it("waits on the current position until the next frame's tiles are loaded", () => {
    const s = advancePlayback({ pos: 1.3, holdMs: 0, wrap: null }, 250, 5, (i) => i !== 2, timing);
    expect(s.pos).toBe(1.3);
  });

  it("rests on the last frame, then fades back to the first instead of dissolving across the loop", () => {
    let s = advancePlayback({ pos: 3.9, holdMs: 0, wrap: null }, 100, 5, allReady, timing);
    expect(s.pos).toBe(4);
    expect(frameMix(s, 5)).toEqual({ from: 4, to: 4, frac: 0 });
    s = advancePlayback(s, 999, 5, allReady, timing);
    expect(s.wrap).toBeNull();
    s = advancePlayback(s, 10, 5, allReady, timing);
    expect(s.wrap).toBe(0);
    s = advancePlayback(s, 200, 5, allReady, timing);
    expect(frameMix(s, 5)).toEqual({ from: 4, to: 0, frac: 0.5 });
    s = advancePlayback(s, 250, 5, allReady, timing);
    expect(s).toEqual(startPlayback(0));
  });

  it("handles a single frame", () => {
    expect(advancePlayback(startPlayback(0), 1000, 1, allReady, timing)).toEqual(startPlayback(0));
  });
});

describe("frameOpacity", () => {
  it("sums to full strength during a dissolve and hides every other frame", () => {
    const mix = { from: 2, to: 3, frac: 0.3 };
    expect(frameOpacity(2, mix) + frameOpacity(3, mix)).toBeCloseTo(1);
    expect(frameOpacity(0, mix)).toBe(0);
    expect(frameOpacity(4, mix)).toBe(0);
  });

  it("shows exactly one frame when paused", () => {
    const mix = { from: 1, to: 1, frac: 0 };
    expect([0, 1, 2].map((i) => frameOpacity(i, mix))).toEqual([0, 1, 0]);
  });
});
