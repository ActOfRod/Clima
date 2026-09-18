import { useApp } from "../../context/AppContext";
import { formatHour } from "../../lib/format";
import { formatTemp } from "../../lib/units";
import { WeatherIcon } from "./WeatherIcon";

export function HourlyForecast({ limit = 6 }: { limit?: number }) {
  const { weather, settings } = useApp();
  if (!weather) return null;
  const hours = weather.hourly.slice(0, limit);

  return (
    <section className="card p-5">
      <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] text-muted">
        TODAY&apos;S FORECAST
      </h2>
      <div className="soft-scroll flex gap-0 overflow-x-auto">
        {hours.map((h, i) => (
          <div
            key={h.time}
            className={`flex min-w-[92px] flex-1 flex-col items-center gap-3 px-2 ${
              i < hours.length - 1 ? "border-r border-line" : ""
            }`}
          >
            <div className="text-xs text-muted">
              {formatHour(h.time, weather.place.timezone)}
            </div>
            <WeatherIcon code={h.weatherCode} isDay={h.isDay} size={42} />
            <div className="text-lg font-semibold">
              {formatTemp(h.temperature, settings.units)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
