import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Pause, Play } from "lucide-react";
import { gpmFrames, gpmTileTemplate } from "../../api/gpm";
import {
  LIBREWXR_ATTRIBUTION,
  fetchRadarCatalog,
  paletteLegend,
  radarTileTemplate,
  satelliteTileTemplate,
} from "../../api/librewxr";
import { nexradFrames, nexradTileTemplate } from "../../api/nexrad";
import { useApp } from "../../context/AppContext";
import { isConus } from "../../lib/geo";
import type { MapLayer, RadarCatalog } from "../../types";
import { RadarFader } from "./radarFader";
import {
  prefetchImages,
  tileUrlsForFrames,
  tileZoom,
  visibleTileRange,
} from "./radarPlayback";
import "leaflet/dist/leaflet.css";

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

function CityLabels() {
  const map = useMap();
  if (!map.getPane("labels")) {
    const pane = map.createPane("labels");
    pane.style.zIndex = "620";
    pane.style.pointerEvents = "none";
  }
  return (
    <TileLayer
      pane="labels"
      opacity={0.9}
      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    />
  );
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false });
    run();
    const t = window.setTimeout(run, 80);
    const t2 = window.setTimeout(run, 400);
    map.whenReady(run);
    const parent = map.getContainer().parentElement;
    const ro = parent ? new ResizeObserver(run) : null;
    if (parent) ro?.observe(parent);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

function RadarLoop({
  urls,
  index,
  playing,
  frameMs,
  maxNativeZoom,
  skin,
  attribution,
  onIndex,
}: {
  urls: string[];
  index: number;
  playing: boolean;
  frameMs: number;
  maxNativeZoom: number;
  skin: boolean;
  attribution?: string;
  onIndex: (index: number) => void;
}) {
  const map = useMap();
  const faderRef = useRef<RadarFader | null>(null);
  const urlsRef = useRef(urls);
  const indexRef = useRef(index);
  const onIndexRef = useRef(onIndex);
  const cacheRef = useRef<HTMLImageElement[]>([]);

  urlsRef.current = urls;
  indexRef.current = index;
  onIndexRef.current = onIndex;

  useEffect(() => {
    const initial = urlsRef.current[indexRef.current] ?? urlsRef.current[0];
    if (!initial) return;
    const fader = new RadarFader(map, maxNativeZoom, initial, { skin, attribution });
    fader.pos = indexRef.current;
    faderRef.current = fader;
    fader.step(urlsRef.current, false, 0, frameMs, indexRef.current);
    return () => {
      fader.destroy();
      faderRef.current = null;
    };
  }, [map, maxNativeZoom, skin, attribution]);

  useEffect(() => {
    const run = () => {
      if (urls.length === 0) return;
      const bounds = map.getBounds();
      const range = visibleTileRange(
        {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        },
        tileZoom(map.getZoom(), maxNativeZoom),
        1,
      );
      prefetchImages(tileUrlsForFrames(urls, range, 360), cacheRef.current);
    };
    run();
    map.on("moveend zoomend", run);
    return () => {
      map.off("moveend zoomend", run);
    };
  }, [map, urls, maxNativeZoom]);

  useEffect(() => {
    if (playing) return;
    faderRef.current?.step(urls, false, 0, frameMs, index);
  }, [playing, urls, frameMs, index]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const fader = faderRef.current;
      const list = urlsRef.current;
      if (fader && list.length > 0) {
        const dt = Math.min(50, now - last);
        last = now;
        const next = fader.step(list, true, dt, frameMs, indexRef.current);
        if (next !== indexRef.current) {
          indexRef.current = next;
          onIndexRef.current(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frameMs]);

  return null;
}

function formatStamp(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type RadarSource = "librewxr" | "nexrad" | "gpm";

interface LoopFrame {
  time: number;
  url: string;
  nowcast: boolean;
}

const SOURCES: Record<
  RadarSource,
  {
    maxNativeZoom: number;
    frameMs: number;
    zoom: number;
    skin: boolean;
    label: string;
    attribution?: string;
  }
> = {
  librewxr: {
    maxNativeZoom: 9,
    frameMs: 520,
    zoom: 7,
    skin: false,
    label: "LibreWXR — real radar composites + satellite rain, 1 h nowcast",
    attribution: LIBREWXR_ATTRIBUTION,
  },
  nexrad: {
    maxNativeZoom: 8,
    frameMs: 560,
    zoom: 7,
    skin: true,
    label: "HD NOAA NEXRAD (Iowa State)",
  },
  gpm: {
    maxNativeZoom: 6,
    frameMs: 860,
    zoom: 4,
    skin: true,
    label: "NASA GPM IMERG — global, no watermarks",
  },
};

/**
 * GMGSI is ~8 km per pixel and the server upsamples with hard pixel edges.
 * Capping native zoom low lets the browser's smooth scaling soften the blocks.
 */
const SATELLITE_LOOP = { maxNativeZoom: 5, frameMs: 750 };

function layerLabel(layer: MapLayer, radarLabel: string): string {
  switch (layer) {
    case "radar":
      return radarLabel;
    case "satellite":
      return "NOAA GMGSI satellite via LibreWXR — hourly, visible by day, infrared at night";
    case "both":
      return `${radarLabel} · latest satellite underneath`;
    default: {
      const never: never = layer;
      return never;
    }
  }
}

const MAP_LAYERS: Array<{ id: MapLayer; label: string }> = [
  { id: "radar", label: "Radar" },
  { id: "satellite", label: "Satellite" },
  { id: "both", label: "Both" },
];

function SatelliteUnderlay({ url }: { url: string }) {
  const map = useMap();
  if (!map.getPane("satellite")) {
    const pane = map.createPane("satellite");
    pane.style.zIndex = "420";
    pane.style.pointerEvents = "none";
  }
  return (
    <TileLayer
      pane="satellite"
      url={url}
      opacity={0.72}
      maxNativeZoom={SATELLITE_LOOP.maxNativeZoom}
      attribution={LIBREWXR_ATTRIBUTION}
    />
  );
}

export function RadarMap({ height = "100%" }: { height?: string }) {
  const { place, settings, updateSettings } = useApp();
  const conus = isConus(place);
  const [catalog, setCatalog] = useState<RadarCatalog | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [pinned, setPinned] = useState<number | null>(null);
  const [playing, setPlaying] = useState(settings.animations);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRadarCatalog()
      .then((next) => {
        if (cancelled) return;
        setCatalog(next);
        setCatalogFailed(false);
      })
      .catch(() => {
        if (!cancelled) setCatalogFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const source: RadarSource | null = catalog
    ? "librewxr"
    : catalogFailed
      ? conus
        ? "nexrad"
        : "gpm"
      : null;
  const config = SOURCES[source ?? (conus ? "nexrad" : "gpm")];
  const hasSatellite = source === "librewxr" && (catalog?.satellite.length ?? 0) > 0;
  const layer: MapLayer = hasSatellite ? (settings.mapLayer ?? "radar") : "radar";
  const satelliteLoop = layer === "satellite";
  const latestSatellite = catalog?.satellite.at(-1);
  const underlayUrl =
    layer === "both" && catalog && latestSatellite
      ? satelliteTileTemplate(catalog.host, latestSatellite.path)
      : null;
  const loop = satelliteLoop
    ? { ...SATELLITE_LOOP, skin: false, attribution: LIBREWXR_ATTRIBUTION }
    : config;

  useEffect(() => {
    setPinned(null);
  }, [source, layer]);

  const frames = useMemo<LoopFrame[]>(() => {
    void tick;
    switch (source) {
      case "librewxr": {
        if (!catalog) return [];
        if (satelliteLoop) {
          return catalog.satellite.map((f) => ({
            time: f.time,
            url: satelliteTileTemplate(catalog.host, f.path),
            nowcast: false,
          }));
        }
        const url = (path: string) =>
          radarTileTemplate(catalog.host, path, settings.radarPalette, settings.radarArrows);
        return [
          ...catalog.frames.map((f) => ({ time: f.time, url: url(f.path), nowcast: false })),
          ...catalog.nowcast.map((f) => ({ time: f.time, url: url(f.path), nowcast: true })),
        ];
      }
      case "nexrad":
        return nexradFrames().map((f) => ({
          time: f.time,
          url: nexradTileTemplate(f.id),
          nowcast: false,
        }));
      case "gpm":
        return gpmFrames().map((f) => ({ time: f.time, url: gpmTileTemplate(f.id), nowcast: false }));
      case null:
        return [];
      default: {
        const never: never = source;
        return never;
      }
    }
  }, [source, catalog, satelliteLoop, settings.radarPalette, settings.radarArrows, tick]);

  const urls = useMemo(() => frames.map((f) => f.url), [frames]);
  const liveIndex = Math.max(0, frames.filter((f) => !f.nowcast).length - 1);
  const hasNowcast = frames.some((f) => f.nowcast);

  const safeIndex =
    pinned == null ? liveIndex : Math.min(pinned, Math.max(0, frames.length - 1));
  const current = frames[safeIndex] ?? frames[frames.length - 1];
  const stamp = current ? formatStamp(current.time) : "";
  const startStamp = frames[0] ? formatStamp(frames[0].time) : "";
  const endStamp = frames.at(-1) ? formatStamp(frames.at(-1)!.time) : "";

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[28px] ring-1 ring-line"
      style={{ height }}
    >
      <p className="sr-only">
        Radar centered on {place.name} at {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}.
      </p>
      <div className="relative" style={{ height: "calc(100% - 96px)" }}>
        <MapContainer
          key={source ?? "pending"}
          center={[place.latitude, place.longitude]}
          zoom={config.zoom}
          minZoom={3}
          maxZoom={config.maxNativeZoom + 2}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
          zoomControl
          attributionControl
          zoomAnimation
          fadeAnimation
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={80}
        >
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          <CityLabels />
          <CircleMarker
            center={[place.latitude, place.longitude]}
            radius={7}
            pathOptions={{
              color: "#d8ecff",
              weight: 2,
              fillColor: "#3b9bff",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent>
              {place.name}
            </Tooltip>
          </CircleMarker>
          {underlayUrl && <SatelliteUnderlay url={underlayUrl} />}
          {urls.length > 0 && (
            <RadarLoop
              urls={urls}
              index={safeIndex}
              playing={playing}
              frameMs={loop.frameMs}
              maxNativeZoom={loop.maxNativeZoom}
              skin={loop.skin}
              attribution={loop.attribution}
              onIndex={setPinned}
            />
          )}
          <Recenter lat={place.latitude} lon={place.longitude} />
          <InvalidateSize />
        </MapContainer>
        {hasSatellite && (
          <div
            role="radiogroup"
            aria-label="Map layer"
            className="absolute right-3 top-3 z-[1000] flex rounded-full bg-black/55 p-1 text-[11px] font-medium backdrop-blur"
          >
            {MAP_LAYERS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={layer === option.id}
                onClick={() => updateSettings({ mapLayer: option.id })}
                className={`rounded-full px-3 py-1.5 ${
                  layer === option.id ? "bg-accent text-on-accent" : "text-white/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative z-20 shrink-0 bg-panel-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
            aria-label={playing ? "Pause radar" : "Play radar"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="relative min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, frames.length - 1)}
              value={safeIndex}
              onPointerDown={() => setPlaying(false)}
              onChange={(e) => {
                setPlaying(false);
                setPinned(Number(e.target.value));
              }}
              className="radar-scrub"
              aria-label="Radar time"
            />
            {hasNowcast && frames.length > 1 && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-white/70"
                style={{ left: `${(liveIndex / (frames.length - 1)) * 100}%` }}
              />
            )}
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
              <span>{startStamp}</span>
              <span className="flex items-center gap-1.5 font-medium text-ink">
                {stamp}
                {current?.nowcast && (
                  <span className="rounded-full bg-accent px-1.5 py-px text-[9px] font-semibold tracking-wide text-on-accent">
                    FORECAST
                  </span>
                )}
              </span>
              <span>{endStamp}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted">
          <span>{source ? layerLabel(layer, config.label) : "Loading radar…"}</span>
          {satelliteLoop ? (
            <span className="shrink-0">GOES · Meteosat · Himawari</span>
          ) : (
            <span className="flex shrink-0 items-center gap-2">
              Light
              {source === "librewxr" ? (
                <span
                  className="h-2 w-24 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${paletteLegend(settings.radarPalette).join(", ")})`,
                  }}
                />
              ) : (
                <span className="h-2 w-24 rounded-full bg-gradient-to-r from-[#3dd6c6] via-[#f5c16c] to-[#ff5d73]" />
              )}
              Heavy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
