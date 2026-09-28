import { useState } from "react";
import {
  Droplets,
  Eye,
  Gauge,
  Leaf,
  Navigation,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  ThermometerSnowflake,
  Wind,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatClock } from "../../lib/format";
import {
  aqiLabel,
  formatPressure,
  formatTemp,
  formatVisibility,
  formatWind,
  windCardinal,
} from "../../lib/units";
import { Expandable, SeeMoreButton } from "../ui/Expandable";

const DETAILS_ID = "air-conditions-details";

export function AirConditions() {
  const { weather, settings } = useApp();
  const [open, setOpen] = useState(false);
  if (!weather) return null;
  const c = weather.current;
  const today = weather.daily[0];
  const tz = weather.place.timezone;
  const aqiValue = weather.air.usAqi ?? weather.air.europeanAqi;
  const aqi = aqiLabel(aqiValue);

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

  const details = [
    {
      icon: ThermometerSnowflake,
      label: "Dew point",
      value: c.dewPoint != null ? formatTemp(c.dewPoint, settings.units) : "—",
    },
    { icon: Droplets, label: "Humidity", value: `${Math.round(c.humidity)}%` },
    { icon: Gauge, label: "Pressure", value: formatPressure(c.pressure, settings.units) },
    { icon: Eye, label: "Visibility", value: formatVisibility(c.visibility, settings.units) },
    { icon: Navigation, label: "Wind from", value: windCardinal(c.windDirection) },
    { icon: Wind, label: "Gusts", value: formatWind(c.windGusts, settings.units) },
    {
      icon: Sunrise,
      label: "Sunrise",
      value: today ? formatClock(today.sunrise, tz) : "—",
    },
    {
      icon: Sunset,
      label: "Sunset",
      value: today ? formatClock(today.sunset, tz) : "—",
    },
    {
      icon: Leaf,
      label: "Air quality",
      value: aqiValue != null ? `${aqi.label} (${Math.round(aqiValue)})` : aqi.label,
    },
  ];

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">
          AIR CONDITIONS
        </h2>
        <SeeMoreButton open={open} onToggle={() => setOpen((o) => !o)} controls={DETAILS_ID} />
      </div>
      <div className="grid grid-cols-2 gap-y-6">
        {items.map((item) => (
          <div key={item.label} className="flex gap-3">
            <item.icon size={18} className="mt-1 text-muted" />
            <div>
              <div className="text-sm text-muted">{item.label}</div>
              <div className="text-2xl font-semibold">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
      <Expandable open={open} id={DETAILS_ID}>
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-3">
          {details.map((d) => (
            <div key={d.label} className="rounded-2xl bg-soft px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <d.icon size={12} />
                {d.label}
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold">{d.value}</div>
            </div>
          ))}
        </div>
      </Expandable>
    </section>
  );
}
