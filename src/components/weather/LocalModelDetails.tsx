import { useApp } from "../../context/AppContext";
import type { LocalModelInfo, LocalModelStatus, Units } from "../../types";
import { formatDistance, formatTemp, formatTempDelta } from "../../lib/units";

const NOWCAST_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const LEAD_LABELS = ["Today", "Tomorrow", "Day 3", "Day 4+"];

/** Why the forecast earns its trust level: what the on-device model learned here. */
export function LocalModelDetails() {
  const { weather, settings } = useApp();
  if (!weather) return null;
  const info = weather.local;

  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.18em] text-muted">CLIMA LOCAL MODEL</h3>
      {info ? (
        <Body info={info} units={settings.units} />
      ) : (
        <p className="mt-2 text-sm text-muted">
          Checking the last 60 days of forecasts against real weather-station readings…
        </p>
      )}
    </div>
  );
}

function Body({ info, units }: { info: LocalModelInfo; units: Units }) {
  const message = statusMessage(info.status);
  if (message) return <p className="mt-2 text-sm text-muted">{message}</p>;

  const gain =
    info.tempMae != null && info.baselineMae
      ? Math.round((1 - info.tempMae / info.baselineMae) * 100)
      : null;
  const rainGain =
    info.rainBrier != null && info.rainBaselineBrier
      ? Math.round((1 - info.rainBrier / info.rainBaselineBrier) * 100)
      : null;
  const nowcastFresh =
    info.nowcast && Date.now() - Date.parse(info.nowcast.obsTime) < NOWCAST_MAX_AGE_MS;

  return (
    <div className="mt-3 space-y-4">
      {info.status === "active" && gain != null ? (
        <div>
          <div className="text-3xl font-semibold text-good">{gain}% smaller error</div>
          <div className="text-sm text-muted">
            than a plain average of the models, tested on the most recent days it had not seen.
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Still learning. The local model has not beaten the plain model average here yet, so
          Clima keeps the standard blend and only uses live station readings.
        </p>
      )}

      {info.station && (
        <p className="text-sm text-muted">
          Learning from <span className="text-ink">{info.station.name}</span> ({info.station.id}),{" "}
          {formatDistance(info.station.distanceKm, units)} away — {info.samples.toLocaleString()} hours
          of real observations.
        </p>
      )}

      {info.tempMae != null && info.baselineMae != null && (
        <div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Clima" value={formatTempDelta(info.tempMae, units)} strong />
            <Stat label="Model average" value={formatTempDelta(info.baselineMae, units)} />
            {info.bestSingle && (
              <Stat
                label={`Best: ${info.bestSingle.label}`}
                value={formatTempDelta(info.bestSingle.mae, units)}
              />
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Typical temperature miss, next few hours.</p>
        </div>
      )}

      {info.leads && info.leads.some((l) => l != null) && (
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {info.leads.map((l, i) => (
            <div key={LEAD_LABELS[i]} className="rounded-xl bg-soft px-1 py-2">
              <div className={`font-semibold ${l?.useful ? "text-good" : "text-muted"}`}>
                {l?.useful ? `−${Math.round((1 - l.mae / l.base) * 100)}%` : "raw"}
              </div>
              <div className="text-[10px] text-muted">{LEAD_LABELS[i]}</div>
            </div>
          ))}
        </div>
      )}

      {rainGain != null && rainGain > 0 && (
        <p className="text-sm text-muted">
          Rain odds are calibrated to this spot: {rainGain}% more reliable than a simple vote of the
          models.
        </p>
      )}

      {nowcastFresh && info.nowcast && Math.abs(info.nowcast.residual) >= 0.5 && (
        <p className="rounded-2xl bg-soft p-3 text-sm text-muted">
          The station read {formatTemp(info.nowcast.obsTemp, units)} at{" "}
          {new Date(info.nowcast.obsTime).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
          . Models were running {formatTempDelta(Math.abs(info.nowcast.residual), units)}{" "}
          {info.nowcast.residual > 0 ? "too cold" : "too warm"}, so Clima is correcting the next
          few hours.
        </p>
      )}

      {info.trust.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted">Who Clima trusts here</div>
          {info.trust.map((t) => (
            <div key={t.model} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 truncate text-muted">{t.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.round(t.weight * 100)}%` }}
                />
              </span>
              <span className="w-9 text-right tabular-nums">{Math.round(t.weight * 100)}%</span>
              <span className="w-14 text-right text-[10px] text-muted tabular-nums">
                {t.mae != null ? `±${formatTempDelta(t.mae, units)}` : ""}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-muted">
            Weights come from how the models' errors combine, after removing each one's local bias —
            so a model can earn weight without being the best on its own. ± is its own typical miss.
          </p>
        </div>
      )}

      {info.history.length >= 2 && <SkillTrend info={info} />}
    </div>
  );
}

function SkillTrend({ info }: { info: LocalModelInfo }) {
  const gains = info.history.map((h) => Math.max(0, 1 - h.mae / h.base));
  const top = Math.max(...gains, 0.01);
  return (
    <div>
      <div className="flex h-8 items-end gap-0.5">
        {gains.map((g, i) => (
          <span
            key={info.history[i].t}
            className="flex-1 rounded-sm bg-accent/70"
            style={{ height: `${Math.max(6, (g / top) * 100)}%` }}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Retrained {info.history.length} times on this device. Each bar is how much it beat the raw
        models that round.
      </p>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-soft p-3">
      <div className={`text-lg font-semibold ${strong ? "text-good" : ""}`}>{value}</div>
      <div className="truncate text-[11px] text-muted">{label}</div>
    </div>
  );
}

function statusMessage(status: LocalModelStatus): string | null {
  switch (status) {
    case "active":
    case "learning":
      return null;
    case "no-station":
      return "No airport weather station within 60 km, so Clima can't check forecasts against real readings here yet. It still uses the multi-model blend.";
    case "unavailable":
      return "The observation archive didn't answer this time. Clima will retry on the next refresh and keeps the multi-model blend meanwhile.";
    default: {
      const never: never = status;
      return never;
    }
  }
}
