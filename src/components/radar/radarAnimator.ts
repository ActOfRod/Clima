import L from "leaflet";
import { RADAR_OPACITY, type FrameMix } from "./radarPlayback";
import { skinRadarPixels } from "./radarSkin";

export interface RadarAnimatorOptions {
  maxNativeZoom: number;
  /** Reshade raw tiles (NEXRAD/GPM fallback). Pre-rendered sources (LibreWXR) look best untouched. */
  skin: boolean;
  attribution?: string;
}

/** null = the frame failed to load for this tile; it paints as empty rather than stalling playback. */
type Bitmap = ImageBitmap | null;

interface Tile {
  canvas: HTMLCanvasElement;
  coords: L.Coords;
}

function tileKey(c: L.Coords): string {
  return `${c.z}/${c.x}/${c.y}`;
}

function tileUrl(template: string, c: L.Coords): string {
  return template
    .replaceAll("{z}", String(c.z))
    .replaceAll("{x}", String(c.x))
    .replaceAll("{y}", String(c.y));
}

async function decode(url: string, skin: boolean, signal: AbortSignal): Promise<Bitmap> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    if (!skin) return bitmap;
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return bitmap;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    skinRadarPixels(pixels.data);
    ctx.putImageData(pixels, 0, 0);
    return await createImageBitmap(canvas);
  } catch {
    return null;
  }
}

/**
 * All radar frames rendered into one canvas per map tile. Each frame's tile is
 * fetched and decoded once; playback just repaints the two frames being
 * dissolved, the second with additive ("lighter") compositing so the pair
 * always sums to one full-strength image. One on-screen layer instead of one
 * DOM layer per frame keeps phones from dropping and re-rasterizing layers,
 * which shows up as strobing.
 */
class RadarCanvasLayer extends L.GridLayer {
  private urls: string[] = [];
  private readonly tiles = new Map<string, Tile>();
  private readonly bitmaps = new Map<string, Bitmap>();
  private readonly pending = new Map<string, Promise<void>>();
  private mix: FrameMix = { from: 0, to: 0, frac: 0 };
  private readonly skin: boolean;
  private readonly abort = new AbortController();

  constructor(options: L.GridLayerOptions & { skin: boolean }) {
    super(options);
    this.skin = options.skin;
    this.on("tileunload", (e) => this.unloadTile((e as L.TileEvent).coords));
  }

  override createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const size = this.getTileSize();
    const canvas = document.createElement("canvas");
    canvas.width = size.x;
    canvas.height = size.y;
    const key = tileKey(coords);
    this.tiles.set(key, { canvas, coords });
    const first = this.urls[this.mix.from];
    const ready = first ? this.ensure(key, first) : Promise.resolve();
    void ready.then(() => {
      this.paint(key);
      done(undefined, canvas);
    });
    for (const url of this.urls) void this.ensure(key, url);
    return canvas;
  }

  override onRemove(map: L.Map): this {
    this.abort.abort();
    for (const bitmap of this.bitmaps.values()) bitmap?.close();
    this.bitmaps.clear();
    this.pending.clear();
    this.tiles.clear();
    return super.onRemove(map);
  }

  get count(): number {
    return this.urls.length;
  }

  setFrames(urls: string[]): void {
    const keep = new Set(urls);
    for (const [k, bitmap] of this.bitmaps) {
      if (!keep.has(k.slice(k.indexOf("|") + 1))) {
        bitmap?.close();
        this.bitmaps.delete(k);
      }
    }
    this.urls = urls;
    for (const key of this.tiles.keys()) {
      for (const url of urls) void this.ensure(key, url);
    }
    this.paintAll();
  }

  /** True once every tile on screen has frame `index` decoded (or known to be missing). */
  isReady(index: number): boolean {
    const url = this.urls[index];
    if (!url || this.tiles.size === 0) return false;
    for (const key of this.tiles.keys()) {
      if (!this.bitmaps.has(`${key}|${url}`)) return false;
    }
    return true;
  }

  render(mix: FrameMix): void {
    const m = this.mix;
    if (m.from === mix.from && m.to === mix.to && Math.abs(m.frac - mix.frac) < 0.002) return;
    this.mix = mix;
    this.paintAll();
  }

  private ensure(key: string, url: string): Promise<void> {
    const id = `${key}|${url}`;
    if (this.bitmaps.has(id)) return Promise.resolve();
    const running = this.pending.get(id);
    if (running) return running;
    const tile = this.tiles.get(key);
    if (!tile) return Promise.resolve();
    const job = decode(tileUrl(url, tile.coords), this.skin, this.abort.signal).then((bitmap) => {
      this.pending.delete(id);
      if (!this.tiles.has(key) || !this.urls.includes(url)) {
        bitmap?.close();
        return;
      }
      this.bitmaps.set(id, bitmap);
      const { from, to } = this.mix;
      if (url === this.urls[from] || url === this.urls[to]) this.paint(key);
    });
    this.pending.set(id, job);
    return job;
  }

  private paintAll(): void {
    for (const key of this.tiles.keys()) this.paint(key);
  }

  private paint(key: string): void {
    const tile = this.tiles.get(key);
    const ctx = tile?.canvas.getContext("2d");
    if (!tile || !ctx) return;
    const { from, to, frac } = this.mix;
    const a = this.bitmaps.get(`${key}|${this.urls[from]}`);
    const b = this.bitmaps.get(`${key}|${this.urls[to]}`);
    const { width, height } = tile.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (from === to || frac <= 0) {
      if (a) ctx.drawImage(a, 0, 0, width, height);
      return;
    }
    if (a) {
      ctx.globalAlpha = 1 - frac;
      ctx.drawImage(a, 0, 0, width, height);
    }
    if (b) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = frac;
      ctx.drawImage(b, 0, 0, width, height);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private unloadTile(coords: L.Coords): void {
    const key = tileKey(coords);
    this.tiles.delete(key);
    for (const [id, bitmap] of this.bitmaps) {
      if (id.startsWith(`${key}|`)) {
        bitmap?.close();
        this.bitmaps.delete(id);
      }
    }
  }
}

/** Playback surface for RadarMap: frames in, frame mix out. */
export class RadarAnimator {
  private readonly map: L.Map;
  private readonly layer: RadarCanvasLayer;

  constructor(map: L.Map, options: RadarAnimatorOptions) {
    this.map = map;
    const pane = map.getPane("radar") ?? map.createPane("radar");
    pane.style.zIndex = "450";
    pane.style.pointerEvents = "none";
    pane.style.opacity = String(RADAR_OPACITY);
    this.layer = new RadarCanvasLayer({
      pane: "radar",
      maxNativeZoom: options.maxNativeZoom,
      maxZoom: options.maxNativeZoom + 2,
      keepBuffer: 1,
      updateWhenIdle: false,
      updateWhenZooming: false,
      attribution: options.attribution,
      className: "radar-frame",
      skin: options.skin,
    });
    this.layer.addTo(map);
  }

  get count(): number {
    return this.layer.count;
  }

  setFrames(urls: string[]): void {
    this.layer.setFrames(urls);
  }

  isReady(index: number): boolean {
    return this.layer.isReady(index);
  }

  render(mix: FrameMix): void {
    this.layer.render(mix);
  }

  destroy(): void {
    this.map.removeLayer(this.layer);
  }
}
