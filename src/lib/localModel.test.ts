import { describe, expect, it } from "vitest";
import {
  LEADS,
  applyLocalModel,
  hourKey,
  predictForecast,
  stationTrust,
  summarizeLocalModel,
  trainLocalModel,
  type ModelHistory,
  type ObsSeries,
  type PlaceForecast,
} from "./localModel";
import type { WeatherBundle, WeatherStation } from "../types";

const STATION: WeatherStation = {
  id: "KTST",
  name: "Test Field",
  latitude: 40,
  longitude: -75,
  distanceKm: 5,
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function truthAt(ms: number): number {
  const hour = new Date(ms).getUTCHours();
  const day = ms / 86_400_000;
  return 18 + 6 * Math.sin((2 * Math.PI * (hour - 9)) / 24) + 3 * Math.sin(day / 5);
}

/**
 * Three models: "warm" runs 2.5° hot and is jittery, "noisy" is unbiased but
 * very jittery, "good" is close. A plain average inherits the warm bias; the
 * learner should not. (A bias alone is not a reason to distrust a model — the
 * intercept removes it — so "warm" also needs extra noise.)
 */
function synthetic(days = 50) {
  const rand = rng(42);
  const start = Date.UTC(2026, 6, 1);
  const times: string[] = [];
  const obs: ObsSeries = new Map();
  const models = ["warm", "noisy", "good"];
  const temp = LEADS.map(() => models.map(() => [] as Array<number | null>));
  const precip = LEADS.map(() => models.map(() => [] as Array<number | null>));
  for (let h = 0; h < days * 24; h++) {
    const ms = start + h * 3_600_000;
    const time = new Date(ms).toISOString().slice(0, 16);
    times.push(time);
    const truth = truthAt(ms);
    const raining = Math.sin(h / 7) > 0.85;
    obs.set(hourKey(time), { temp: truth + (rand() - 0.5) * 0.4, wet: raining });
    LEADS.forEach((lead) => {
      const spread = 1 + lead * 0.3;
      temp[lead][0].push(truth + 2.5 + (rand() - 0.5) * 3 * spread);
      temp[lead][1].push(truth + (rand() - 0.5) * 4 * spread);
      temp[lead][2].push(truth + (rand() - 0.5) * spread);
      const wetSignal = raining ? 0.6 : 0.05;
      models.forEach((_, m) => {
        precip[lead][m].push(rand() < wetSignal ? rand() * 2 : 0);
      });
    });
  }
  const history: ModelHistory = { times, models, temp, precip };
  return { history, obs, start, days };
}

describe("trainLocalModel", () => {
  it("beats the plain model average and learns to distrust the biased model", () => {
    const { history, obs } = synthetic();
    const model = trainLocalModel(history, obs, STATION, new Date(Date.UTC(2026, 7, 20)));
    const lead0 = model.temp[0]!;
    expect(lead0.useful).toBe(true);
    expect(lead0.mae).toBeLessThan(lead0.baseMae * 0.6);

    const info = summarizeLocalModel(model, []);
    expect(info.status).toBe("active");
    expect(info.trust[0].model).toBe("good");
    expect(info.trust.find((t) => t.model === "warm")!.weight).toBeLessThan(0.34);
  });

  it("learns a rain model that is at least as good as the raw vote", () => {
    const { history, obs } = synthetic();
    const model = trainLocalModel(history, obs, STATION);
    const rain = model.rain[0];
    expect(rain).not.toBeNull();
    expect(rain!.brier).toBeLessThanOrEqual(rain!.baseBrier);
  });

  it("returns no lead models when there are too few observations", () => {
    const { history } = synthetic(5);
    const model = trainLocalModel(history, new Map(), STATION);
    expect(model.temp.every((t) => t == null)).toBe(true);
    expect(summarizeLocalModel(model, []).status).toBe("learning");
  });

  it("measures today's error from the latest observation", () => {
    const { history, obs } = synthetic();
    const lastKey = hourKey(history.times.at(-1)!);
    obs.set(lastKey, { temp: 40, wet: false });
    const model = trainLocalModel(history, obs, STATION);
    expect(model.nowcast?.residual).toBe(5);
  });
});

function forecastFor(start: number, hours: number, bias: number): PlaceForecast {
  const times: string[] = [];
  const temp: number[][] = [[], [], []];
  for (let h = 0; h < hours; h++) {
    const ms = start + h * 3_600_000;
    times.push(new Date(ms).toISOString().slice(0, 16));
    const truth = truthAt(ms);
    temp[0].push(truth + 2.5 + bias);
    temp[1].push(truth + bias);
    temp[2].push(truth + bias);
  }
  return {
    times,
    utcOffsetSeconds: 0,
    models: ["warm", "noisy", "good"],
    temp,
    precip: [times.map(() => 0), times.map(() => 0), times.map(() => 0)],
  };
}

describe("applyLocalModel", () => {
  it("pulls a warm-biased forecast back toward the truth", () => {
    const { history, obs, start, days } = synthetic();
    const model = { ...trainLocalModel(history, obs, STATION), nowcast: undefined };
    const fStart = start + days * 86_400_000;
    const forecast = forecastFor(fStart, 7 * 24, 0);
    const hourly = forecast.times.slice(0, 48).map((time, i) => ({
      time,
      temperature: forecast.temp.reduce((s, series) => s + (series[i] ?? 0), 0) / 3,
      apparentTemperature: 0,
      rainChance: 10,
      precipitation: 0,
      weatherCode: 0,
      windSpeed: 5,
      uvIndex: 0,
      isDay: true,
      humidity: 50,
    }));
    const bundle = {
      place: { id: "p", name: "Test", latitude: 40, longitude: -75 },
      current: { ...hourly[0], time: hourly[0].time, apparentTemperature: 0 },
      hourly,
      daily: [],
      air: {},
      alerts: [],
      updatedAt: "",
      sources: [],
    } as unknown as WeatherBundle;

    const next = applyLocalModel(bundle, model, forecast, fStart);
    const rawErr = hourly.reduce((s, h, i) => s + Math.abs(h.temperature - truthAt(fStart + i * 3_600_000)), 0);
    const mlErr = next.hourly.reduce((s, h, i) => s + Math.abs(h.temperature - truthAt(fStart + i * 3_600_000)), 0);
    expect(mlErr).toBeLessThan(rawErr * 0.5);
    expect(next.current.temperature).toBeCloseTo(next.hourly[0].temperature, 5);
  });

  it("fades the live station correction over the next hours", () => {
    const { history, obs, start, days } = synthetic();
    const fStart = start + days * 86_400_000;
    const model = {
      ...trainLocalModel(history, obs, STATION),
      nowcast: { obsTime: new Date(fStart).toISOString(), obsTemp: 20, residual: 3 },
    };
    const forecast = forecastFor(fStart, 24, 0);
    const preds = predictForecast(model, forecast, fStart);
    expect(preds[0].adj).toBeCloseTo(3, 5);
    expect(preds[5].adj).toBeLessThan(1.5);
    expect(preds[20].adj).toBeLessThan(0.1);
  });
});

describe("predictForecast lead gating", () => {
  it("keeps the raw blend for a lead that trained but failed validation", () => {
    const { history, obs, start, days } = synthetic();
    const trained = trainLocalModel(history, obs, STATION);
    const model = {
      ...trained,
      nowcast: undefined,
      temp: trained.temp.map((t, lead) => (t && lead === 2 ? { ...t, useful: false } : t)),
    };
    const fStart = start + days * 86_400_000;
    const preds = predictForecast(model, forecastFor(fStart, 72, 0), fStart);
    expect(preds[24].temp).not.toBeNull();
    expect(preds[50].temp).toBeNull();
  });
});

describe("stationTrust", () => {
  it("fully trusts nearby stations and ignores far ones", () => {
    expect(stationTrust(8)).toBe(1);
    expect(stationTrust(40)).toBeGreaterThan(0);
    expect(stationTrust(40)).toBeLessThan(1);
    expect(stationTrust(80)).toBe(0);
  });
});
