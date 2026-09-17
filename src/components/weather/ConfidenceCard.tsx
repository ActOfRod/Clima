import { useApp } from "../../context/AppContext";
import { formatTemp } from "../../lib/units";

export function ConfidenceCard() {
  const { weather, settings } = useApp();
  const skill = weather?.skill;
  if (!skill) return null;
  const tone =
    skill.label === "High"
      ? "text-[#3dd6c6]"
      : skill.label === "Low"
        ? "text-[#f5c16c]"
        : "text-[#d5deea]";

  return (
    <section className="card p-5">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">
        FORECAST TRUST
      </h2>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className={`text-3xl font-semibold ${tone}`}>{skill.label}</div>
          <div className="text-sm text-[#8b9cb3]">{skill.score} / 100 agreement</div>
        </div>
        {skill.rangeLow != null && skill.rangeHigh != null && (
          <div className="text-right text-sm text-[#c5d0e0]">
            Next 12h
            <div className="text-lg font-semibold">
              {formatTemp(skill.rangeLow, settings.units)}–
              {formatTemp(skill.rangeHigh, settings.units)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#3b9bff]"
          style={{ width: `${skill.score}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#c5d0e0]">{skill.reason}</p>
      <p className="mt-2 text-[11px] text-[#8b9cb3]">
        Blended from {skill.sources.join(" · ")}
      </p>
    </section>
  );
}
