import type { ThemeId } from "../types";

export const THEMES: Array<{
  id: ThemeId;
  label: string;
  hint: string;
  swatch: [string, string];
}> = [
  { id: "light", label: "Light", hint: "Bright & clean", swatch: ["#f6f8fc", "#d7e3f2"] },
  { id: "dark", label: "Dark", hint: "Night", swatch: ["#0b1220", "#1b2a40"] },
  { id: "system", label: "System", hint: "Default", swatch: ["#f4f7fb", "#0b1220"] },
  { id: "sky", label: "Sky", hint: "Clear blue", swatch: ["#6bb7f0", "#e7f5ff"] },
  { id: "autumn", label: "Autumn", hint: "Warm coral", swatch: ["#f4a39c", "#ffe8dc"] },
  { id: "lavender", label: "Lavender", hint: "Dusk violet", swatch: ["#8b6bc9", "#efe4ff"] },
];

export function resolveTheme(id: ThemeId, prefersLight: boolean): Exclude<ThemeId, "system"> {
  if (id === "system") return prefersLight ? "light" : "dark";
  return id;
}

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolved = resolveTheme(id, prefersLight);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme =
    resolved === "dark" ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (meta && bg) meta.setAttribute("content", bg);
}
