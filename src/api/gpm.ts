export interface GpmFrame {
  id: string;
  time: number;
}

function floorToStep(ms: number, step: number): number {
  return Math.floor(ms / step) * step;
}

/** IMERG 30-minute precipitation. Latency is a few hours; no watermarks. */
export function gpmFrames(now = Date.now()): GpmFrame[] {
  const step = 30 * 60_000;
  const delay = 4 * 60 * 60_000;
  const end = floorToStep(now - delay, step);
  return Array.from({ length: 10 }, (_, i) => {
    const t = end - (9 - i) * step;
    const iso = new Date(t).toISOString().replace(".000Z", "Z");
    return { id: iso, time: Math.floor(t / 1000) };
  });
}

export function gpmTileTemplate(timeIso: string): string {
  return (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate_30min/default/" +
    timeIso +
    "/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"
  );
}
