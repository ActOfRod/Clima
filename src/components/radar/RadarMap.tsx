import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Pause, Play } from "lucide-react";
import { allRadarFrames, fetchRadarCatalog } from "../../api/rainviewer";
import { useApp } from "../../context/AppContext";
import type { RadarCatalog, RadarFrame } from "../../types";
import "leaflet/dist/leaflet.css";

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

function RadarTiles({
  host,
  previous,
  current,
  blend,
}: {
  host: string;
  previous?: RadarFrame;
  current?: RadarFrame;
  blend: number;
}) {
  const map = useMap();
  const prevRef = useRef<L.TileLayer | null>(null);
  const currRef = useRef<L.TileLayer | null>(null);
  const currTime = useRef<number | null>(null);

  useEffect(() => {
    if (!current) return;
    const url = (frame: RadarFrame) =>
      `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

    if (currTime.current !== current.time) {
      if (prevRef.current) map.removeLayer(prevRef.current);
      prevRef.current = currRef.current;
      const next = L.tileLayer(url(current), {
        opacity: 0,
        zIndex: 5,
        className: "radar-tiles",
      });
      next.addTo(map);
      currRef.current = next;
      currTime.current = current.time;
    }

    const fade = previous ? blend : 1;
    currRef.current?.setOpacity(0.72 * fade);
    prevRef.current?.setOpacity(0.72 * (1 - fade));
  }, [map, host, previous, current, blend]);

  useEffect(
    () => () => {
      if (prevRef.current) map.removeLayer(prevRef.current);
      if (currRef.current) map.removeLayer(currRef.current);
    },
    [map],
  );

  return null;
}

export function RadarMap({ height = "100%" }: { height?: string }) {
  const { place, settings } = useApp();
  const [catalog, setCatalog] = useState<RadarCatalog | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(settings.animations);
  const [blend, setBlend] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchRadarCatalog()
      .then((c) => {
        if (!live) return;
        setCatalog(c);
        setIndex(Math.max(0, c.frames.length - 1));
      })
      .catch(() => {
        if (live) setError("Radar is unavailable right now.");
      });
    const refresh = setInterval(() => {
      void fetchRadarCatalog()
        .then((c) => live && setCatalog(c))
        .catch(() => undefined);
    }, 5 * 60_000);
    return () => {
      live = false;
      clearInterval(refresh);
    };
  }, []);

  const frames = useMemo(() => (catalog ? allRadarFrames(catalog) : []), [catalog]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    let start = performance.now();
    const stepMs = 160;
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - start) / stepMs;
      if (t >= 1) {
        start = now;
        setBlend(1);
        setIndex((i) => (i + 1) % frames.length);
      } else {
        setBlend(Math.min(1, t));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames.length]);

  const current = frames[index];
  const previous = frames[(index - 1 + frames.length) % frames.length];
  const stamp = current
    ? new Date(current.time * 1000).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="relative overflow-hidden rounded-[28px] ring-1 ring-white/10" style={{ height }}>
      {error && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0b1220] text-sm text-[#8b9cb3]">
          {error}
        </div>
      )}
      <MapContainer
        center={[place.latitude, place.longitude]}
        zoom={6}
        minZoom={3}
        maxZoom={10}
        className="h-full w-full"
        zoomControl
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {catalog && current && (
          <RadarTiles
            host={catalog.host}
            previous={previous}
            current={current}
            blend={blend}
          />
        )}
        <Recenter lat={place.latitude} lon={place.longitude} />
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b1220] to-transparent p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#10192a]/90 px-3 py-2 ring-1 ring-white/10">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-full bg-white/10 p-2"
            aria-label={playing ? "Pause radar" : "Play radar"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              setBlend(1);
              setIndex(Number(e.target.value));
            }}
            className="w-full accent-[#3b9bff]"
          />
          <div className="w-16 text-right text-xs text-[#c5d0e0]">{stamp}</div>
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[#8b9cb3]">
          <span>Radar © RainViewer</span>
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
