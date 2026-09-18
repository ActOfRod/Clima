import { describe, expect, it } from "vitest";
import { isGenericPlaceName, localityLine, regionAbbrev } from "./locality";

describe("localityLine", () => {
  it("formats a US city with state abbreviation", () => {
    expect(
      localityLine({
        id: "1",
        name: "Burton",
        admin: "Michigan",
        countryCode: "US",
        latitude: 43,
        longitude: -83,
      }),
    ).toBe("Burton - MI");
  });

  it("does not repeat a generic GPS fallback name", () => {
    expect(isGenericPlaceName("Current location")).toBe(true);
    expect(
      localityLine({
        id: "1",
        name: "Current location",
        latitude: 43,
        longitude: -83,
      }),
    ).toBeNull();
  });
});

describe("regionAbbrev", () => {
  it("keeps already-short codes", () => {
    expect(regionAbbrev("MI", "US")).toBe("MI");
    expect(regionAbbrev("US-MI", "US")).toBe("MI");
  });
});
