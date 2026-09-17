import { useApp } from "../../context/AppContext";
import { formatWeekday } from "../../lib/format";
import { formatTemp } from "../../lib/units";
import { weatherLook } from "../../lib/weatherCodes";
import { WeatherIcon } from "./WeatherIcon";

export function DailyForecast() {
  const { weather, settings } = useApp();
  if (!weather) return null;

  return (
    <section className="card flex h-full flex-col p-5">
      <h2 className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">
        7-DAY FORECAST
      </h2>
      <div className="flex flex-1 flex-col">
        {weather.daily.map((d, i) => {
          const look = weatherLook(d.weatherCode);
          return (
            <div
              key={d.date}
              className={`grid grid-cols-[70px_1fr_auto] items-center gap-3 py-3 ${
                i < weather.daily.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="text-sm text-[#c5d0e0]">
                {formatWeekday(d.date, weather.place.timezone, weather.current.time)}
              </div>
              <div className="flex items-center gap-3">
                <WeatherIcon code={d.weatherCode} size={34} />
                <span className="text-sm text-[#d5deea]">{look.label}</span>
              </div>
              <div className="text-sm tabular-nums text-[#d5deea]">
                <span className="font-semibold">
                  {formatTemp(d.tempMax, settings.units, false)}
                </span>
                <span className="text-[#8b9cb3]">
                  /{formatTemp(d.tempMin, settings.units, false)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
