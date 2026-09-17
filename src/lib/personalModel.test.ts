import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSONAL,
  applyFeedback,
  applyPersonal,
  canFeedback,
} from "./personalModel";
import type { WeatherBundle } from "../types";

describe("personal model", () => {
  it("cools clothing feel after repeated colder reports", () => {
    let model = DEFAULT_PERSONAL;
    model = applyFeedback(model, "colder", "p1", 1);
    model = applyFeedback(model, "colder", "p1", 1 + 3 * 3600_000);
    expect(model.tempBias).toBeLessThan(-0.8);
    expect(canFeedback(model, "p1", 1 + 30 * 60_000)).toBe(false);
  });

  it("raises rain odds when the user says it was wetter", () => {
    const model = applyFeedback(DEFAULT_PERSONAL, "wetter", "p1", 1);
    const bundle = {
      current: { apparentTemperature: 20, rainChance: 40 },
      hourly: [{ apparentTemperature: 20, rainChance: 40 }],
    } as WeatherBundle;
    const next = applyPersonal(bundle, model);
    expect(next.current.rainChance).toBeGreaterThan(40);
  });
});
