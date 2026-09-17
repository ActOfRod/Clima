import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export function SettingsPage() {
  const { settings, updateSettings, requestLocation, locating } = useApp();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[#8b9cb3]">Units, location, and data sources.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">UNITS</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => updateSettings({ units: u })}
              className={`rounded-2xl px-3 py-3 text-sm ${
                settings.units === u ? "bg-[#3b9bff] text-white" : "bg-white/5"
              }`}
            >
              {u === "metric" ? "Metric (°C, km/h)" : "Imperial (°F, mph)"}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">LOCATION</h2>
        <Toggle
          label="Ask for device location"
          on={settings.useLocation}
          onChange={(useLocation) => updateSettings({ useLocation })}
        />
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-2xl bg-white/5 px-4 py-3 text-sm"
        >
          {locating ? "Locating…" : "Use my current location"}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">MOTION</h2>
        <div className="mt-3">
          <Toggle
            label="Radar animations"
            on={settings.animations}
            onChange={(animations) => updateSettings({ animations })}
          />
        </div>
      </section>

      <section className="card space-y-3 p-5 text-sm text-[#c5d0e0]">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">
          FREE DATA SOURCES
        </h2>
        <p>
          Clima uses no paid keys. Forecast, air quality, and geocoding come from{" "}
          <a className="text-[#3b9bff]" href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          . US alerts come from{" "}
          <a className="text-[#3b9bff]" href="https://api.weather.gov" target="_blank" rel="noreferrer">
            api.weather.gov
          </a>
          . US radar is NOAA NEXRAD via Iowa State. Global radar is NASA GPM IMERG (no
          watermarks). Confidence uses the GEFS ensemble plus NCEP NBM (US) or ECMWF IFS.
        </p>
        <p className="text-xs text-[#8b9cb3]">
          Clima AI and Teach Clima run on-device. Ensemble spread, clothing, and your colder/wetter
          notes never leave this phone.
        </p>
        <Link className="inline-block text-sm text-[#3b9bff]" to="/privacy">
          Privacy
        </Link>
      </section>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`h-7 w-12 rounded-full p-1 ${on ? "bg-[#3b9bff]" : "bg-white/10"}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}
