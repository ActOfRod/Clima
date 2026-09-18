import { Star } from "lucide-react";
import { SearchBar } from "../components/weather/SearchBar";
import { WeatherIcon } from "../components/weather/WeatherIcon";
import { useApp } from "../context/AppContext";
import { placeLabel } from "../lib/format";
import { formatTemp } from "../lib/units";

export function CitiesPage() {
  const { saved, place, setPlace, toggleSave, weather, settings } = useApp();
  const list = saved.length ? saved : weather ? [weather.place] : [place];

  return (
    <div className="flex flex-col gap-5">
      <SearchBar />
      <div>
        <h1 className="text-2xl font-semibold">Cities</h1>
        <p className="text-sm text-muted">
          Star a city from search or the home screen to keep it here.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((city) => {
          const active = city.id === place.id;
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => setPlace(city)}
              className={`card flex items-center justify-between p-5 text-left ${
                active ? "ring-1 ring-accent" : ""
              }`}
            >
              <div>
                <div className="text-xl font-semibold">{city.name}</div>
                <div className="text-sm text-muted">
                  {placeLabel("", city.admin, city.country).replace(/^, /, "")}
                </div>
                {active && weather && (
                  <div className="mt-2 text-3xl font-semibold">
                    {formatTemp(weather.current.temperature, settings.units)}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-3">
                {active && weather && (
                  <WeatherIcon
                    code={weather.current.weatherCode}
                    isDay={weather.current.isDay}
                    size={56}
                  />
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(city);
                  }}
                  className="text-[#f6c445]"
                >
                  <Star size={18} fill={saved.some((s) => s.id === city.id) ? "#f6c445" : "none"} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
