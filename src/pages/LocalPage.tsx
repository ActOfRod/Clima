import { AiInsights } from "../components/weather/AiInsights";
import { ConfidenceCard } from "../components/weather/ConfidenceCard";
import { CurrentHero } from "../components/weather/CurrentHero";
import { HourlyForecast } from "../components/weather/HourlyForecast";
import { NextHourCard } from "../components/weather/NextHourCard";
import { StatusScreen } from "../components/weather/Status";
import { TopBar } from "../components/weather/TopBar";
import { useApp } from "../context/AppContext";

export function LocalPage() {
  const { weather, loading, error } = useApp();
  if (loading || error || !weather) {
    return (
      <div className="flex flex-col gap-5">
        <TopBar />
        <StatusScreen />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <TopBar />
      <CurrentHero compact />
      <NextHourCard />
      <ConfidenceCard />
      <AiInsights />
      {weather.alerts.length > 0 && (
        <section className="card space-y-3 p-5">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-alert">
            NWS ALERTS
          </h2>
          {weather.alerts.map((a) => (
            <div key={a.id} className="rounded-2xl bg-rose-400/10 p-3">
              <div className="font-medium">{a.event}</div>
              <p className="mt-1 text-sm text-muted">{a.headline}</p>
            </div>
          ))}
        </section>
      )}
      <HourlyForecast limit={12} />
    </div>
  );
}
