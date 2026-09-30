import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { reverseGeocode, searchPlaces } from "../api/geocoding";
import { DEFAULT_RADAR_PALETTE } from "../api/librewxr";
import {
  loadLocalLearning,
  withLocalLearning,
  type LocalLearning,
} from "../api/localLearning";
import { LocationError, getCurrentFix, type LocationFailure } from "../api/location";
import { distanceKm } from "../lib/geo";
import { isGenericPlaceName } from "../lib/locality";
import { loadWeather } from "../api/weather";
import { generateBriefing } from "../ai/insights";
import {
  DEFAULT_PERSONAL,
  applyFeedback,
  applyPersonal,
  canFeedback,
  type FeedbackKind,
} from "../lib/personalModel";
import { applyTheme } from "../lib/theme";
import { readJson, writeJson } from "../lib/storage";
import type {
  AiBriefing,
  PersonalModel,
  Place,
  SettingsState,
  WeatherBundle,
} from "../types";

const DEFAULT_PLACE: Place = {
  id: "3117735",
  name: "Madrid",
  admin: "Madrid",
  country: "Spain",
  countryCode: "ES",
  latitude: 40.4168,
  longitude: -3.7038,
};

const DEFAULT_SETTINGS: SettingsState = {
  units: "imperial",
  useLocation: true,
  animations: true,
  theme: "system",
  defaultPage: "weather",
  radarPalette: DEFAULT_RADAR_PALETTE,
  radarArrows: false,
  mapLayer: "radar",
};

type LocationMode = "current" | "chosen";

/** Re-check position when the app returns to the foreground after this long. */
const RELOCATE_AFTER_MS = 5 * 60_000;
/** Moves smaller than this keep the current place (no re-geocode, no refetch). */
const SAME_SPOT_KM = 0.3;
/** On first launch, show the last known place if the first fix is this slow. */
const FIRST_FIX_WAIT_MS = 10_000;

function isPlace(value: unknown): value is Place {
  const p = value as Partial<Place> | null;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude!) <= 90 &&
    Math.abs(p.longitude!) <= 180
  );
}

function isCurrentPlace(place: Place): boolean {
  return place.id.startsWith("current:");
}

function readStoredPlace(): Place | null {
  const stored = readJson<unknown>("place", null);
  return isPlace(stored) ? stored : null;
}

/** Current location is the default; only an explicit city choice switches it off. */
function readMode(): LocationMode {
  return readJson<LocationMode | null>("location-mode", null) === "chosen" ? "chosen" : "current";
}

/**
 * Without location access and no place yet, start at the city in the device's
 * time zone (America/Detroit → Detroit) rather than a fixed default abroad.
 */
async function timezonePlace(): Promise<Place | null> {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const city = zone.split("/").pop()?.replace(/_/g, " ");
  if (!city || !zone.includes("/") || /^(UTC|GMT)/i.test(zone)) return null;
  try {
    const hits = await searchPlaces(city);
    return hits.find((p) => p.timezone === zone) ?? hits[0] ?? null;
  } catch {
    return null;
  }
}

function readSettings(): SettingsState {
  const stored = readJson<Partial<SettingsState> | null>("settings", null);
  return { ...DEFAULT_SETTINGS, ...(stored && typeof stored === "object" ? stored : {}) };
}

function noticeFor(kind: LocationFailure, fallback: Place): string {
  const showing = isGenericPlaceName(fallback.name) ? "" : ` Showing ${fallback.name} for now.`;
  switch (kind) {
    case "denied":
      return `Location permission is off for Clima.${showing} Allow location in Settings or search for a city.`;
    case "off":
      return `Your location is unavailable.${showing} Turn on location services or search for a city.`;
    case "timeout":
      return `Finding your location took too long.${showing} Tap the pin to try again.`;
    case "unsupported":
      return `This device can't share its location.${showing} Search for a city instead.`;
    default: {
      const never: never = kind;
      return never;
    }
  }
}

interface AppState {
  place: Place;
  saved: Place[];
  settings: SettingsState;
  weather: WeatherBundle | null;
  briefing: AiBriefing | null;
  loading: boolean;
  error: string | null;
  locating: boolean;
  /** First launch in current-location mode: waiting for a GPS fix before loading weather. */
  findingLocation: boolean;
  locationNotice: string | null;
  dismissLocationNotice: () => void;
  usingCurrentLocation: boolean;
  personal: PersonalModel;
  setPlace: (place: Place, persist?: boolean, fromCurrentLocation?: boolean) => void;
  refresh: () => void;
  toggleSave: (place: Place) => void;
  isSaved: (id: string) => boolean;
  updateSettings: (patch: Partial<SettingsState>) => void;
  requestLocation: () => void;
  recordFeedback: (kind: FeedbackKind) => void;
  canRecordFeedback: () => boolean;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [place, setPlaceState] = useState<Place>(() => readStoredPlace() ?? DEFAULT_PLACE);
  const [saved, setSaved] = useState<Place[]>(() => {
    const stored = readJson<unknown>("saved", []);
    return Array.isArray(stored) ? stored.filter(isPlace) : [];
  });
  const [settings, setSettings] = useState<SettingsState>(readSettings);
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>(readMode);
  const [findingLocation, setFindingLocation] = useState(() => {
    const stored = readStoredPlace();
    return readSettings().useLocation && readMode() === "current" && !(stored && isCurrentPlace(stored));
  });
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const placeRef = useRef(place);
  const modeRef = useRef(locationMode);
  const locatingRef = useRef(false);
  const lastFixAt = useRef(0);
  placeRef.current = place;
  modeRef.current = locationMode;
  const [personal, setPersonal] = useState<PersonalModel>(() =>
    readJson<PersonalModel>("personal", DEFAULT_PERSONAL),
  );

  const [learning, setLearning] = useState<LocalLearning | null>(null);

  const displayWeather = useMemo(() => {
    if (!weather) return null;
    const learned = learning ? withLocalLearning(weather, learning) : weather;
    return applyPersonal(learned, personal);
  }, [weather, learning, personal]);

  const briefing = useMemo(
    () => (displayWeather ? generateBriefing(displayWeather, settings.units) : null),
    [displayWeather, settings.units],
  );

  const setMode = useCallback((mode: LocationMode) => {
    modeRef.current = mode;
    setLocationMode(mode);
    writeJson("location-mode", mode);
  }, []);

  const setPlace = useCallback(
    (next: Place, persist = true, fromCurrentLocation = false) => {
      placeRef.current = next;
      setPlaceState(next);
      setMode(fromCurrentLocation ? "current" : "chosen");
      if (!fromCurrentLocation) setLocationNotice(null);
      if (persist) writeJson("place", next);
    },
    [setMode],
  );

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeJson("settings", next);
      return next;
    });
  }, []);

  const toggleSave = useCallback((target: Place) => {
    setSaved((prev) => {
      const exists = prev.some((p) => p.id === target.id);
      const next = exists
        ? prev.filter((p) => p.id !== target.id)
        : [target, ...prev].slice(0, 12);
      writeJson("saved", next);
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some((p) => p.id === id),
    [saved],
  );

  const recordFeedback = useCallback(
    (kind: FeedbackKind) => {
      setPersonal((prev) => {
        const next = applyFeedback(prev, kind, place.id);
        writeJson("personal", next);
        return next;
      });
    },
    [place.id],
  );

  const canRecordFeedback = useCallback(
    () => canFeedback(personal, place.id),
    [personal, place.id],
  );

  /**
   * Get a fix and switch to it. Small moves keep the current place so the
   * forecast doesn't refetch; a generic name ("Current location") is always
   * re-geocoded. Failures leave the last place on screen with a notice.
   */
  const locate = useCallback(async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    try {
      const fix = await getCurrentFix();
      lastFixAt.current = Date.now();
      if (modeRef.current === "chosen") return;
      setLocationNotice(null);
      const current = placeRef.current;
      const sameSpot =
        isCurrentPlace(current) &&
        !isGenericPlaceName(current.name) &&
        distanceKm(current.latitude, current.longitude, fix.latitude, fix.longitude) < SAME_SPOT_KM;
      if (!sameSpot) {
        const resolved = await reverseGeocode(fix.latitude, fix.longitude);
        if (modeRef.current === "current") setPlace(resolved, true, true);
      }
    } catch (err) {
      const kind = err instanceof LocationError ? err.kind : "off";
      if (modeRef.current === "current") {
        if (placeRef.current.id === DEFAULT_PLACE.id) {
          const nearby = await timezonePlace();
          if (nearby) {
            placeRef.current = nearby;
            setPlaceState(nearby);
            writeJson("place", nearby);
          }
        }
        setLocationNotice(noticeFor(kind, placeRef.current));
      }
    } finally {
      locatingRef.current = false;
      setLocating(false);
      setFindingLocation(false);
    }
  }, [setMode, setPlace]);

  const requestLocation = useCallback(() => {
    setMode("current");
    void locate();
  }, [locate, setMode]);

  useEffect(() => {
    if (settings.useLocation && modeRef.current === "current") void locate();
    else setFindingLocation(false);
  }, [settings.useLocation, locate]);

  useEffect(() => {
    if (!findingLocation) return;
    const id = window.setTimeout(() => setFindingLocation(false), FIRST_FIX_WAIT_MS);
    return () => window.clearTimeout(id);
  }, [findingLocation]);

  useEffect(() => {
    if (!settings.useLocation) return;
    const onReturn = () => {
      if (document.visibilityState === "hidden") return;
      if (modeRef.current !== "current") return;
      if (Date.now() - lastFixAt.current < RELOCATE_AFTER_MS) return;
      void locate();
    };
    document.addEventListener("visibilitychange", onReturn);
    const resume = Capacitor.isNativePlatform() ? NativeApp.addListener("resume", onReturn) : null;
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      void resume?.then((handle) => handle.remove());
    };
  }, [settings.useLocation, locate]);

  useEffect(() => {
    applyTheme(settings.theme ?? "system");
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme(settings.theme ?? "system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.theme]);

  useEffect(() => {
    if (findingLocation) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadWeather(place)
      .then((bundle) => {
        if (!cancelled) setWeather(bundle);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load weather");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [place, tick, findingLocation]);

  useEffect(() => {
    if (findingLocation) return;
    let cancelled = false;
    loadLocalLearning(place)
      .then((next) => {
        if (!cancelled) setLearning(next);
      })
      .catch(() => {
        if (!cancelled) setLearning(null);
      });
    return () => {
      cancelled = true;
    };
  }, [place, tick, findingLocation]);

  const usingCurrentLocation = locationMode === "current" && isCurrentPlace(place);
  const dismissLocationNotice = useCallback(() => setLocationNotice(null), []);

  const value = useMemo<AppState>(
    () => ({
      place,
      saved,
      settings,
      weather: displayWeather,
      briefing,
      loading,
      error,
      locating,
      findingLocation,
      locationNotice,
      dismissLocationNotice,
      usingCurrentLocation,
      personal,
      setPlace,
      refresh: () => setTick((n) => n + 1),
      toggleSave,
      isSaved,
      updateSettings,
      requestLocation,
      recordFeedback,
      canRecordFeedback,
    }),
    [
      place,
      saved,
      settings,
      displayWeather,
      briefing,
      loading,
      error,
      locating,
      findingLocation,
      locationNotice,
      dismissLocationNotice,
      usingCurrentLocation,
      personal,
      setPlace,
      toggleSave,
      isSaved,
      updateSettings,
      requestLocation,
      recordFeedback,
      canRecordFeedback,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
