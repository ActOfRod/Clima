import { buildNextHour, tilePixel, windowRate, type NextHour, type RatePoint } from "../lib/nextHour";
import type { Place, RadarCatalog } from "../types";
import { getJson } from "./client";
import { fetchRadarCatalog } from "./librewxr";

/** z8 is ~600 m per pixel at mid-latitudes: fine enough for "at my spot". */
const SAMPLE_ZOOM = 8;
const WINDOW = 3;
const PAST_FRAMES = 2;

async function sampleFrame(url: string, px: number, py: number): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Radar tile ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2D canvas");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const half = Math.floor(WINDOW / 2);
  const x = Math.min(Math.max(0, px - half), canvas.width - WINDOW);
  const y = Math.min(Math.max(0, py - half), canvas.height - WINDOW);
  return windowRate(ctx.getImageData(x, y, WINDOW, WINDOW).data);
}

/** Point rain rate from the latest observed radar frames plus the 1 h optical-flow nowcast. */
export async function fetchRadarRates(catalog: RadarCatalog, place: Place): Promise<RatePoint[]> {
  const { tx, ty, px, py } = tilePixel(place.latitude, place.longitude, SAMPLE_ZOOM);
  const frames = [...catalog.frames.slice(-PAST_FRAMES), ...catalog.nowcast];
  const rates = await Promise.all(
    frames.map((f) =>
      sampleFrame(`${catalog.host}${f.path}/256/${SAMPLE_ZOOM}/${tx}/${ty}/0/0_0.png`, px, py),
    ),
  );
  return frames.map((f, i) => ({ time: f.time * 1000, rate: rates[i] })).sort((a, b) => a.time - b.time);
}

interface MinutelyResponse {
  minutely_15?: { time: string[]; precipitation: Array<number | null> };
}

/** Open-Meteo 15-minute precipitation (HRRR in the US), as mm/h at each interval's midpoint. */
export async function fetchMinutelyRates(place: Place): Promise<RatePoint[]> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    minutely_15: "precipitation",
    past_minutely_15: "1",
    forecast_minutely_15: "12",
    timezone: "GMT",
  });
  const data = await getJson<MinutelyResponse>(`https://api.open-meteo.com/v1/forecast?${params}`);
  const m = data.minutely_15;
  if (!m?.time?.length) return [];
  return m.time
    .map((t, i) => ({
      time: Date.parse(`${t}Z`) - 7.5 * 60_000,
      rate: (m.precipitation[i] ?? 0) * 4,
    }))
    .filter((p) => Number.isFinite(p.time));
}

export async function loadNextHour(place: Place, snow: boolean): Promise<NextHour> {
  const [radar, model] = await Promise.allSettled([
    fetchRadarCatalog().then((catalog) => fetchRadarRates(catalog, place)),
    fetchMinutelyRates(place),
  ]);
  const radarRates = radar.status === "fulfilled" ? radar.value : [];
  const modelRates = model.status === "fulfilled" ? model.value : [];
  if (!radarRates.length && !modelRates.length) throw new Error("No short-range precipitation data");
  return buildNextHour({
    radar: radarRates,
    model: modelRates,
    now: Date.now(),
    snow,
    timeZone: place.timezone,
  });
}
