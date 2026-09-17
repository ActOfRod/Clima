import type { Place } from "../types";
import { getJson } from "./client";

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

interface SearchResponse {
  results?: GeoResult[];
}

interface ReverseResponse {
  results?: GeoResult[];
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    name: q,
    count: "8",
    language: "en",
    format: "json",
  });
  const data = await getJson<SearchResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  );
  return (data.results ?? []).map(toPlace);
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<Place> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    language: "en",
    format: "json",
  });
  try {
    const data = await getJson<ReverseResponse>(
      `https://geocoding-api.open-meteo.com/v1/reverse?${params}`,
    );
    if (data.results?.[0]) return toPlace(data.results[0]);
  } catch {
    /* fall through */
  }
  return {
    id: `${latitude.toFixed(3)},${longitude.toFixed(3)}`,
    name: "Current location",
    latitude,
    longitude,
  };
}

function toPlace(r: GeoResult): Place {
  return {
    id: String(r.id),
    name: r.name,
    admin: r.admin1,
    country: r.country,
    countryCode: r.country_code?.toUpperCase(),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  };
}
