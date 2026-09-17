import { Droplets, Sun, Thermometer, Wind } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { formatTemp, formatWind } from "../../lib/units";

export function AirConditions({ seeMore = true }: { seeMore?: boolean }) {
  const { weather, settings } = useApp();
  if (!weather) return null;
  const c = weather.current;

  const items = [
    {
      icon: Thermometer,
      label: "Real Feel",
      value: formatTemp(c.apparentTemperature, settings.units),
    },
    {
      icon: Wind,
      label: "Wind",
      value: formatWind(c.windSpeed, settings.units),
    },
    {
      icon: Droplets,
      label: "Chance of rain",
      value: `${Math.round(c.rainChance)}%`,
    },
    {
      icon: Sun,
      label: "UV Index",
      value: `${Math.round(c.uvIndex)}`,
    },
  ];

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">
          AIR CONDITIONS
        </h2>
        {seeMore && (
          <Link
            to="/local"
            className="rounded-full bg-[#3b9bff] px-3 py-1 text-xs font-semibold text-white"
          >
            See more
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-y-6">
        {items.map((item) => (
          <div key={item.label} className="flex gap-3">
            <item.icon size={18} className="mt-1 text-[#8b9cb3]" />
            <div>
              <div className="text-sm text-[#8b9cb3]">{item.label}</div>
              <div className="text-2xl font-semibold">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
