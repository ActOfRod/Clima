import { Star } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { placeLabel } from "../../lib/format";
import { weatherLook } from "../../lib/weatherCodes";
import { formatTemp } from "../../lib/units";
import { WeatherIcon } from "./WeatherIcon";

export function CurrentHero({ compact = false }: { compact?: boolean }) {
  const { weather, settings, toggleSave, isSaved, usingCurrentLocation } = useApp();
  if (!weather) return null;
  const look = weatherLook(weather.current.weatherCode, weather.current.isDay);
  const saved = isSaved(weather.place.id);
  const actualLocation = placeLabel(
    weather.place.name,
    weather.place.admin,
    weather.place.country,
  );

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
          {weather.skill ? ` · ${weather.skill.label} confidence` : ""}
        </p>
        {usingCurrentLocation && (
          <p className="mt-1 text-xs text-[#8b9cb3]">
            Current location: {actualLocation || "Unknown"} ·{" "}
            {weather.place.latitude.toFixed(3)}, {weather.place.longitude.toFixed(3)}
          </p>
        )}
        <div className={`mt-5 font-semibold leading-none ${compact ? "text-6xl" : "text-7xl md:text-8xl"}`}>
          {formatTemp(weather.current.temperature, settings.units)}
        </div>
        <p className="mt-3 text-sm text-[#8b9cb3]">{look.label}</p>
        {weather.skill?.label !== "High" &&
          weather.skill?.rangeLow != null &&
          weather.skill?.rangeHigh != null && (
            <p className="mt-1 text-sm text-[#f5c16c]">
              Models spread{" "}
              {formatTemp(weather.skill.rangeLow, settings.units)}–
              {formatTemp(weather.skill.rangeHigh, settings.units)} over the next 12h
            </p>
          )}
      </div>
      <WeatherIcon
        code={weather.current.weatherCode}
        isDay={weather.current.isDay}
        size={compact ? 120 : 180}
      />
    </div>
  );
}
