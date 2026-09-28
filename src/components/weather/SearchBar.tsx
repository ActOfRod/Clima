import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { searchPlaces } from "../../api/geocoding";
import { useApp } from "../../context/AppContext";
import { placeLabel } from "../../lib/format";
import type { Place } from "../../types";

export function SearchBar({ placeholder = "Search for cities" }: { placeholder?: string }) {
  const { setPlace, requestLocation, locating } = useApp();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      void searchPlaces(q)
        .then(setHits)
        .catch(() => setHits([]));
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 ring-1 ring-line">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-lg p-1 text-muted hover:text-ink"
          title="Use my location"
        >
          <MapPin size={16} className={locating ? "animate-pulse" : ""} />
        </button>
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-panel ring-1 ring-line">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm hover:bg-soft"
                onClick={() => {
                  setPlace(hit);
                  setQ("");
                  setHits([]);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{hit.name}</div>
                <div className="text-xs text-muted">
                  {placeLabel("", hit.admin, hit.country).replace(/^, /, "")}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
