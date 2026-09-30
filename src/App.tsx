import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AppProvider } from "./context/AppContext";
import { CitiesPage } from "./pages/CitiesPage";
import { HomePage } from "./pages/HomePage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { LocalPage } from "./pages/LocalPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SettingsPage } from "./pages/SettingsPage";

/** Leaflet is most of the bundle; load it only when the Radar tab opens. */
const RadarPage = lazy(() => import("./pages/RadarPage").then((m) => ({ default: m.RadarPage })));

function RadarRoute() {
  return (
    <Suspense fallback={<div className="h-[68vh] animate-pulse rounded-[28px] bg-soft" />}>
      <RadarPage />
    </Suspense>
  );
}

export function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="weather" element={<HomePage />} />
          <Route path="local" element={<LocalPage />} />
          <Route path="radar" element={<RadarRoute />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
