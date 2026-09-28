import { describe, expect, it } from "vitest";
import {
  buildNextHour,
  dbzToRate,
  grayToDbz,
  tilePixel,
  windowRate,
  type RatePoint,
} from "./nextHour";

const NOW = Date.UTC(2026, 8, 28, 18, 0);
const at = (min: number, rate: number): RatePoint => ({ time: NOW + min * 60_000, rate });

describe("radar decoding", () => {
  it("reads Black and White pixels as dBZ + 32", () => {
    expect(grayToDbz(52, 255)).toBe(20);
    expect(grayToDbz(52, 0)).toBeNull();
    expect(grayToDbz(20, 255)).toBeNull();
  });

  it("converts reflectivity to rain rate with Marshall–Palmer", () => {
    expect(dbzToRate(20)).toBeCloseTo(0.65, 1);
    expect(dbzToRate(40)).toBeCloseTo(11.5, 0);
    expect(dbzToRate(5)).toBe(0);
  });

  it("averages a pixel window in linear Z", () => {
    const one = new Uint8ClampedArray([72, 72, 72, 255]);
    const withGaps = new Uint8ClampedArray([72, 72, 72, 255, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(windowRate(withGaps)).toBeLessThan(windowRate(one));
    expect(windowRate(new Uint8ClampedArray([0, 0, 0, 0]))).toBe(0);
  });

  it("finds the tile and pixel for a coordinate", () => {
    const { tx, ty, px, py } = tilePixel(0, 0, 1);
    expect([tx, ty, px, py]).toEqual([1, 1, 0, 0]);
    const detroit = tilePixel(42.33, -83.05, 8);
    expect(detroit.tx).toBe(68);
    expect(detroit.ty).toBe(94);
  });
});

describe("buildNextHour", () => {
  it("says dry when nothing is coming", () => {
    const next = buildNextHour({ radar: [at(-5, 0), at(60, 0)], model: [at(0, 0), at(130, 0)], now: NOW });
    expect(next.kind).toBe("dry");
    expect(next.headline).toBe("No rain expected for the next 2 hours.");
    expect(next.points).toHaveLength(13);
  });

  it("prefers radar while it covers the time, then the model", () => {
    const next = buildNextHour({ radar: [at(-5, 0), at(55, 0)], model: [at(0, 0), at(130, 0)], now: NOW });
    expect(next.points[5].source).toBe("radar");
    expect(next.points[6].source).toBe("model");
    expect(next.radarUntil).toBe(50);
  });

  it("times the start and end of an incoming shower", () => {
    const radar = [at(-5, 0), at(15, 0), at(25, 1.2), at(35, 3), at(45, 0.1), at(55, 0)];
    const next = buildNextHour({ radar, model: [at(0, 0), at(130, 0)], now: NOW, timeZone: "UTC" });
    expect(next.kind).toBe("starting");
    expect(next.headline).toMatch(/^Moderate rain starting in about 20 minutes \(6:20\s?PM\), ending around 6:50\s?PM\.$/);
  });

  it("describes rain that is already falling and when it eases", () => {
    const radar = [at(-5, 1), at(25, 1), at(35, 0)];
    const next = buildNextHour({ radar, model: [at(0, 0), at(130, 0)], now: NOW, timeZone: "UTC" });
    expect(next.kind).toBe("stopping");
    expect(next.headline).toMatch(/^Light rain now, easing around 6:40\s?PM\.$/);
  });

  it("uses snow wording when it is cold", () => {
    const next = buildNextHour({ radar: [at(-5, 9), at(60, 9)], model: [at(0, 9), at(130, 9)], now: NOW, snow: true });
    expect(next.headline).toBe("Heavy snow now, continuing for at least 2 hours.");
  });
});
