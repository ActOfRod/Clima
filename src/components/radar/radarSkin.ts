export function clampByte(n: number): number {
  if (n < 0) return 0;
  if (n > 255) return 255;
  return n;
}

/** Reshade NEXRAD/GPM pixels: drop pale rims, boost color, feather edges. */
export function skinRadarPixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;

    if (a < 10) {
      data[i + 3] = 0;
      continue;
    }

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max > 208 && max - min < 30) {
      data[i + 3] = 0;
      continue;
    }

    if (max < 26 && a < 90) {
      data[i + 3] = 0;
      continue;
    }

    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const boost = 1.32;
    data[i] = clampByte(l + (r - l) * boost);
    data[i + 1] = clampByte(l + (g - l) * boost);
    data[i + 2] = clampByte(l + (b - l) * boost);

    const t = a / 255;
    data[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
  }
}
