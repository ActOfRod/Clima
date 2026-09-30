import { MapPinOff, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ModelTrainingButton } from "./ModelTraining";
import { SearchBar } from "./SearchBar";

/** Location search + Model Training, shared by the Weather and Clima AI tabs. */
export function TopBar() {
  const { locationNotice, dismissLocationNotice } = useApp();
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <SearchBar placeholder="Location" />
        <ModelTrainingButton />
      </div>
      {locationNotice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl bg-soft px-3 py-2 text-xs text-muted"
        >
          <MapPinOff size={14} className="mt-0.5 shrink-0" />
          <p className="flex-1">{locationNotice}</p>
          <button
            type="button"
            onClick={dismissLocationNotice}
            className="shrink-0 text-muted hover:text-ink"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
