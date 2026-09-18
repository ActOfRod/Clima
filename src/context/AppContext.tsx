import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { reverseGeocode } from "../api/geocoding";
import { loadWeather } from "../api/weather";
import { generateBriefing } from "../ai/insights";
import {
  DEFAULT_PERSONAL,
  applyFeedback,
  applyPersonal,
  canFeedback,
  type FeedbackKind,
} from "../lib/personalModel";
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
};

interface AppState {
  place: Place;
  saved: Place[];
  settings: SettingsState;
  weather: WeatherBundle | null;
  briefing: AiBriefing | null;
  loading: boolean;
  error: string | null;
  locating: boolean;
  usingCurrentLocation: boolean;
  personal: PersonalModel;
  setPlace: (place: Place, persist?: boolean) => void;
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
  const [place, setPlaceState] = useState<Place>(() =>
    readJson<Place>("place", DEFAULT_PLACE),
  );
  const [saved, setSaved] = useState<Place[]>(() => readJson<Place[]>("saved", []));
  const [settings, setSettings] = useState<SettingsState>(() =>
    readJson<SettingsState>("settings", DEFAULT_SETTINGS),
  );
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const [tick, setTick] = useState(0);
  const [personal, setPersonal] = useState<PersonalModel>(() =>
    readJson<PersonalModel>("personal", DEFAULT_PERSONAL),
  );

  const displayWeather = useMemo(
    () => (weather ? applyPersonal(weather, personal) : null),
    [weather, personal],
  );

  const briefing = useMemo(
    () => (displayWeather ? generateBriefing(displayWeather, settings.units) : null),
    [displayWeather, settings.units],
  );

  const setPlace = useCallback((next: Place, persist = true) => {
    setPlaceState(next);
    setUsingCurrentLocation(false);
    if (persist) writeJson("place", next);
  }, []);

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

  const applyCoords = useCallback(
    async (lat: number, lon: number) => {
      const resolved = await reverseGeocode(lat, lon);
      setPlaceState(resolved);
      writeJson("place", resolved);
      setUsingCurrentLocation(true);
    },
    [],
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyCoords(pos.coords.latitude, pos.coords.longitude).finally(() =>
          setLocating(false),
        );
      },
      () => {
        setLocating(false);
        setError("Could not read your location. Search for a city instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [applyCoords]);

  useEffect(() => {
    if (!settings.useLocation) return;
    const asked = readJson<boolean>("asked-location", false);
    if (asked) return;
    writeJson("asked-location", true);
    requestLocation();
  }, [settings.useLocation, requestLocation]);

  useEffect(() => {
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
  }, [place, tick]);

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
