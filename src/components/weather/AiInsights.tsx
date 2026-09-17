import { Sparkles } from "lucide-react";
import { useApp } from "../../context/AppContext";

const TONE: Record<string, string> = {
  calm: "bg-white/5",
  good: "bg-teal-400/10",
  watch: "bg-amber-400/10",
  alert: "bg-rose-400/15",
};

export function AiInsights() {
  const { briefing } = useApp();
  if (!briefing) return null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2 text-[#8b9cb3]">
        <Sparkles size={16} className="text-[#3b9bff]" />
        <h2 className="text-xs font-semibold tracking-[0.18em]">CLIMA AI</h2>
      </div>
      <h3 className="text-lg font-semibold">{briefing.headline}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#c5d0e0]">{briefing.summary}</p>
      <p className="mt-3 text-sm text-[#9eb0c7]">{briefing.clothing}</p>
      {briefing.bestWindow && (
        <p className="mt-2 text-sm text-[#3dd6c6]">
          Best outdoor window: {briefing.bestWindow}
        </p>
      )}
      {briefing.cards.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {briefing.cards.map((card) => (
            <div key={card.id} className={`rounded-2xl px-3 py-3 ${TONE[card.tone]}`}>
              <div className="text-sm font-medium">{card.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#c5d0e0]">{card.body}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {briefing.activities.map((a) => (
          <div key={a.id} className="rounded-2xl bg-white/5 px-3 py-3">
            <div className="text-xs text-[#8b9cb3]">{a.label}</div>
            <div className="mt-1 text-xl font-semibold">{a.score}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#3b9bff]"
                style={{ width: `${a.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
