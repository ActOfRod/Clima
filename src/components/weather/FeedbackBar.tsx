import { useApp } from "../../context/AppContext";
import type { FeedbackKind } from "../../lib/personalModel";

const OPTIONS: Array<{ id: FeedbackKind; label: string }> = [
  { id: "accurate", label: "Spot on" },
  { id: "colder", label: "Felt colder" },
  { id: "warmer", label: "Felt warmer" },
  { id: "wetter", label: "Wetter than this" },
  { id: "drier", label: "Drier than this" },
];

export function FeedbackBar() {
  const { personal, canRecordFeedback, recordFeedback } = useApp();
  const enabled = canRecordFeedback();

  return (
    <section className="card p-5">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-[#8b9cb3]">
        TEACH CLIMA
      </h2>
      <p className="mt-2 text-sm text-[#c5d0e0]">
        Other apps lock in one model. If this forecast was off for you, say so — Clima
        learns on this device and stops trusting a single number.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={!enabled}
            onClick={() => recordFeedback(opt.id)}
            className="rounded-full bg-white/5 px-3 py-2 text-xs disabled:opacity-40"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#8b9cb3]">
        {personal.samples === 0
          ? "No local corrections yet."
          : `${personal.samples} note${personal.samples === 1 ? "" : "s"} saved on this device.`}
        {!enabled ? " Thanks — check back in a couple of hours." : ""}
      </p>
    </section>
  );
}
