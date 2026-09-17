import type { Units } from "../types";

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function mmToIn(mm: number): number {
  return mm / 25.4;
}

export function kmToMi(km: number): number {
  return km * 0.621371;
}

export function formatTemp(celsius: number, units: Units, withUnit = true): string {
  const value = units === "imperial" ? Math.round(cToF(celsius)) : Math.round(celsius);
  return withUnit ? `${value}°` : `${value}`;
}

export function formatWind(kmh: number, units: Units): string {
  if (units === "imperial") return `${kmhToMph(kmh).toFixed(1)} mph`;
  const pretty = kmh < 10 ? kmh.toFixed(1) : Math.round(kmh).toString();
  return `${pretty} km/h`;
}

export function formatPrecip(mm: number, units: Units): string {
  if (units === "imperial") return `${mmToIn(mm).toFixed(2)} in`;
  return `${mm.toFixed(1)} mm`;
}

export function formatVisibility(km: number | null, units: Units): string {
  if (km == null) return "—";
  if (units === "imperial") return `${kmToMi(km).toFixed(1)} mi`;
  return `${km.toFixed(1)} km`;
}

export function formatPressure(hpa: number, units: Units): string {
  if (units === "imperial") return `${(hpa * 0.02953).toFixed(2)} inHg`;
  return `${Math.round(hpa)} hPa`;
}

export function windCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function aqiLabel(aqi: number | null): { label: string; tone: string } {
  if (aqi == null) return { label: "Unavailable", tone: "calm" };
  if (aqi <= 50) return { label: "Good", tone: "good" };
  if (aqi <= 100) return { label: "Moderate", tone: "watch" };
  if (aqi <= 150) return { label: "Unhealthy (SG)", tone: "watch" };
  if (aqi <= 200) return { label: "Unhealthy", tone: "alert" };
  if (aqi <= 300) return { label: "Very unhealthy", tone: "alert" };
  return { label: "Hazardous", tone: "alert" };
}
