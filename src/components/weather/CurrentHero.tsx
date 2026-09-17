import { Star } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { weatherLook } from "../../lib/weatherCodes";
import { formatTemp } from "../../lib/units";
import { WeatherIcon } from "./WeatherIcon";

export function CurrentHero({ compact = false }: { compact?: boolean }) {
  const { weather, settings, toggleSave, isSaved } = useApp();
  if (!weather) return null;
  const look = weatherLook(weather.current.weatherCode, weather.current.isDay);
  const saved = isSaved(weather.place.id);

  return (
    <div className={`flex items-center justify-between gap-4 ${compact ? "px-1" : "px-2 pt-2"}`}>
      <div>
        <div className="flex items-center gap-2">
          <h1 className={`font-semibold ${compact ? "text-3xl" : "text-4xl md:text-5xl"}`}>
            {weather.place.name}
          </h1>
          <button
            type="button"
            onClick={() => toggleSave(weather.place)}
            className="text-[#8b9cb3] hover:text-[#f6c445]"
            aria-label={saved ? "Unsave city" : "Save city"}
          >
            <Star size={18} fill={saved ? "#f6c445" : "none"} color={saved ? "#f6c445" : "currentColor"} />
          </button>
        </div>
        <p className="mt-1 text-sm text-[#8b9cb3]">
          Chance of rain: {Math.round(weather.current.rainChance)}%
        </p>
        <div className={`mt-5 font-semibold leading-none ${compact ? "text-6xl" : "text-7xl md:text-8xl"}`}>
          {formatTemp(weather.current.temperature, settings.units)}
        </div>
        <p className="mt-3 text-sm text-[#8b9cb3]">{look.label}</p>
      </div>
      <WeatherIcon
        code={weather.current.weatherCode}
        isDay={weather.current.isDay}
        size={compact ? 120 : 180}
      />
    </div>
  );
}
