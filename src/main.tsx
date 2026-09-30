import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initNative } from "./lib/native";
import "./index.css";

const basename = import.meta.env.BASE_URL === "./" ? "/" : import.meta.env.BASE_URL;

// The Android app ships its assets in the APK; a service worker there would only
// risk serving a stale build after an update.
if (Capacitor.isNativePlatform()) initNative();
else registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
