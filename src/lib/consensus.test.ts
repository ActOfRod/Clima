import { describe, expect, it } from "vitest";
import { blendRain, blendTemp, buildSkill, hourAgreement } from "./consensus";

describe("blendRain", () => {
  it("pulls a cocky official 10% up when the ensemble is wet", () => {
    const blended = blendRain(10, 0.7);
    expect(blended).toBeGreaterThan(30);
    expect(blended).toBeLessThan(70);
  });

  it("does not treat 50/50 members as a dry day", () => {
    expect(blendRain(15, 0.5)).toBeGreaterThan(25);
  });
});

describe("blendTemp", () => {
  it("leans on NBM later in the US forecast", () => {
    const near = blendTemp(20, 30, 2, true);
    const later = blendTemp(20, 30, 18, true);
    expect(later).toBeGreaterThan(near);
  });
});

describe("hourAgreement", () => {
  it("scores tight temps + dry members as high", () => {
    expect(hourAgreement([20, 20.3, 19.8, 20.1], 0.02)).toBeGreaterThan(80);
  });

  it("drops when members split on rain", () => {
    const dry = hourAgreement([20, 21, 19.5], 0.05);
    const split = hourAgreement([20, 21, 19.5], 0.5);
    expect(split).toBeLessThan(dry);
  });
});

describe("buildSkill", () => {
  it("labels a split pattern as not high confidence", () => {
    const skill = buildSkill(
      Array.from({ length: 12 }, () => ({
        agreement: 48,
        tempSpread: 3.2,
        precipFrac: 0.45,
      })),
      ["GEFS"],
    );
    expect(skill.label).not.toBe("High");
    expect(skill.rainSplit).toBe(true);
    expect(skill.reason.toLowerCase()).toMatch(/messy|rain|disagree|split|jumpy/);
  });
});
