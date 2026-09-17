import type { RadarCatalog, RadarFrame } from "../types";
import { getJson } from "./client";

interface RainViewerResponse {
  host?: string;
  radar?: {
    past?: Array<{ time: number; path: string }>;
    nowcast?: Array<{ time: number; path: string }>;
  };
}

export async function fetchRadarCatalog(): Promise<RadarCatalog> {
  const data = await getJson<RainViewerResponse>(
    "https://api.rainviewer.com/public/weather-maps.json",
  );
  const host = (data.host ?? "https://tilecache.rainviewer.com").replace(
    /\/$/,
    "",
  );
  const past: RadarFrame[] = (data.radar?.past ?? []).map((f) => ({
    time: f.time,
    path: f.path,
  }));
  const nowcast: RadarFrame[] = (data.radar?.nowcast ?? []).map((f) => ({
    time: f.time,
    path: f.path,
  }));
  return { host, frames: past, nowcast };
}

export function radarTileUrl(
  host: string,
  path: string,
  z: number,
  x: number,
  y: number,
  colorScheme = 2,
): string {
  return `${host}${path}/256/${z}/${x}/${y}/${colorScheme}/1_1.png`;
}

export function allRadarFrames(catalog: RadarCatalog): RadarFrame[] {
  return [...catalog.frames, ...catalog.nowcast];
}
