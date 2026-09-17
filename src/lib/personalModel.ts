import type { PersonalModel, WeatherBundle } from "../types";
import { clamp } from "./stats";

export const DEFAULT_PERSONAL: PersonalModel = {
  tempBias: 0,
  rainScale: 1,
  samples: 0,
  lastByPlace: {},
};

export type FeedbackKind = "accurate" | "colder" | "warmer" | "drier" | "wetter";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const A = 0.22;

export function canFeedback(
  model: PersonalModel,
  placeId: string,
  now = Date.now(),
): boolean {
  const last = model.lastByPlace[placeId];
  if (last == null) return true;
  return now - last >= COOLDOWN_MS;
}

export function applyFeedback(
  model: PersonalModel,
  kind: FeedbackKind,
  placeId: string,
  now = Date.now(),
): PersonalModel {
  if (!canFeedback(model, placeId, now)) return model;
  let { tempBias, rainScale } = model;
  if (kind === "colder") tempBias = tempBias * (1 - A) + -2.5 * A;
  if (kind === "warmer") tempBias = tempBias * (1 - A) + 2.5 * A;
  if (kind === "accurate") {
    tempBias *= 0.8;
    rainScale = 1 + (rainScale - 1) * 0.65;
  }
  if (kind === "wetter") rainScale = rainScale * (1 - A) + 1.5 * A;
  if (kind === "drier") rainScale = rainScale * (1 - A) + 0.7 * A;
  return {
    tempBias: clamp(tempBias, -6, 6),
    rainScale: clamp(rainScale, 0.65, 1.8),
    samples: model.samples + 1,
    lastByPlace: { ...model.lastByPlace, [placeId]: now },
  };
}

export function applyPersonal(
  bundle: WeatherBundle,
  model: PersonalModel,
): WeatherBundle {
  if (model.samples === 0 && model.tempBias === 0 && model.rainScale === 1) {
    return bundle;
  }
  const scaleRain = (p: number) => clamp(p * model.rainScale, 0, 100);
  return {
    ...bundle,
    current: {
      ...bundle.current,
      apparentTemperature: bundle.current.apparentTemperature + model.tempBias,
      rainChance: scaleRain(bundle.current.rainChance),
    },
    hourly: bundle.hourly.map((h) => ({
      ...h,
      apparentTemperature: h.apparentTemperature + model.tempBias,
      rainChance: scaleRain(h.rainChance),
    })),
  };
}
