import {
  Droplets,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  ThermometerSnowflake,
} from "lucide-react";
import { AiInsights } from "../components/weather/AiInsights";
import { ConfidenceCard } from "../components/weather/ConfidenceCard";
import { FeedbackBar } from "../components/weather/FeedbackBar";
import { CurrentHero } from "../components/weather/CurrentHero";
import { HourlyForecast } from "../components/weather/HourlyForecast";
import { SearchBar } from "../components/weather/SearchBar";
import { StatusScreen } from "../components/weather/Status";
import { useApp } from "../context/AppContext";
import { formatClock } from "../lib/format";
import {
  aqiLabel,
  formatPressure,
  formatTemp,
  formatVisibility,
  windCardinal,
  formatWind,
} from "../lib/units";

export function LocalPage() {
  const { weather, loading, error, settings } = useApp();
  if (loading || error || !weather) {
    return (
      <div className="flex flex-col gap-5">
        <SearchBar />
        <StatusScreen />
      </div>
    );
  }
  const c = weather.current;
  const today = weather.daily[0];
  const aqi = aqiLabel(weather.air.usAqi ?? weather.air.europeanAqi);

  const stats = [
    {
      icon: ThermometerSnowflake,
      label: "Dew point",
      value: c.dewPoint != null ? formatTemp(c.dewPoint, settings.units) : "—",
    },
    {
      icon: Droplets,
      label: "Humidity",
      value: `${Math.round(c.humidity)}%`,
    },
    {
      icon: Gauge,
      label: "Pressure",
      value: formatPressure(c.pressure, settings.units),
    },
    {
      icon: Eye,
      label: "Visibility",
      value: formatVisibility(c.visibility, settings.units),
    },
    {
      icon: Sunrise,
      label: "Sunrise",
      value: today ? formatClock(today.sunrise, weather.place.timezone) : "—",
    },
    {
      icon: Sunset,
      label: "Sunset",
      value: today ? formatClock(today.sunset, weather.place.timezone) : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <SearchBar />
      <CurrentHero compact />
      <ConfidenceCard />
      <FeedbackBar />
      <AiInsights />
      {weather.alerts.length > 0 && (
        <section className="card space-y-3 p-5">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-[#ff7b7b]">
            NWS ALERTS
          </h2>
          {weather.alerts.map((a) => (
            <div key={a.id} className="rounded-2xl bg-rose-400/10 p-3">
              <div className="font-medium">{a.event}</div>
              <p className="mt-1 text-sm text-[#c5d0e0]">{a.headline}</p>
            </div>
          ))}
        </section>
      )}
      <section className="card p-5">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">
          LOCAL DETAILS
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs text-[#8b9cb3]">
                <s.icon size={14} />
                {s.label}
              </div>
              <div className="mt-2 text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Detail
            label="Wind"
            value={`${formatWind(c.windSpeed, settings.units)} ${windCardinal(c.windDirection)}`}
          />
          <Detail
            label="Gusts"
            value={formatWind(c.windGusts, settings.units)}
          />
          <Detail label="Air quality" value={`${aqi.label}${weather.air.usAqi != null ? ` (${Math.round(weather.air.usAqi)})` : ""}`} />
        </div>
      </section>
      <HourlyForecast limit={12} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="text-xs text-[#8b9cb3]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
