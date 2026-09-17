import type { AlertItem, Place } from "../types";
import { getJson } from "./client";

const USER_AGENT = "ClimaWeather/1.0 (https://github.com/ActOfRod/Clima)";

interface NwsAlertResponse {
  features?: Array<{
    id?: string;
    properties?: {
      event?: string;
      headline?: string;
      severity?: string;
      urgency?: string;
      description?: string;
      instruction?: string;
      ends?: string;
    };
  }>;
}

export function isLikelyUs(place: Place): boolean {
  if (place.countryCode === "US") return true;
  return (
    place.latitude >= 24 &&
    place.latitude <= 72 &&
    place.longitude >= -180 &&
    place.longitude <= -66
  );
}

export async function fetchNwsAlerts(place: Place): Promise<AlertItem[]> {
  if (!isLikelyUs(place)) return [];
  const url = `https://api.weather.gov/alerts/active?point=${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
  try {
    const data = await getJson<NwsAlertResponse>(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
      },
    });
    return (data.features ?? [])
      .map((f, i) => ({
        id: f.id ?? `nws-${i}`,
        event: f.properties?.event ?? "Alert",
        headline: f.properties?.headline ?? f.properties?.event ?? "Weather alert",
        severity: f.properties?.severity ?? "Unknown",
        urgency: f.properties?.urgency ?? "Unknown",
        description: f.properties?.description ?? "",
        instruction: f.properties?.instruction ?? undefined,
        ends: f.properties?.ends ?? undefined,
        source: "nws" as const,
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}
