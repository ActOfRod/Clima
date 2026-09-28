import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function SeeMoreButton({
  open,
  onToggle,
  controls,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent"
    >
      {open ? "See less" : "See more"}
      <ChevronDown
        size={14}
        className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

/** Height-animated disclosure panel shared by the See more cards. */
export function Expandable({
  open,
  id,
  children,
}: {
  open: boolean;
  id: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : 0.38;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          key={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration, ease: [0.32, 0.72, 0, 1] },
            opacity: { duration: reduce ? 0 : 0.24 },
          }}
          className="overflow-hidden"
        >
          <div className="pt-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
