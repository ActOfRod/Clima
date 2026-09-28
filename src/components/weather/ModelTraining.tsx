import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, ChevronRight, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { FeedbackKind } from "../../lib/personalModel";
import { formatTempDelta } from "../../lib/units";
import type { PersonalModel, Units } from "../../types";

const OPTIONS: Array<{ id: FeedbackKind; label: string }> = [
  { id: "accurate", label: "Spot on" },
  { id: "colder", label: "Felt colder" },
  { id: "warmer", label: "Felt warmer" },
  { id: "wetter", label: "Wetter than this" },
  { id: "drier", label: "Drier than this" },
];

/** Search-bar–styled box that opens Teach Clima in a centered dialog. */
export function ModelTrainingButton() {
  const { personal } = useApp();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-2xl bg-panel-2 px-4 py-3 text-left ring-1 ring-line"
      >
        <BrainCircuit size={16} className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">Model Training</span>
        <span className="hidden shrink-0 text-xs text-muted sm:inline">
          {personal.samples ? `${personal.samples} note${personal.samples === 1 ? "" : "s"}` : "Teach Clima"}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </button>
      <TeachClimaDialog
        open={open}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
      />
    </>
  );
}

function TeachClimaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="teach-clima"
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/30 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teach-clima-title"
            tabIndex={-1}
            className="card w-full max-w-md p-6 shadow-2xl outline-none"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: reduce ? 0 : 0.26, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="teach-clima-title"
                  className="text-xs font-semibold tracking-[0.18em] text-muted"
                >
                  TEACH CLIMA
                </h2>
                <p className="mt-2 text-lg font-semibold">How did the forecast feel?</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-soft p-2 text-muted hover:text-ink"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <TeachClima />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TeachClima() {
  const { personal, settings, canRecordFeedback, recordFeedback } = useApp();
  const enabled = canRecordFeedback();
  const learned = learnedSummary(personal, settings.units);

  return (
    <div>
      <p className="mt-2 text-sm text-muted">
        If this forecast was off for you, say so. Clima learns on this device, so it fits the
        weather you actually feel.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={!enabled}
            onClick={() => recordFeedback(opt.id)}
            className="rounded-full bg-soft px-3 py-2 text-sm disabled:opacity-40"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        {personal.samples === 0
          ? "No local corrections yet."
          : `${personal.samples} note${personal.samples === 1 ? "" : "s"} saved on this device.`}
        {!enabled ? " Thanks — check back in a couple of hours." : ""}
      </p>
      {learned && (
        <p className="mt-2 rounded-2xl bg-soft p-3 text-sm text-muted">{learned}</p>
      )}
    </div>
  );
}

function learnedSummary(model: PersonalModel, units: Units): string | null {
  if (model.samples === 0) return null;
  const parts: string[] = [];
  if (Math.abs(model.tempBias) >= 0.3) {
    parts.push(
      `you feel about ${formatTempDelta(Math.abs(model.tempBias), units)} ${
        model.tempBias < 0 ? "colder" : "warmer"
      } than the forecast`,
    );
  }
  const rain = Math.round((model.rainScale - 1) * 100);
  if (Math.abs(rain) >= 5) {
    parts.push(`rain odds run ${Math.abs(rain)}% ${rain > 0 ? "higher" : "lower"} for you`);
  }
  if (!parts.length) return "So far the forecast matches how the weather feels to you.";
  return `So far Clima has learned that ${parts.join(", and ")}.`;
}
