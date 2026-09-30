import { regionAbbrev } from "../lib/locality";
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

interface AdminEntry {
  name?: string;
  description?: string;
  order?: number;
  adminLevel?: number;
}

export interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
  countryCode?: string;
  localityInfo?: { administrative?: AdminEntry[] };
}

const SETTLEMENT = /\b(city|town|village|township|hamlet|municipality|borough|commune|charter township)\b/i;

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

/**
 * BigDataCloud's `city` is the wider urban area (Warren, MI reports "Detroit"),
 * while `locality` is the most specific name, which can be a neighborhood.
 * Use the locality when it is a settlement in its own right, and the city when
 * the locality is only part of it (Manhattan, Westminster, a Paris quartier).
 */
export function pickLocalityName(data: BigDataCloudResponse): string | null {
  const city = data.city?.trim() || "";
  const locality = data.locality?.trim() || "";
  if (!locality) return city || null;
  if (!city || locality.toLowerCase() === city.toLowerCase()) return locality;
  const entry = data.localityInfo?.administrative?.find(
    (a) => a.name?.trim().toLowerCase() === locality.toLowerCase(),
  );
  const description = entry?.description ?? "";
  const partOfCity = description.toLowerCase().includes(city.toLowerCase());
  if (entry && SETTLEMENT.test(description) && !partOfCity) return locality;
  return city;
}

export function currentPlaceId(latitude: number, longitude: number): string {
  return `current:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

/**
 * Name a GPS fix. The returned place always keeps the device's own coordinates,
 * so the forecast is for where you are, not the centre of the nearest big city.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<Place> {
  const base: Place = {
    id: currentPlaceId(latitude, longitude),
    name: "Current location",
    latitude,
    longitude,
  };
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  try {
    const data = await getJson<BigDataCloudResponse>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
      {},
      8_000,
    );
    const name = pickLocalityName(data);
    return {
      ...base,
      name: name ?? base.name,
      admin:
        regionAbbrev(data.principalSubdivisionCode, data.countryCode) ??
        data.principalSubdivision ??
        undefined,
      country: data.countryName,
      countryCode: data.countryCode?.toUpperCase(),
    };
  } catch {
    return base;
  }
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
