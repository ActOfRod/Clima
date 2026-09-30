import L from "leaflet";
import { contourTileLayer } from "./contourTileLayer";
import { RADAR_OPACITY, frameOpacity, type FrameMix } from "./radarPlayback";

export interface RadarAnimatorOptions {
  maxNativeZoom: number;
  /** Reshade raw tiles on a canvas. Pre-rendered sources (LibreWXR) look best untouched. */
  skin: boolean;
  attribution?: string;
}

interface FrameLayer {
  url: string;
  layer: L.TileLayer;
  ready: boolean;
}

/**
 * One tile layer per frame, all kept on the map and preloaded, so playback only
 * changes opacity and never swaps a layer's URL (which would blank its tiles).
 * The pane isolates the radar group and each layer blends with `plus-lighter`
 * (see index.css), giving a constant-brightness dissolve between frames.
 */
export class RadarAnimator {
  private readonly map: L.Map;
  private readonly options: RadarAnimatorOptions;
  private frames: FrameLayer[] = [];

  constructor(map: L.Map, options: RadarAnimatorOptions) {
    this.map = map;
    this.options = options;
    const pane = map.getPane("radar") ?? map.createPane("radar");
    pane.style.zIndex = "450";
    pane.style.pointerEvents = "none";
    pane.style.opacity = String(RADAR_OPACITY);
  }

  get count(): number {
    return this.frames.length;
  }

  setFrames(urls: string[]): void {
    const existing = new Map(this.frames.map((f) => [f.url, f]));
    const keep = new Set(urls);
    for (const f of this.frames) {
      if (!keep.has(f.url)) this.map.removeLayer(f.layer);
    }
    this.frames = urls.map((url) => existing.get(url) ?? this.create(url));
  }

  isReady(index: number): boolean {
    return this.frames[index]?.ready ?? false;
  }

  render(mix: FrameMix): void {
    this.frames.forEach((f, i) => {
      const opacity = frameOpacity(i, mix);
      if (f.layer.options.opacity !== opacity) f.layer.setOpacity(opacity);
    });
  }

  destroy(): void {
    for (const f of this.frames) this.map.removeLayer(f.layer);
    this.frames = [];
  }

  private create(url: string): FrameLayer {
    const { maxNativeZoom, skin, attribution } = this.options;
    const options: L.TileLayerOptions = {
      pane: "radar",
      maxNativeZoom,
      maxZoom: maxNativeZoom + 2,
      className: "radar-frame",
      opacity: 0,
      keepBuffer: 1,
      updateWhenIdle: false,
      updateWhenZooming: false,
      attribution,
    };
    const layer = skin ? contourTileLayer(url, options) : L.tileLayer(url, options);
    const frame: FrameLayer = { url, layer, ready: false };
    layer.on("loading", () => {
      frame.ready = false;
    });
    layer.on("load", () => {
      frame.ready = true;
    });
    layer.addTo(this.map);
    return frame;
  }
}
