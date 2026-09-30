import { App } from "@capacitor/app";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

const backHandlers: Array<() => void> = [];

/**
 * Let an overlay (dialog, sheet) claim the Android back button while it is open.
 * The most recently registered handler wins. Returns an unregister function.
 */
export function onBackButton(handler: () => void): () => void {
  backHandlers.push(handler);
  return () => {
    const i = backHandlers.lastIndexOf(handler);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

/** Android back: close the top overlay, else go back a page, else leave the app. */
export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener("backButton", ({ canGoBack }) => {
    const top = backHandlers[backHandlers.length - 1];
    if (top) top();
    else if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}

/** Light status/navigation bar icons on dark themes, dark icons on light ones. */
export function syncSystemBars(dark: boolean): void {
  if (!Capacitor.isNativePlatform()) return;
  void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(
    () => undefined,
  );
}
