import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Pause, Play } from "lucide-react";
import { gpmFrames, gpmTileTemplate } from "../../api/gpm";
import { nexradFrames, nexradTileTemplate } from "../../api/nexrad";
import { useApp } from "../../context/AppContext";
import { isConus } from "../../lib/geo";
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
  onIndex,
}: {
  urls: string[];
  index: number;
  playing: boolean;
  frameMs: number;
  maxNativeZoom: number;
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
    const fader = new RadarFader(map, maxNativeZoom, initial);
    fader.pos = indexRef.current;
    faderRef.current = fader;
    fader.step(urlsRef.current, false, 0, frameMs, indexRef.current);
    return () => {
      fader.destroy();
      faderRef.current = null;
    };
  }, [map, maxNativeZoom]);

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

export function RadarMap({ height = "100%" }: { height?: string }) {
  const { place, settings } = useApp();
  const conus = isConus(place);
  const [index, setIndex] = useState(() =>
    isConus(place) ? nexradFrames().length - 1 : gpmFrames().length - 1,
  );
  const [playing, setPlaying] = useState(settings.animations);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setIndex(conus ? nexradFrames().length - 1 : gpmFrames().length - 1);
  }, [conus]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  const frames = useMemo(() => {
    void tick;
    return conus ? nexradFrames() : gpmFrames();
  }, [conus, tick]);

  const urls = useMemo(
    () =>
      frames.map((frame) =>
        conus ? nexradTileTemplate(frame.id) : gpmTileTemplate(frame.id),
      ),
    [frames, conus],
  );

  const maxNativeZoom = conus ? 8 : 6;
  const frameMs = conus ? 560 : 860;

  const safeIndex = Math.min(index, Math.max(0, frames.length - 1));
  const current = frames[safeIndex] ?? frames[frames.length - 1];
  const stamp = current ? formatStamp(current.time) : "";
  const startStamp = frames[0] ? formatStamp(frames[0].time) : "";
  const endStamp = frames.at(-1) ? formatStamp(frames.at(-1)!.time) : "";

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[28px] ring-1 ring-white/10"
      style={{ height }}
    >
      <p className="sr-only">
        Radar centered on {place.name} at {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}.
      </p>
      <div className="relative" style={{ height: "calc(100% - 96px)" }}>
        <MapContainer
          key={conus ? "nexrad-hd" : "gpm-hd"}
          center={[place.latitude, place.longitude]}
          zoom={conus ? 7 : 4}
          minZoom={3}
          maxZoom={maxNativeZoom + 2}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
          zoomControl
          attributionControl
          fadeAnimation={false}
        >
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
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
          {urls.length > 0 && (
            <RadarLoop
              urls={urls}
              index={safeIndex}
              playing={playing}
              frameMs={frameMs}
              maxNativeZoom={maxNativeZoom}
              onIndex={setIndex}
            />
          )}
          <Recenter lat={place.latitude} lon={place.longitude} />
          <InvalidateSize />
        </MapContainer>
      </div>
      <div className="relative z-20 shrink-0 bg-[#10192a] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#3b9bff] text-white"
            aria-label={playing ? "Pause radar" : "Play radar"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, frames.length - 1)}
              value={safeIndex}
              onPointerDown={() => setPlaying(false)}
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
              className="radar-scrub"
              aria-label="Radar time"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#8b9cb3]">
              <span>{startStamp}</span>
              <span className="font-medium text-white">{stamp}</span>
              <span>{endStamp}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[#8b9cb3]">
          <span>
            {conus
              ? "HD NOAA NEXRAD (Iowa State)"
              : "NASA GPM IMERG — global, no watermarks"}
          </span>
          <span className="flex items-center gap-2">
            Light
            <span className="h-2 w-24 rounded-full bg-gradient-to-r from-[#3dd6c6] via-[#f5c16c] to-[#ff5d73]" />
            Heavy
          </span>
        </div>
      </div>
    </div>
  );
}
