import { AirConditions } from "../components/weather/AirConditions";
import { ConfidenceCard } from "../components/weather/ConfidenceCard";
import { AiInsights } from "../components/weather/AiInsights";
import { CurrentHero } from "../components/weather/CurrentHero";
import { DailyForecast } from "../components/weather/DailyForecast";
import { HourlyForecast } from "../components/weather/HourlyForecast";
import { SearchBar } from "../components/weather/SearchBar";
import { StatusScreen } from "../components/weather/Status";
import { useApp } from "../context/AppContext";
import { useIsDesktop } from "../hooks/useMediaQuery";

export function HomePage() {
  const { weather, loading, error } = useApp();
  const desktop = useIsDesktop();
  return (
    <div className="flex flex-col gap-5">
      <SearchBar />
      {(loading || error || !weather) && <StatusScreen />}
      {weather && !error && (
        desktop ? <DesktopHome /> : <MobileHome />
      )}
    </div>
  );
}

function DesktopHome() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <div className="flex flex-col gap-5">
        <CurrentHero />
        <HourlyForecast limit={6} />
        <AirConditions />
        <ConfidenceCard />
        <AiInsights />
      </div>
      <DailyForecast />
    </div>
  );
}

function MobileHome() {
  return (
    <div className="flex flex-col gap-4">
      <CurrentHero compact />
      <ConfidenceCard />
      <AiInsights />
      <HourlyForecast limit={8} />
      <AirConditions />
      <DailyForecast />
    </div>
  );
}
