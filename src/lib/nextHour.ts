/** Minute-scale precipitation for the next two hours: radar nowcast first, model after. */

export const HORIZON_MIN = 120;
export const STEP_MIN = 10;

/** mm/h thresholds (AMS): below WET is treated as dry, then light / moderate / heavy. */
export const WET_MM_H = 0.25;
export const MODERATE_MM_H = 2.5;
export const HEAVY_MM_H = 7.6;

export type RainSource = "radar" | "model";

export interface RatePoint {
  /** Epoch ms. */
  time: number;
  /** Precipitation rate, mm/h. */
  rate: number;
}

export interface NextHourPoint {
  minutes: number;
  time: number;
  rate: number;
  source: RainSource;
}

export type NextHourKind = "dry" | "starting" | "ongoing" | "stopping";

export interface NextHour {
  points: NextHourPoint[];
  kind: NextHourKind;
  headline: string;
  /** Last minute covered by radar, or null when only the model was available. */
  radarUntil: number | null;
}

/** Slippy-map tile and in-tile pixel for a coordinate at zoom `z` (256 px tiles). */
export function tilePixel(lat: number, lon: number, z: number) {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  return { tx, ty, px: Math.floor((x - tx) * 256), py: Math.floor((y - ty) * 256) };
}

/** Rain Viewer–style Black and White scheme (id 0): gray value = dBZ + 32, transparent = no echo. */
export function grayToDbz(gray: number, alpha: number): number | null {
  if (alpha < 128 || gray <= 32) return null;
  return gray - 32;
}

/** Marshall–Palmer Z = 200 R^1.6. */
export function dbzToRate(dbz: number | null): number {
  if (dbz == null || dbz < 10) return 0;
  return (10 ** (dbz / 10) / 200) ** (1 / 1.6);
}

/**
 * Average reflectivity over a small pixel window in linear Z (not dBZ), so a
 * single stray pixel does not dominate and gaps count as no echo.
 */
export function windowRate(rgba: Uint8ClampedArray): number {
  let zSum = 0;
  let count = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const dbz = grayToDbz(rgba[i], rgba[i + 3]);
    zSum += dbz == null ? 0 : 10 ** (dbz / 10);
    count += 1;
  }
  if (!count || zSum === 0) return 0;
  return dbzToRate(10 * Math.log10(zSum / count));
}

function interpolate(series: RatePoint[], t: number): number | null {
  if (!series.length) return null;
  if (t <= series[0].time) return series[0].rate;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    if (t <= b.time) {
      const f = (t - a.time) / (b.time - a.time || 1);
      return a.rate + f * (b.rate - a.rate);
    }
  }
  return null;
}

export function intensity(rate: number): "light" | "moderate" | "heavy" {
  if (rate >= HEAVY_MM_H) return "heavy";
  if (rate >= MODERATE_MM_H) return "moderate";
  return "light";
}

function clock(ms: number, timeZone?: string): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

function inMinutes(minutes: number): string {
  if (minutes <= 5) return "in the next few minutes";
  return `in about ${Math.round(minutes / 5) * 5} minutes`;
}

/**
 * Merge radar and model into 10-minute steps and describe them. Radar is used
 * while it covers the time; the model fills the rest. `radar` should start at
 * the latest observed frame and run through the nowcast.
 */
export function buildNextHour({
  radar,
  model,
  now,
  snow = false,
  timeZone,
}: {
  radar: RatePoint[];
  model: RatePoint[];
  now: number;
  snow?: boolean;
  timeZone?: string;
}): NextHour {
  const radarEnd = radar.length ? radar[radar.length - 1].time : -Infinity;
  const points: NextHourPoint[] = [];
  for (let m = 0; m <= HORIZON_MIN; m += STEP_MIN) {
    const time = now + m * 60_000;
    const fromRadar = time <= radarEnd ? interpolate(radar, time) : null;
    const fromModel = interpolate(model, time);
    if (fromRadar != null) points.push({ minutes: m, time, rate: fromRadar, source: "radar" });
    else if (fromModel != null) points.push({ minutes: m, time, rate: fromModel, source: "model" });
  }
  const radarPoints = points.filter((p) => p.source === "radar");
  const radarUntil = radarPoints.length ? radarPoints[radarPoints.length - 1].minutes : null;

  const what = snow ? "snow" : "rain";
  const horizon = points.length ? points[points.length - 1].minutes : 0;
  const wet = (p: NextHourPoint) => p.rate >= WET_MM_H;
  const first = points[0];
  const raw = [...radar.filter((p) => p.time <= radarEnd), ...model.filter((p) => p.time > radarEnd)];
  /** Peak over the raw series too, so a short burst between 10-minute samples still counts. */
  const peakOf = (spell: NextHourPoint[], until?: NextHourPoint) => {
    const from = spell[0].time - STEP_MIN * 60_000;
    const to = until ? until.time : Infinity;
    const inside = raw.filter((p) => p.time > from && p.time < to).map((p) => p.rate);
    return Math.max(...spell.map((p) => p.rate), ...inside);
  };

  if (!points.length || !points.some(wet)) {
    return {
      points,
      kind: "dry",
      headline: `No ${what} expected for the next ${horizon >= 120 ? "2 hours" : `${horizon} minutes`}.`,
      radarUntil,
    };
  }

  if (first && wet(first)) {
    const stop = points.find((p) => !wet(p));
    const peak = peakOf(points.slice(0, stop ? points.indexOf(stop) : undefined), stop);
    const label = `${intensity(peak)[0].toUpperCase()}${intensity(peak).slice(1)} ${what}`;
    if (!stop) {
      return { points, kind: "ongoing", headline: `${label} now, continuing for at least 2 hours.`, radarUntil };
    }
    return {
      points,
      kind: "stopping",
      headline: `${label} now, easing around ${clock(stop.time, timeZone)}.`,
      radarUntil,
    };
  }

  const start = points.find(wet)!;
  const startIdx = points.indexOf(start);
  const stopAfter = points.slice(startIdx).find((p) => !wet(p));
  const spell = points.slice(startIdx, stopAfter ? points.indexOf(stopAfter) : undefined);
  const peak = peakOf(spell, stopAfter);
  const label = `${intensity(peak)[0].toUpperCase()}${intensity(peak).slice(1)} ${what}`;
  const when =
    start.minutes <= 60
      ? `${inMinutes(start.minutes)} (${clock(start.time, timeZone)})`
      : `around ${clock(start.time, timeZone)}`;
  const end = stopAfter ? `, ending around ${clock(stopAfter.time, timeZone)}` : "";
  return { points, kind: "starting", headline: `${label} starting ${when}${end}.`, radarUntil };
}
