import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Pause, Play } from "lucide-react";
import { gpmFrames, gpmTileTemplate } from "../../api/gpm";
import { nexradFrames, nexradTileTemplate } from "../../api/nexrad";
import { useApp } from "../../context/AppContext";
import { isConus } from "../../lib/geo";
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

function RadarTiles({
  url,
  maxNativeZoom,
}: {
  url: string;
  maxNativeZoom: number;
}) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map.getPane("radar")) {
      const pane = map.createPane("radar");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }
    const layer = L.tileLayer(url, {
      pane: "radar",
      opacity: 0.88,
      maxNativeZoom,
      maxZoom: maxNativeZoom + 2,
      className: "radar-hd",
      keepBuffer: 4,
    });
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // Recreate only if zoom policy changes, not on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maxNativeZoom]);

  useEffect(() => {
    layerRef.current?.setUrl(url);
  }, [url]);

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
  const [index, setIndex] = useState(0);
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

  const maxNativeZoom = conus ? 8 : 6;

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, conus ? 450 : 700);
    return () => window.clearInterval(id);
  }, [playing, frames.length, conus]);

  const safeIndex = Math.min(index, Math.max(0, frames.length - 1));
  const current = frames[safeIndex] ?? frames[frames.length - 1];
  const url = current
    ? conus
      ? nexradTileTemplate(current.id)
      : gpmTileTemplate(current.id)
    : "";
  const stamp = current ? formatStamp(current.time) : "";
  const startStamp = frames[0] ? formatStamp(frames[0].time) : "";
  const endStamp = frames.at(-1) ? formatStamp(frames.at(-1)!.time) : "";

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[28px] ring-1 ring-white/10"
      style={{ height }}
    >
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
        >
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          {url && <RadarTiles url={url} maxNativeZoom={maxNativeZoom} />}
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
