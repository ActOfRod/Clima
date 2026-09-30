import { RadarMap } from "../components/radar/RadarMap";
import { TopBar } from "../components/weather/TopBar";
import { useApp } from "../context/AppContext";
import { useIsDesktop } from "../hooks/useMediaQuery";

export function RadarPage() {
  const { place } = useApp();
  const desktop = useIsDesktop();
  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-4">
      <TopBar />
      <div>
        <h1 className="text-2xl font-semibold">Radar</h1>
        <p className="text-sm text-muted">
          Real radar around {place.name} from national networks worldwide, plus a 1-hour forecast
          of where the rain is heading — no logo tiles.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <RadarMap height={desktop ? "min(78vh, 820px)" : "68vh"} />
      </div>
    </div>
  );
}
