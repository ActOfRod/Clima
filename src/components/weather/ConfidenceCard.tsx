import { useApp } from "../../context/AppContext";
import { formatTemp } from "../../lib/units";

export function ConfidenceCard() {
  const { weather, settings } = useApp();
  const skill = weather?.skill;
  if (!skill) return null;
  const tone =
    skill.label === "High"
      ? "text-good"
      : skill.label === "Low"
        ? "text-warn"
        : "text-ink";

  return (
    <section className="card p-5">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-muted">
        FORECAST TRUST
      </h2>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className={`text-3xl font-semibold ${tone}`}>{skill.label}</div>
          <div className="text-sm text-muted">{skill.score} / 100 agreement</div>
        </div>
        {skill.rangeLow != null && skill.rangeHigh != null && (
          <div className="text-right text-sm text-muted">
            Next 12h
            <div className="text-lg font-semibold">
              {formatTemp(skill.rangeLow, settings.units)}–
              {formatTemp(skill.rangeHigh, settings.units)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soft">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${skill.score}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{skill.reason}</p>
      <p className="mt-2 text-[11px] text-muted">
        Blended from {skill.sources.join(" · ")}
      </p>
    </section>
  );
}
