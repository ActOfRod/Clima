import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { searchPlaces } from "../../api/geocoding";
import { useApp } from "../../context/AppContext";
import { placeLabel } from "../../lib/format";
import type { Place } from "../../types";

export function SearchBar() {
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
      <div className="flex items-center gap-3 rounded-2xl bg-[#10192a] px-4 py-3 ring-1 ring-white/5">
        <Search size={16} className="text-[#8b9cb3]" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for cities"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6f8096]"
        />
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-lg p-1 text-[#8b9cb3] hover:text-white"
          title="Use my location"
        >
          <MapPin size={16} className={locating ? "animate-pulse" : ""} />
        </button>
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-[#152033] ring-1 ring-white/10">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm hover:bg-white/5"
                onClick={() => {
                  setPlace(hit);
                  setQ("");
                  setHits([]);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{hit.name}</div>
                <div className="text-xs text-[#8b9cb3]">
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
