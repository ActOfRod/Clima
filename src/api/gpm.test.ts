import { describe, expect, it } from "vitest";
import { gpmFrames, gpmTileTemplate } from "./gpm";

describe("gpmFrames", () => {
  it("emits GIBS timestamps without milliseconds", () => {
    const frames = gpmFrames(Date.parse("2026-09-17T20:10:00Z"));
    expect(frames.length).toBe(10);
    expect(frames.at(-1)?.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00Z$/);
    expect(gpmTileTemplate(frames[0].id)).toContain("{z}/{y}/{x}.png");
    expect(gpmTileTemplate(frames[0].id)).toContain("IMERG_Precipitation_Rate_30min");
  });
});
