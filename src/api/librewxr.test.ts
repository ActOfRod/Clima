import { describe, expect, it } from "vitest";
import { radarTileTemplate } from "./librewxr";

describe("radarTileTemplate", () => {
  it("builds a smoothed 256px tile URL for the chosen palette", () => {
    expect(radarTileTemplate("https://api.librewxr.net", "/v2/radar/1790340600", 10, false)).toBe(
      "https://api.librewxr.net/v2/radar/1790340600/256/{z}/{x}/{y}/10/1_1.png",
    );
  });

  it("adds light motion arrows for the dark basemap", () => {
    expect(radarTileTemplate("https://h", "/v2/radar/1", 8, true)).toMatch(/\/8\/1_1\.png\?arrows=light$/);
  });
});
