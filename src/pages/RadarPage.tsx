import { RadarMap } from "../components/radar/RadarMap";
import { SearchBar } from "../components/weather/SearchBar";
import { useApp } from "../context/AppContext";
import { useIsDesktop } from "../hooks/useMediaQuery";

export function RadarPage() {
  const { place } = useApp();
  const desktop = useIsDesktop();
  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-4">
      <SearchBar />
      <div>
        <h1 className="text-2xl font-semibold">Radar</h1>
        <p className="text-sm text-[#8b9cb3]">
          High-fidelity precipitation around {place.name}. Past frames plus a short nowcast.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <RadarMap height={desktop ? "min(72vh, 760px)" : "62vh"} />
      </div>
    </div>
  );
}
