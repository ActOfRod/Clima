import { describe, expect, it } from "vitest";
import { isSnowCode, isWetCode, weatherLook } from "./weatherCodes";

describe("weatherLook", () => {
  it("maps clear day and night", () => {
    expect(weatherLook(0, true).kind).toBe("sun");
    expect(weatherLook(0, false).kind).toBe("night");
    expect(weatherLook(0, false).label).toBe("Clear");
  });

  it("classifies precipitation", () => {
    expect(isWetCode(61)).toBe(true);
    expect(isWetCode(95)).toBe(true);
    expect(isWetCode(0)).toBe(false);
    expect(isSnowCode(73)).toBe(true);
    expect(isSnowCode(61)).toBe(false);
  });
});
