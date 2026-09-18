import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AppProvider } from "./context/AppContext";
import { CitiesPage } from "./pages/CitiesPage";
import { HomePage } from "./pages/HomePage";
import { HomeRedirect } from "./pages/HomeRedirect";
import { LocalPage } from "./pages/LocalPage";
import { RadarPage } from "./pages/RadarPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="weather" element={<HomePage />} />
          <Route path="local" element={<LocalPage />} />
          <Route path="radar" element={<RadarPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
