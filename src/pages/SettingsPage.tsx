import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { THEMES } from "../lib/theme";
import type { ThemeId } from "../types";

export function SettingsPage() {
  const { settings, updateSettings, requestLocation, locating } = useApp();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Look, units, location, and data sources.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">THEME</h2>
        <p className="mt-1 text-sm text-muted">
          System follows your phone. Sky, Autumn, and Lavender keep the flat UI with a color wash.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              id={theme.id}
              label={theme.label}
              hint={theme.hint}
              swatch={theme.swatch}
              selected={settings.theme === theme.id}
              onSelect={() => updateSettings({ theme: theme.id })}
            />
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">UNITS</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => updateSettings({ units: u })}
              className={`rounded-2xl px-3 py-3 text-sm ${
                settings.units === u ? "bg-accent text-on-accent" : "bg-soft"
              }`}
            >
              {u === "metric" ? "Metric (°C, km/h)" : "Imperial (°F, mph)"}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">LOCATION</h2>
        <Toggle
          label="Ask for device location"
          on={settings.useLocation}
          onChange={(useLocation) => updateSettings({ useLocation })}
        />
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-2xl bg-soft px-4 py-3 text-sm"
        >
          {locating ? "Locating…" : "Use my current location"}
        </button>
      </section>

      <section className="card p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">MOTION</h2>
        <div className="mt-3">
          <Toggle
            label="Radar animations"
            on={settings.animations}
            onChange={(animations) => updateSettings({ animations })}
          />
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">CITIES</h2>
        <p className="text-sm text-muted">Manage your starred cities from one place.</p>
        <Link className="inline-flex rounded-2xl bg-soft px-4 py-3 text-sm text-ink" to="/cities">
          Open cities
        </Link>
      </section>

      <section className="card space-y-3 p-5 text-sm text-muted">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">FREE DATA SOURCES</h2>
        <p>
          Clima uses no paid keys. Forecast, air quality, and geocoding come from{" "}
          <a className="text-accent" href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          . US alerts come from{" "}
          <a className="text-accent" href="https://api.weather.gov" target="_blank" rel="noreferrer">
            api.weather.gov
          </a>
          . US radar is NOAA NEXRAD via Iowa State. Global radar is NASA GPM IMERG.
        </p>
        <p className="text-xs text-muted">
          Clima AI and Teach Clima run on-device. Ensemble spread, clothing, and your colder/wetter
          notes never leave this phone.
        </p>
        <Link className="inline-block text-sm text-accent" to="/privacy">
          Privacy
        </Link>
      </section>
    </div>
  );
}

function ThemeCard({
  id,
  label,
  hint,
  swatch,
  selected,
  onSelect,
}: {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: [string, string];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-2xl text-left ring-1 ${
        selected ? "ring-accent ring-2" : "ring-line"
      }`}
    >
      <div
        className="h-16"
        style={{
          background: `linear-gradient(160deg, ${swatch[0]} 0%, ${swatch[1]} 100%)`,
        }}
      />
      <div className="bg-panel px-3 py-2">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-[11px] text-muted">{id === "system" ? "Default" : hint}</div>
      </div>
    </button>
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
        className={`h-7 w-12 rounded-full p-1 ${on ? "bg-accent" : "bg-soft"}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`}
        />
      </button>
    </label>
  );
}
