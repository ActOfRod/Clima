import { distanceKm } from "../lib/geo";
import type { HourObs, ObsSeries } from "../lib/localModel";
import type { Place, WeatherStation } from "../types";
import { getJson, getText } from "./client";
import { isLikelyUs } from "./nws";

const MAX_STATION_KM = 60;
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

export async function fetchObservations(
  station: WeatherStation,
  days: number,
  now = new Date(),
): Promise<ObsSeries> {
  const start = new Date(now.getTime() - days * 86_400_000);
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
  for (const r of ["3", "4"]) params.append("report_type", r);
  const csv = await getText(
    `https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?${params}`,
  );
  return parseIemCsv(csv);
}
