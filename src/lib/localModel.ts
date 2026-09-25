import type {
  DayPoint,
  LocalModelInfo,
  ModelTrust,
  SkillSnapshot,
  WeatherBundle,
  WeatherStation,
} from "../types";
import { dot } from "./ml/linalg";
import { fitLogistic, sigmoid } from "./ml/logistic";
import { fitRidge } from "./ml/ridge";
import { clamp, finite, mean } from "./stats";

export const LOCAL_MODEL_VERSION = 1;

/** Forecast lead buckets: 0 = 0–23 h ahead, 1 = 24–47 h, 2 = 48–71 h, 3 = 72 h+. */
export const LEADS = [0, 1, 2, 3] as const;

export const MODEL_LABELS: Record<string, string> = {
  gfs_seamless: "GFS (NOAA)",
  ecmwf_ifs025: "ECMWF",
  icon_seamless: "ICON (DWD)",
  gem_seamless: "GEM (Canada)",
  ukmo_seamless: "UKMO (Met Office)",
  ncep_nbm_conus: "NBM (NOAA blend)",
};

const HALF_LIFE_DAYS = 21;
const MIN_ROWS = 240;
const MIN_MODEL_COVERAGE = 0.6;
const WET_MM = 0.1;
const TEMP_LAMBDAS = [0.003, 0.01, 0.03, 0.1, 0.3, 1];
const RAIN_LAMBDAS = [0.001, 0.01, 0.1];
const NOWCAST_E_FOLD_H = 5;
const NOWCAST_MAX_AGE_H = 3;
const FULL_TRUST_KM = 15;
const MAX_STATION_KM = 60;

/** Past model output at the station, as issued `lead` days before each hour. Times are UTC. */
export interface ModelHistory {
  times: string[];
  models: string[];
  /** [lead][model][hour] */
  temp: Array<Array<Array<number | null>>>;
  precip: Array<Array<Array<number | null>>>;
}

export interface HourObs {
  temp: number | null;
  wet: boolean | null;
}

/** Keyed by UTC hour, `YYYY-MM-DDTHH`. */
export type ObsSeries = Map<string, HourObs>;

/** Current multi-model forecast at the place. Times are local to the place. */
export interface PlaceForecast {
  times: string[];
  utcOffsetSeconds: number;
  models: string[];
  temp: Array<Array<number | null>>;
  precip: Array<Array<number | null>>;
}

export interface LeadTempModel {
  models: string[];
  weights: number[];
  levelRef: number;
  lambda: number;
  mae: number;
  baseMae: number;
  modelMae: Array<number | null>;
  n: number;
  useful: boolean;
}

export interface LeadRainModel {
  weights: number[];
  brier: number;
  baseBrier: number;
  n: number;
  useful: boolean;
}

export interface TrainedLocalModel {
  version: number;
  trainedAt: string;
  station: WeatherStation;
  temp: Array<LeadTempModel | null>;
  rain: Array<LeadRainModel | null>;
  nowcast?: { obsTime: string; obsTemp: number; residual: number };
}

export function hourKey(time: string): string {
  return time.slice(0, 13);
}

function utcMs(isoNoZone: string): number {
  return Date.parse(`${isoNoZone.slice(0, 16)}Z`);
}

function tempRow(
  vals: Array<number | null>,
  utcHour: number,
  levelRef: number,
): { mu: number; x: number[] } | null {
  const avail = finite(vals);
  if (avail.length < 2) return null;
  const mu = mean(avail);
  const ang = (2 * Math.PI * utcHour) / 24;
  return {
    mu,
    x: [
      1,
      Math.sin(ang),
      Math.cos(ang),
      (mu - levelRef) / 5,
      ...vals.map((v) => (v == null ? 0 : v - mu)),
    ],
  };
}

function rainRow(
  series: Array<Array<number | null>>,
  i: number,
): { wetFrac: number; x: number[] } | null {
  const now = finite(series.map((s) => s[i]));
  if (now.length < 2) return null;
  const wetFrac = now.filter((p) => p >= WET_MM).length / now.length;
  const smooth = finite(
    series.map((s) => {
      const window = finite([s[i - 1], s[i], s[i + 1]]);
      return window.length ? mean(window) : null;
    }),
  );
  return {
    wetFrac,
    x: [
      1,
      wetFrac,
      Math.log1p(mean(now)),
      Math.log1p(Math.max(...now)),
      Math.log1p(smooth.length ? mean(smooth) : 0),
    ],
  };
}

function recencyWeights(times: number[]): number[] {
  const latest = Math.max(...times);
  return times.map((t) => 0.5 ** ((latest - t) / 86_400_000 / HALF_LIFE_DAYS));
}

function trainTempLead(
  history: ModelHistory,
  obs: ObsSeries,
  lead: number,
): LeadTempModel | null {
  const withObs = history.times
    .map((t, i) => ({ i, t, o: obs.get(hourKey(t))?.temp ?? null }))
    .filter((r): r is { i: number; t: string; o: number } => r.o != null);
  if (withObs.length < MIN_ROWS) return null;

  const modelIdx = history.models
    .map((_, m) => m)
    .filter((m) => {
      const series = history.temp[lead]?.[m];
      if (!series) return false;
      const have = withObs.filter((r) => series[r.i] != null).length;
      return have / withObs.length >= MIN_MODEL_COVERAGE;
    });
  if (modelIdx.length < 2) return null;

  const valsAt = (i: number) => modelIdx.map((m) => history.temp[lead][m][i]);
  const mus = withObs.map((r) => finite(valsAt(r.i)));
  const levelRef = mean(mus.filter((v) => v.length >= 2).map(mean));

  const rows: Array<{ x: number[]; y: number; o: number; mu: number; vals: Array<number | null>; ms: number }> = [];
  for (const r of withObs) {
    const vals = valsAt(r.i);
    const ms = utcMs(r.t);
    const row = tempRow(vals, new Date(ms).getUTCHours(), levelRef);
    if (!row) continue;
    rows.push({ x: row.x, y: r.o - row.mu, o: r.o, mu: row.mu, vals, ms });
  }
  if (rows.length < MIN_ROWS) return null;

  const weights = recencyWeights(rows.map((r) => r.ms));
  const split = Math.floor(rows.length * 0.8);
  const train = rows.slice(0, split);
  const val = rows.slice(split);
  const trainW = weights.slice(0, split);

  let best = { lambda: TEMP_LAMBDAS[0], mae: Infinity };
  for (const lambda of TEMP_LAMBDAS) {
    try {
      const w = fitRidge(train.map((r) => r.x), train.map((r) => r.y), lambda, trainW);
      const mae = mean(val.map((r) => Math.abs(r.y - dot(r.x, w))));
      if (mae < best.mae) best = { lambda, mae };
    } catch {
      /* singular for this lambda; try the next */
    }
  }
  if (!Number.isFinite(best.mae)) return null;

  const baseMae = mean(val.map((r) => Math.abs(r.y)));
  const modelMae = modelIdx.map((_, k) => {
    const errs = finite(val.map((r) => (r.vals[k] == null ? null : Math.abs(r.o - r.vals[k]!))));
    return errs.length ? mean(errs) : null;
  });
  const final = fitRidge(rows.map((r) => r.x), rows.map((r) => r.y), best.lambda, weights);

  return {
    models: modelIdx.map((m) => history.models[m]),
    weights: final,
    levelRef,
    lambda: best.lambda,
    mae: best.mae,
    baseMae,
    modelMae,
    n: rows.length,
    useful: best.mae < baseMae * 0.98,
  };
}

function brier(probs: number[], outcomes: number[]): number {
  return mean(probs.map((p, i) => (p - outcomes[i]) ** 2));
}

function trainRainLead(
  history: ModelHistory,
  obs: ObsSeries,
  lead: number,
): LeadRainModel | null {
  const series = history.precip[lead];
  if (!series?.length) return null;
  const rows: Array<{ x: number[]; y: number; wetFrac: number; ms: number }> = [];
  history.times.forEach((t, i) => {
    const wet = obs.get(hourKey(t))?.wet;
    if (wet == null) return;
    const row = rainRow(series, i);
    if (!row) return;
    rows.push({ x: row.x, y: wet ? 1 : 0, wetFrac: row.wetFrac, ms: utcMs(t) });
  });
  const wetCount = rows.filter((r) => r.y === 1).length;
  if (rows.length < MIN_ROWS || wetCount < 12) return null;

  const weights = recencyWeights(rows.map((r) => r.ms));
  const split = Math.floor(rows.length * 0.8);
  const train = rows.slice(0, split);
  const val = rows.slice(split);
  const trainW = weights.slice(0, split);
  const valY = val.map((r) => r.y);

  let best = { lambda: RAIN_LAMBDAS[0], brier: Infinity };
  for (const lambda of RAIN_LAMBDAS) {
    try {
      const w = fitLogistic(train.map((r) => r.x), train.map((r) => r.y), lambda, trainW);
      const b = brier(val.map((r) => sigmoid(dot(r.x, w))), valY);
      if (b < best.brier) best = { lambda, brier: b };
    } catch {
      /* try the next lambda */
    }
  }
  if (!Number.isFinite(best.brier)) return null;

  const baseBrier = brier(val.map((r) => r.wetFrac), valY);
  const final = fitLogistic(rows.map((r) => r.x), rows.map((r) => r.y), best.lambda, weights);
  const valWet = valY.filter((y) => y === 1).length;
  return {
    weights: final,
    brier: best.brier,
    baseBrier,
    n: rows.length,
    useful: valWet >= 3 && best.brier < baseBrier * 0.98,
  };
}

function predictTemp(
  lm: LeadTempModel,
  valueOf: (model: string) => number | null,
  utcHour: number,
): { mu: number; pred: number } | null {
  const row = tempRow(lm.models.map(valueOf), utcHour, lm.levelRef);
  if (!row) return null;
  return { mu: row.mu, pred: row.mu + dot(row.x, lm.weights) };
}

function latestNowcast(
  history: ModelHistory,
  obs: ObsSeries,
  lead0: LeadTempModel | null,
): TrainedLocalModel["nowcast"] {
  for (let i = history.times.length - 1; i >= 0; i--) {
    const t = history.times[i];
    const o = obs.get(hourKey(t))?.temp;
    if (o == null) continue;
    const idx = (name: string) => history.models.indexOf(name);
    const ms = utcMs(t);
    const hour = new Date(ms).getUTCHours();
    let pred: number | null = null;
    if (lead0?.useful) {
      pred = predictTemp(lead0, (m) => history.temp[0][idx(m)]?.[i] ?? null, hour)?.pred ?? null;
    }
    if (pred == null) {
      const vals = finite(history.models.map((_, m) => history.temp[0][m]?.[i]));
      if (vals.length < 2) return undefined;
      pred = mean(vals);
    }
    return {
      obsTime: new Date(ms).toISOString(),
      obsTemp: o,
      residual: clamp(o - pred, -5, 5),
    };
  }
  return undefined;
}

export function trainLocalModel(
  history: ModelHistory,
  obs: ObsSeries,
  station: WeatherStation,
  now = new Date(),
): TrainedLocalModel {
  const temp = LEADS.map((lead) => trainTempLead(history, obs, lead));
  const rain = LEADS.map((lead) => trainRainLead(history, obs, lead));
  return {
    version: LOCAL_MODEL_VERSION,
    trainedAt: now.toISOString(),
    station,
    temp,
    rain,
    nowcast: latestNowcast(history, obs, temp[0]),
  };
}

/**
 * Open-Meteo's archived "previous day N" series are roughly 24N to 24N+6 hours
 * ahead, so each forecast hour uses the nearest lead rather than the one below.
 */
function leadBucket(leadHours: number): number {
  return Math.min(3, Math.round(Math.max(0, leadHours) / 24));
}

/**
 * A lead that trained but failed validation keeps the raw blend. Only a lead
 * with too little data borrows the nearest shorter lead.
 */
function usableTemp(model: TrainedLocalModel, lead: number): LeadTempModel | null {
  for (let l = lead; l >= 0; l--) {
    const lm = model.temp[l];
    if (lm) return lm.useful ? lm : null;
  }
  return null;
}

export function stationTrust(distanceKm: number): number {
  if (distanceKm <= FULL_TRUST_KM) return 1;
  return clamp(1 - (distanceKm - FULL_TRUST_KM) / (MAX_STATION_KM - FULL_TRUST_KM), 0, 1);
}

interface HourPrediction {
  mu: number | null;
  /** Learned temperature, or null when no lead model beat the raw average. */
  temp: number | null;
  /** Decaying correction from the latest station observation. */
  adj: number;
  rain: number | null;
}

export function predictForecast(
  model: TrainedLocalModel,
  forecast: PlaceForecast,
  now = Date.now(),
): HourPrediction[] {
  const idx = new Map(forecast.models.map((m, i) => [m, i]));
  const nowcast = model.nowcast;
  const nowcastMs = nowcast ? Date.parse(nowcast.obsTime) : NaN;
  const nowcastFresh =
    nowcast != null && (now - nowcastMs) / 3_600_000 <= NOWCAST_MAX_AGE_H;

  return forecast.times.map((time, i) => {
    const ms = utcMs(time) - forecast.utcOffsetSeconds * 1000;
    const hour = new Date(ms).getUTCHours();
    const lead = leadBucket((ms - now) / 3_600_000);
    const valueOf = (m: string) => {
      const k = idx.get(m);
      return k == null ? null : (forecast.temp[k]?.[i] ?? null);
    };
    const vals = finite(forecast.models.map((m) => valueOf(m)));
    const mu = vals.length ? mean(vals) : null;

    let temp: number | null = null;
    const lm = usableTemp(model, lead);
    if (lm) temp = predictTemp(lm, valueOf, hour)?.pred ?? null;
    let adj = 0;
    if (nowcastFresh && ms >= nowcastMs) {
      const k = (ms - nowcastMs) / 3_600_000;
      adj = nowcast!.residual * Math.exp(-k / NOWCAST_E_FOLD_H);
    }

    let rain: number | null = null;
    const rm = model.rain[lead];
    if (rm?.useful) {
      const series = forecast.models.map((_, k) => forecast.precip[k] ?? []);
      const row = rainRow(series, i);
      if (row) rain = sigmoid(dot(row.x, rm.weights)) * 100;
    }
    return { mu, temp, adj, rain };
  });
}

function adjustDaily(
  daily: DayPoint[],
  forecast: PlaceForecast,
  preds: HourPrediction[],
  trust: number,
): DayPoint[] {
  return daily.map((d) => {
    const hours = forecast.times
      .map((t, i) => ({ t, p: preds[i] }))
      .filter((h) => h.t.slice(0, 10) === d.date.slice(0, 10));
    const paired = hours.filter(
      (h): h is { t: string; p: HourPrediction & { mu: number; temp: number } } =>
        h.p.mu != null && h.p.temp != null,
    );
    let next = d;
    if (paired.length >= 18) {
      const learned = paired.map((h) => h.p.temp + h.p.adj);
      const raw = paired.map((h) => h.p.mu);
      const dMax = Math.max(...learned) - Math.max(...raw);
      const dMin = Math.min(...learned) - Math.min(...raw);
      next = { ...next, tempMax: d.tempMax + trust * dMax, tempMin: d.tempMin + trust * dMin };
    }
    const rains = finite(hours.map((h) => h.p.rain));
    if (rains.length >= 18) {
      const learned = Math.max(...rains);
      next = {
        ...next,
        rainChance: Math.round(clamp(d.rainChance + trust * 0.5 * (learned - d.rainChance), 0, 100)),
      };
    }
    return next;
  });
}

/**
 * Replace the fixed-weight temperature blend with the locally trained model and
 * mix learned rain odds 50/50 with the consensus. Everything is scaled by how far
 * the training station is from the place.
 */
export function applyLocalModel(
  bundle: WeatherBundle,
  model: TrainedLocalModel,
  forecast: PlaceForecast,
  now = Date.now(),
): WeatherBundle {
  const trust = stationTrust(model.station.distanceKm);
  if (trust <= 0) return bundle;
  const preds = predictForecast(model, forecast, now);
  const byKey = new Map(forecast.times.map((t, i) => [hourKey(t), preds[i]]));

  const deltas = new Map<string, number>();
  const hourly = bundle.hourly.map((h) => {
    const p = byKey.get(hourKey(h.time));
    if (!p) return h;
    let next = h;
    if (p.temp != null || p.adj !== 0) {
      const delta = trust * ((p.temp ?? h.temperature) + p.adj - h.temperature);
      deltas.set(hourKey(h.time), delta);
      next = {
        ...next,
        temperature: h.temperature + delta,
        apparentTemperature: h.apparentTemperature + delta,
        tempLow: h.tempLow != null ? h.tempLow + delta : undefined,
        tempHigh: h.tempHigh != null ? h.tempHigh + delta : undefined,
      };
    }
    if (p.rain != null) {
      next = {
        ...next,
        rainChance: Math.round(clamp(h.rainChance + trust * 0.5 * (p.rain - h.rainChance), 0, 100)),
      };
    }
    return next;
  });

  const currentKey = hourKey(bundle.current.time);
  const delta = deltas.get(currentKey) ?? 0;
  const currentHour = hourly.find((h) => hourKey(h.time) === currentKey);
  const c = bundle.current;
  const current = {
    ...c,
    temperature: c.temperature + delta,
    apparentTemperature: c.apparentTemperature + delta,
    tempLow: c.tempLow != null ? c.tempLow + delta : undefined,
    tempHigh: c.tempHigh != null ? c.tempHigh + delta : undefined,
    rainChance: currentHour?.rainChance ?? c.rainChance,
  };

  const next12 = hourly.slice(0, 12);
  const skill = bundle.skill
    ? {
        ...bundle.skill,
        rangeLow: next12.length ? Math.min(...next12.map((h) => h.tempLow ?? h.temperature)) : bundle.skill.rangeLow,
        rangeHigh: next12.length ? Math.max(...next12.map((h) => h.tempHigh ?? h.temperature)) : bundle.skill.rangeHigh,
        sources: [...bundle.skill.sources, "Clima local ML"],
      }
    : undefined;

  return {
    ...bundle,
    current,
    hourly,
    daily: adjustDaily(bundle.daily, forecast, preds, trust),
    skill,
    sources: [...bundle.sources, `Station ${model.station.id}`],
  };
}

function modelTrust(lm: LeadTempModel): ModelTrust[] {
  const m = lm.models.length;
  const anomaly = lm.weights.slice(4);
  const avg = mean(anomaly);
  const level = lm.weights[3] / 5;
  const raw = lm.models.map((_, k) => Math.max(0, (1 + level) / m + anomaly[k] - avg));
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return lm.models
    .map((model, k) => ({
      model,
      label: MODEL_LABELS[model] ?? model,
      weight: raw[k] / total,
      mae: lm.modelMae[k],
    }))
    .sort((a, b) => b.weight - a.weight);
}

export function summarizeLocalModel(
  model: TrainedLocalModel,
  history: SkillSnapshot[],
): LocalModelInfo {
  const lead0 = model.temp[0];
  const rain0 = model.rain.find((r) => r?.useful) ?? null;
  const singles = lead0
    ? lead0.models
        .map((m, k) => ({ label: MODEL_LABELS[m] ?? m, mae: lead0.modelMae[k] }))
        .filter((s): s is { label: string; mae: number } => s.mae != null)
        .sort((a, b) => a.mae - b.mae)
    : [];
  return {
    status: lead0?.useful ? "active" : "learning",
    station: model.station,
    trainedAt: model.trainedAt,
    samples: lead0?.n ?? 0,
    tempMae: lead0?.mae,
    baselineMae: lead0?.baseMae,
    bestSingle: singles[0],
    rainBrier: rain0?.brier,
    rainBaselineBrier: rain0?.baseBrier,
    trust: lead0 ? modelTrust(lead0) : [],
    leads: model.temp.map((t) =>
      t ? { mae: t.mae, base: t.baseMae, useful: t.useful } : null,
    ),
    nowcast: model.nowcast,
    history,
  };
}
