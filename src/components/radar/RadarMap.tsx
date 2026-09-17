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

function RadarTiles({
  urlFor,
  currentId,
  previousId,
  blend,
  maxNativeZoom,
}: {
  urlFor: (id: string) => string;
  currentId?: string;
  previousId?: string;
  blend: number;
  maxNativeZoom: number;
}) {
  const map = useMap();
  const prevRef = useRef<L.TileLayer | null>(null);
  const currRef = useRef<L.TileLayer | null>(null);
  const currId = useRef<string | null>(null);

  useEffect(() => {
    currId.current = null;
    if (prevRef.current) {
      map.removeLayer(prevRef.current);
      prevRef.current = null;
    }
    if (currRef.current) {
      map.removeLayer(currRef.current);
      currRef.current = null;
    }
  }, [map, urlFor]);

  useEffect(() => {
    if (!currentId) return;

    if (currId.current !== currentId) {
      if (prevRef.current) map.removeLayer(prevRef.current);
      prevRef.current = currRef.current;
      const next = L.tileLayer(urlFor(currentId), {
        opacity: 0,
        zIndex: 5,
        className: "radar-hd",
        maxNativeZoom,
        maxZoom: maxNativeZoom + 2,
        detectRetina: true,
        keepBuffer: 6,
        updateWhenZooming: false,
        crossOrigin: true,
      });
      next.addTo(map);
      currRef.current = next;
      currId.current = currentId;
    }

    const fade = previousId && previousId !== currentId ? blend : 1;
    currRef.current?.setOpacity(0.92 * fade);
    prevRef.current?.setOpacity(0.92 * (1 - fade));
  }, [map, urlFor, previousId, currentId, blend, maxNativeZoom]);

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
  const conus = isConus(place);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(settings.animations);
  const [blend, setBlend] = useState(1);
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

  const urlFor = useMemo(() => {
    if (conus) return (id: string) => nexradTileTemplate(id);
    return (id: string) => gpmTileTemplate(id);
  }, [conus]);

  const maxNativeZoom = conus ? 9 : 6;

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    let start = performance.now();
    const stepMs = conus ? 200 : 320;
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
  }, [playing, frames.length, conus]);

  const current = frames[index] ?? frames[frames.length - 1];
  const previous = frames[(index - 1 + frames.length) % frames.length];
  const ready = Boolean(current);
  const stamp = current
    ? new Date(current.time * 1000).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="relative overflow-hidden rounded-[28px] ring-1 ring-white/10" style={{ height }}>
      <MapContainer
        key={conus ? "nexrad-hd" : "gpm-hd"}
        center={[place.latitude, place.longitude]}
        zoom={conus ? 8 : 4}
        minZoom={3}
        maxZoom={maxNativeZoom + 2}
        className="h-full w-full"
        zoomControl
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        {ready && current && (
          <RadarTiles
            urlFor={urlFor}
            currentId={current.id}
            previousId={previous?.id}
            blend={blend}
            maxNativeZoom={maxNativeZoom}
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
