import type { RadarCatalog, RadarFrame } from "../types";
import { getJson } from "./client";

export const LIBREWXR_API = "https://api.librewxr.net";

export const LIBREWXR_ATTRIBUTION =
  'Radar &copy; <a href="https://librewxr.net" target="_blank" rel="noreferrer">LibreWXR</a> (CC-BY-4.0)';

/** `legend` is an approximate light→heavy gradient for the key under the map. */
export const RADAR_PALETTES = [
  { id: 10, label: "Viper HD", legend: ["#3aa0ff", "#2fd35a", "#f7e03c", "#f0413a", "#d24cff"] },
  { id: 8, label: "Dark Sky", legend: ["#9fd8ff", "#3f8cff", "#6b4cff", "#ff4f7a"] },
  { id: 6, label: "NEXRAD Level III", legend: ["#04e9e7", "#02fd02", "#fdf802", "#fd0000", "#f800fd"] },
  { id: 4, label: "Weather Channel", legend: ["#63d163", "#1f8f3a", "#f7d51e", "#e8601c", "#c61a4a"] },
  { id: 2, label: "Universal Blue", legend: ["#a8d8ff", "#4a9cff", "#1f4fd8", "#ffd23c", "#ff5a36"] },
  { id: 11, label: "MRMS CREF", legend: ["#00ecec", "#00c800", "#ffff00", "#ff0000", "#ff00ff"] },
] as const;

export function paletteLegend(id: number): readonly string[] {
  return (RADAR_PALETTES.find((p) => p.id === id) ?? RADAR_PALETTES[0]).legend;
}

export const DEFAULT_RADAR_PALETTE = 10;

interface WeatherMapsResponse {
  host?: string;
  radar?: {
    past?: RadarFrame[];
    nowcast?: RadarFrame[];
  };
  satellite?: {
    infrared?: RadarFrame[];
  };
}

const toFrames = (list?: RadarFrame[]): RadarFrame[] =>
  (list ?? []).map((f) => ({ time: f.time, path: f.path }));

/**
 * Rain Viewer v2–compatible catalog: ~2 h of past radar frames, a 1 h nowcast,
 * and ~12 h of hourly NOAA GMGSI satellite frames.
 */
export async function fetchRadarCatalog(): Promise<RadarCatalog> {
  const data = await getJson<WeatherMapsResponse>(`${LIBREWXR_API}/public/weather-maps.json`);
  const host = (data.host ?? LIBREWXR_API).replace(/\/$/, "");
  const frames = toFrames(data.radar?.past);
  if (!frames.length) throw new Error("No radar frames");
  return {
    host,
    frames,
    nowcast: toFrames(data.radar?.nowcast),
    satellite: toFrames(data.satellite?.infrared),
  };
}

/** GMGSI visible-over-longwave composite with a natural day/night terminator. */
export function satelliteTileTemplate(host: string, path: string): string {
  return `${host}${path}/256/{z}/{x}/{y}/0/0_0.png`;
}

export function radarTileTemplate(
  host: string,
  path: string,
  palette: number,
  arrows: boolean,
): string {
  const url = `${host}${path}/256/{z}/{x}/{y}/${palette}/1_1.png`;
  return arrows ? `${url}?arrows=light` : url;
}
