export const RADAR_OPACITY = 0.88;

export interface TileRange {
  z: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function loopPos(pos: number, length: number): number {
  if (length <= 0) return 0;
  const m = pos % length;
  return m < 0 ? m + length : m;
}

export function frameBlend(
  pos: number,
  length: number,
): { from: number; to: number; frac: number } {
  if (length <= 1) return { from: 0, to: 0, frac: 0 };
  const p = loopPos(pos, length);
  const from = Math.floor(p) % length;
  const frac = p - Math.floor(p);
  return { from, to: (from + 1) % length, frac };
}

export function blendOpacities(
  frac: number,
  nextReady: boolean,
  opacity = RADAR_OPACITY,
): { from: number; to: number } {
  if (!nextReady) return { from: opacity, to: 0 };
  const t = Math.min(1, Math.max(0, frac));
  return { from: (1 - t) * opacity, to: t * opacity };
}

export function tileZoom(zoom: number, maxNativeZoom: number): number {
  return Math.max(0, Math.min(maxNativeZoom, Math.round(zoom)));
}

export function visibleTileRange(
  bounds: GeoBounds,
  zoom: number,
  extra = 1,
): TileRange {
  const z = Math.max(0, Math.floor(zoom));
  const n = 2 ** z;
  const lonToX = (lon: number) => ((lon + 180) / 360) * n;
  const latToY = (lat: number) => {
    const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
    const rad = (clamped * Math.PI) / 180;
    return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
  };

  let minX = Math.floor(lonToX(bounds.west)) - extra;
  let maxX = Math.floor(lonToX(bounds.east)) + extra;
  let minY = Math.floor(latToY(bounds.north)) - extra;
  let maxY = Math.floor(latToY(bounds.south)) + extra;

  if (maxX < minX) {
    minX = 0;
    maxX = n - 1;
  }

  return {
    z,
    minX: Math.max(0, minX),
    maxX: Math.min(n - 1, maxX),
    minY: Math.max(0, minY),
    maxY: Math.min(n - 1, maxY),
  };
}

export function tileUrls(template: string, range: TileRange): string[] {
  const urls: string[] = [];
  for (let x = range.minX; x <= range.maxX; x++) {
    for (let y = range.minY; y <= range.maxY; y++) {
      urls.push(
        template
          .replaceAll("{z}", String(range.z))
          .replaceAll("{x}", String(x))
          .replaceAll("{y}", String(y)),
      );
    }
  }
  return urls;
}

export function tileUrlsForFrames(
  templates: string[],
  range: TileRange,
  maxTotal: number,
): string[] {
  const out: string[] = [];
  for (const template of templates) {
    for (const url of tileUrls(template, range)) {
      out.push(url);
      if (out.length >= maxTotal) return out;
    }
  }
  return out;
}

export function prefetchImages(urls: string[], cache: HTMLImageElement[], max = 480): void {
  for (const url of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    cache.push(img);
  }
  if (cache.length > max) cache.splice(0, cache.length - max);
}
