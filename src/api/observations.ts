import { distanceKm } from "../lib/geo";
import type { HourObs, ObsSeries } from "../lib/localModel";
import type { Place, WeatherStation } from "../types";
import { readJson, removeKey, writeJson } from "../lib/storage";
import { ApiError, getJson, getText } from "./client";
import { isLikelyUs } from "./nws";

const MAX_STATION_KM = 60;
const IEM_RETRY_MS = 4000;
const OBS_CACHE_STATIONS = 4;
/** Re-read this much before the cached end, so late-arriving reports fill in. */
const OVERLAP_MS = 2 * 86_400_000;
const PRECIP_CODES = /(RA|DZ|SN|SG|PL|GR|GS|UP|IC)/;

const CANADA_PROVINCES: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

interface GeoFeature {
  id?: string;
  properties?: {
    stationIdentifier?: string;
    name?: string;
    sname?: string;
    sid?: string;
    online?: boolean;
    archive_end?: string | null;
  };
  geometry?: { coordinates?: [number, number] };
}

interface FeatureCollection {
  features?: GeoFeature[];
}

function nearest(place: Place, candidates: Array<Omit<WeatherStation, "distanceKm">>): WeatherStation | null {
  let best: WeatherStation | null = null;
  for (const c of candidates) {
    const d = distanceKm(place.latitude, place.longitude, c.latitude, c.longitude);
    if (d <= MAX_STATION_KM && (!best || d < best.distanceKm)) best = { ...c, distanceKm: d };
  }
  return best;
}

function toCandidate(f: GeoFeature): Omit<WeatherStation, "distanceKm"> | null {
  const id = f.properties?.stationIdentifier ?? f.properties?.sid ?? f.id;
  const coords = f.geometry?.coordinates;
  if (!id || !coords) return null;
  return {
    id,
    name: f.properties?.name ?? f.properties?.sname ?? id,
    longitude: coords[0],
    latitude: coords[1],
  };
}

async function usStations(place: Place): Promise<Array<Omit<WeatherStation, "distanceKm">>> {
  const data = await getJson<FeatureCollection>(
    `https://api.weather.gov/points/${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}/stations`,
    { headers: { Accept: "application/geo+json" } },
  );
  return (data.features ?? [])
    .map(toCandidate)
    .filter((c): c is Omit<WeatherStation, "distanceKm"> => c != null && /^[A-Z][A-Z0-9]{3}$/.test(c.id));
}

export function iemNetwork(place: Place): string | null {
  const cc = place.countryCode?.toUpperCase();
  if (!cc) return null;
  if (cc === "CA") {
    const admin = place.admin?.trim() ?? "";
    const prov = /^[A-Z]{2}$/.test(admin) ? admin : CANADA_PROVINCES[admin.toLowerCase()];
    return prov ? `CA_${prov}_ASOS` : null;
  }
  return `${cc}__ASOS`;
}

async function iemStations(network: string): Promise<Array<Omit<WeatherStation, "distanceKm">>> {
  const data = await getJson<FeatureCollection>(
    `https://mesonet.agron.iastate.edu/geojson/network/${network}.geojson`,
  );
  return (data.features ?? [])
    .filter((f) => f.properties?.online !== false && f.properties?.archive_end == null)
    .map(toCandidate)
    .filter((c): c is Omit<WeatherStation, "distanceKm"> => c != null);
}

export async function findStation(place: Place): Promise<WeatherStation | null> {
  if (isLikelyUs(place) && (place.countryCode == null || place.countryCode === "US")) {
    return nearest(place, await usStations(place));
  }
  const network = iemNetwork(place);
  if (!network) return null;
  return nearest(place, await iemStations(network));
}

function isWetCode(codes: string): boolean {
  return codes
    .split(/\s+/)
    .map((tok) => tok.replace(/^[+-]/, ""))
    .some((tok) => tok && !tok.startsWith("VC") && PRECIP_CODES.test(tok));
}

/**
 * Parse IEM `asos.py` CSV (station,valid,tmpf,p01i,wxcodes; UTC) into hourly
 * observations. Each report is assigned to the nearest top of hour, matching
 * Open-Meteo's convention that precipitation at T covers the hour ending at T.
 */
export function parseIemCsv(csv: string): ObsSeries {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",") ?? [];
  const col = (name: string) => header.indexOf(name);
  const iValid = col("valid");
  const iTemp = col("tmpf");
  const iPrecip = col("p01i");
  const iWx = col("wxcodes");
  const best = new Map<string, { offset: number; temp: number | null }>();
  const wet = new Map<string, boolean>();

  for (const line of lines) {
    const cells = line.split(",");
    const valid = cells[iValid];
    if (!valid) continue;
    const ms = Date.parse(`${valid.replace(" ", "T")}:00Z`);
    if (!Number.isFinite(ms)) continue;
    const hourMs = Math.round(ms / 3_600_000) * 3_600_000;
    const key = new Date(hourMs).toISOString().slice(0, 13);
    const offset = Math.abs(ms - hourMs);

    const tf = iTemp >= 0 ? Number.parseFloat(cells[iTemp]) : NaN;
    const temp = Number.isFinite(tf) ? ((tf - 32) * 5) / 9 : null;
    const prev = best.get(key);
    if (temp != null && (!prev || prev.temp == null || offset < prev.offset)) {
      best.set(key, { offset, temp });
    } else if (!prev) {
      best.set(key, { offset, temp: null });
    }

    const p = iPrecip >= 0 ? Number.parseFloat(cells[iPrecip]) : NaN;
    const wx = iWx >= 0 ? cells[iWx] ?? "" : "";
    const isWet = (Number.isFinite(p) && p >= 0.005) || (wx !== "null" && isWetCode(wx));
    wet.set(key, (wet.get(key) ?? false) || isWet);
  }

  const out: ObsSeries = new Map();
  for (const [key, v] of best) {
    const obs: HourObs = { temp: v.temp, wet: wet.get(key) ?? null };
    out.set(key, obs);
  }
  return out;
}

type CachedRow = [key: string, temp: number | null, wet: 0 | 1 | null];

interface ObsCache {
  /** Epoch ms up to which the archive has been read. */
  until: number;
  rows: CachedRow[];
}

function readObsCache(id: string): ObsCache | null {
  const cache = readJson<ObsCache | null>(`obs:${id}`, null);
  return cache && Array.isArray(cache.rows) && Number.isFinite(cache.until) ? cache : null;
}

function writeObsCache(id: string, series: ObsSeries, until: number): void {
  const rows: CachedRow[] = [...series].map(([key, o]) => [
    key,
    o.temp == null ? null : Math.round(o.temp * 10) / 10,
    o.wet == null ? null : o.wet ? 1 : 0,
  ]);
  const order = readJson<string[]>("obs-index", []).filter((s) => s !== id);
  for (const evict of order.slice(OBS_CACHE_STATIONS - 1)) removeKey(`obs:${evict}`);
  writeJson("obs-index", [id, ...order].slice(0, OBS_CACHE_STATIONS));
  writeJson<ObsCache>(`obs:${id}`, { until, rows });
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status == null || err.status === 429 || err.status >= 500;
}

/**
 * Hourly station observations for the last `days` days. The archive is
 * intermittently slow (tens of seconds), so readings are kept on the device and
 * later calls only fetch the most recent couple of days. If the archive fails,
 * whatever is cached is returned so training can still run.
 */
export async function fetchObservations(
  station: WeatherStation,
  days: number,
  now = new Date(),
): Promise<ObsSeries> {
  const windowStart = now.getTime() - days * 86_400_000;
  const cache = readObsCache(station.id);
  const cached: ObsSeries = new Map();
  for (const [key, temp, wet] of cache?.rows ?? []) {
    if (Date.parse(`${key}:00Z`) >= windowStart) cached.set(key, { temp, wet: wet == null ? null : wet === 1 });
  }
  const incremental = cache != null && cache.until > windowStart && cached.size > 0;
  const from = incremental ? Math.max(windowStart, cache.until - OVERLAP_MS) : windowStart;

  let fresh: ObsSeries;
  try {
    fresh = await fetchRange(station, new Date(from), now, incremental ? 20_000 : 45_000);
  } catch (err) {
    if (cached.size > 0) return cached;
    throw err;
  }
  const merged: ObsSeries = new Map([...cached, ...fresh]);
  writeObsCache(station.id, merged, now.getTime());
  return merged;
}

async function fetchRange(
  station: WeatherStation,
  start: Date,
  now: Date,
  timeoutMs: number,
): Promise<ObsSeries> {
  const end = new Date(now.getTime() + 86_400_000);
  const params = new URLSearchParams({
    station: station.id,
    tz: "Etc/UTC",
    format: "onlycomma",
    latlon: "no",
    missing: "null",
    trace: "0.0001",
    year1: String(start.getUTCFullYear()),
    month1: String(start.getUTCMonth() + 1),
    day1: String(start.getUTCDate()),
    year2: String(end.getUTCFullYear()),
    month2: String(end.getUTCMonth() + 1),
    day2: String(end.getUTCDate()),
  });
  for (const d of ["tmpf", "p01i", "wxcodes"]) params.append("data", d);
  // Routine hourly METARs only: all the model needs, and a lighter archive query.
  params.append("report_type", "3");
  const url = `https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?${params}`;
  try {
    return parseIemCsv(await getText(url, {}, timeoutMs));
  } catch (err) {
    if (!isRetryable(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, IEM_RETRY_MS));
    return parseIemCsv(await getText(url, {}, timeoutMs));
  }
}
