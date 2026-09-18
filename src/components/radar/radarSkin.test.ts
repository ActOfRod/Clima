import { describe, expect, it } from "vitest";
import { skinRadarPixels } from "./radarSkin";

describe("skinRadarPixels", () => {
  it("clears near-white rim pixels", () => {
    const data = new Uint8ClampedArray([236, 244, 255, 200]);
    skinRadarPixels(data);
    expect(data[3]).toBe(0);
  });

  it("keeps and saturates real returns", () => {
    const data = new Uint8ClampedArray([40, 190, 70, 220]);
    skinRadarPixels(data);
    expect(data[3]).toBeGreaterThan(150);
    expect(data[1]).toBeGreaterThan(data[0]);
  });
});
