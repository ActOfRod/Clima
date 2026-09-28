import { useEffect, useState } from "react";
import { CloudRain, Sun } from "lucide-react";
import { loadNextHour } from "../../api/nowcast";
import { useApp } from "../../context/AppContext";
import {
  HEAVY_MM_H,
  HORIZON_MIN,
  MODERATE_MM_H,
  WET_MM_H,
  type NextHour,
  type NextHourPoint,
} from "../../lib/nextHour";
import { isSnowCode } from "../../lib/weatherCodes";

const REFRESH_MS = 5 * 60_000;
const CHART_H = 56;
const TOP_RATE = 12;
const X_LABELS = [
  { m: 0, label: "Now" },
  { m: 30, label: "30m" },
  { m: 60, label: "1h" },
  { m: 90, label: "90m" },
  { m: 120, label: "2h" },
];

/** Log-ish scale so drizzle is visible and downpours don't flatten everything else. */
function yFor(rate: number): number {
  const f = Math.min(1, Math.log1p(rate) / Math.log1p(TOP_RATE));
  return CHART_H - f * (CHART_H - 2);
}

function areaPath(points: NextHourPoint[]): string {
  if (!points.length) return "";
  const line = points.map((p) => `${p.minutes},${yFor(p.rate).toFixed(2)}`).join(" L");
  return `M${points[0].minutes},${CHART_H} L${line} L${points[points.length - 1].minutes},${CHART_H} Z`;
}

export function NextHourCard() {
  const { weather } = useApp();
  const [next, setNext] = useState<NextHour | null>(null);
  const [failed, setFailed] = useState(false);
  const place = weather?.place;
  const snow = weather
    ? isSnowCode(weather.current.weatherCode) || weather.current.temperature <= 0.5
    : false;

  const placeId = place?.id;
  const latitude = place?.latitude;
  const longitude = place?.longitude;
  const timezone = place?.timezone;

  useEffect(() => {
    if (placeId == null || latitude == null || longitude == null) return;
    const target = { id: placeId, name: "", latitude, longitude, timezone };
    let cancelled = false;
    const run = () =>
      loadNextHour(target, snow)
        .then((result) => {
          if (cancelled) return;
          setNext(result);
          setFailed(false);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    setNext(null);
    void run();
    const id = window.setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [placeId, latitude, longitude, timezone, snow]);

  if (!place || (failed && !next)) return null;

  const radar = next?.points.filter((p) => p.source === "radar") ?? [];
  const model = next?.points.filter((p) => p.source === "model") ?? [];
  const modelWithJoin = radar.length && model.length ? [radar[radar.length - 1], ...model] : model;
  const Icon = next?.kind === "dry" ? Sun : CloudRain;

  return (
    <section className="card p-5" aria-live="polite">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-muted">
          <Icon size={14} className="text-accent" />
          NEXT 2 HOURS
        </h2>
        {next && (
          <span className="text-[11px] text-muted">
            {next.radarUntil != null ? "Live radar + forecast" : "Forecast model"}
          </span>
        )}
      </div>
      <p className="mt-2 text-lg font-semibold">{next ? next.headline : "Checking radar…"}</p>
      {next && next.kind !== "dry" && <RainChart next={next} radar={radar} model={model} modelWithJoin={modelWithJoin} />}
    </section>
  );
}

function RainChart({
  next,
  radar,
  model,
  modelWithJoin,
}: {
  next: NextHour;
  radar: NextHourPoint[];
  model: NextHourPoint[];
  modelWithJoin: NextHourPoint[];
}) {
  return (
    <>
      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${HORIZON_MIN} ${CHART_H}`}
          preserveAspectRatio="none"
          className="h-14 w-full overflow-visible"
          role="img"
          aria-label={`Precipitation intensity for the next 2 hours. ${next.headline}`}
        >
          {[WET_MM_H, MODERATE_MM_H, HEAVY_MM_H].map((r) => (
            <line
              key={r}
              x1={0}
              x2={HORIZON_MIN}
              y1={yFor(r)}
              y2={yFor(r)}
              className="stroke-line"
              strokeWidth={0.5}
              strokeDasharray="1.5 1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={0}
            x2={HORIZON_MIN}
            y1={CHART_H}
            y2={CHART_H}
            className="stroke-line"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {radar.length > 0 && <path d={areaPath(radar)} className="fill-accent" />}
          {modelWithJoin.length > 0 && (
            <path d={areaPath(modelWithJoin)} className="fill-accent" fillOpacity={0.4} />
          )}
          {next.radarUntil != null && next.radarUntil < HORIZON_MIN && model.length > 0 && (
            <line
              x1={next.radarUntil}
              x2={next.radarUntil}
              y1={0}
              y2={CHART_H}
              className="stroke-muted"
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-0.5 text-[9px] text-muted">
          <span>Heavy</span>
          <span>Light</span>
        </div>
      </div>
      <div className="relative mt-1 h-4 text-[10px] text-muted">
        {X_LABELS.map((x) => (
          <span
            key={x.m}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${(x.m / HORIZON_MIN) * 100}%` }}
          >
            {x.label}
          </span>
        ))}
      </div>
    </>
  );
}
