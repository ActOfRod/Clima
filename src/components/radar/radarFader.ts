import L from "leaflet";
import { RADAR_OPACITY, blendOpacities, frameBlend } from "./radarPlayback";

function layerUrl(layer: L.TileLayer): string {
  return (layer as unknown as { _url?: string })._url ?? "";
}

export class RadarFader {
  private map: L.Map;
  private front: L.TileLayer;
  private back: L.TileLayer;
  private ready = new Set<string>();
  pos = 0;

  constructor(map: L.Map, maxNativeZoom: number, initialUrl: string) {
    this.map = map;
    if (!map.getPane("radar")) {
      const pane = map.createPane("radar");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }

    const opts: L.TileLayerOptions = {
      pane: "radar",
      maxNativeZoom,
      maxZoom: maxNativeZoom + 2,
      className: "radar-hd",
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
    };
    this.front = L.tileLayer(initialUrl, { ...opts, opacity: RADAR_OPACITY }).addTo(map);
    this.back = L.tileLayer(initialUrl, { ...opts, opacity: 0 }).addTo(map);
    this.watch(this.front);
    this.watch(this.back);
    this.ready.add(initialUrl);
  }

  private watch(layer: L.TileLayer) {
    layer.on("load", () => {
      const url = layerUrl(layer);
      if (url) this.ready.add(url);
    });
  }

  private swap() {
    const previous = this.front;
    this.front = this.back;
    this.back = previous;
  }

  private loadHidden(url: string) {
    if (!url || layerUrl(this.back) === url) return;
    this.ready.delete(url);
    this.back.setUrl(url);
  }

  private hiddenIsIdle(): boolean {
    return (this.back.options.opacity ?? 0) < 0.06;
  }

  step(
    urls: string[],
    playing: boolean,
    dt: number,
    frameMs: number,
    pinnedIndex: number,
  ): number {
    if (urls.length === 0) return 0;

    if (playing && urls.length > 1) {
      const peek = frameBlend(this.pos, urls.length);
      const peekFrom = urls[peek.from] ?? "";
      const peekTo = urls[peek.to] ?? peekFrom;
      const nextReady =
        peekTo === peekFrom ||
        (this.ready.has(peekTo) &&
          (layerUrl(this.back) === peekTo || layerUrl(this.front) === peekTo));
      if (nextReady) {
        this.pos += dt / frameMs;
        if (this.pos >= urls.length) this.pos -= urls.length;
        if (this.pos < 0) this.pos += urls.length;
      } else {
        this.pos = peek.from;
        if (peekTo) this.loadHidden(peekTo);
      }
    } else {
      this.pos = Math.min(Math.max(0, pinnedIndex), urls.length - 1);
    }

    const { from, to, frac } = frameBlend(this.pos, urls.length);
    const fromUrl = urls[from] ?? "";
    const toUrl = urls[to] ?? fromUrl;
    const blendFrac = playing ? frac : 0;

    if (layerUrl(this.back) === fromUrl && layerUrl(this.front) !== fromUrl) {
      this.swap();
    }

    if (layerUrl(this.front) !== fromUrl) {
      this.loadHidden(fromUrl);
      if (this.ready.has(fromUrl) && layerUrl(this.back) === fromUrl) {
        this.swap();
        this.front.setOpacity(RADAR_OPACITY);
        this.back.setOpacity(0);
        if (toUrl !== fromUrl) this.loadHidden(toUrl);
      } else {
        this.front.setOpacity(RADAR_OPACITY);
        this.back.setOpacity(0);
      }
      return from;
    }

    const nextReady = layerUrl(this.back) === toUrl && this.ready.has(toUrl);
    const op = blendOpacities(blendFrac, nextReady);
    this.front.setOpacity(op.from);
    this.back.setOpacity(op.to);

    if (toUrl !== fromUrl && layerUrl(this.back) !== toUrl && this.hiddenIsIdle()) {
      this.loadHidden(toUrl);
    }

    return from;
  }

  destroy() {
    this.map.removeLayer(this.front);
    this.map.removeLayer(this.back);
  }
}
