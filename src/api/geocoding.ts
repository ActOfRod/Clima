import { isGenericPlaceName, regionAbbrev } from "../lib/locality";
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

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
  countryCode?: string;
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
  const fromMeteo = await reverseOpenMeteo(latitude, longitude);
  if (fromMeteo && !isGenericPlaceName(fromMeteo.name)) return fromMeteo;

  const fromBdc = await reverseBigDataCloud(latitude, longitude);
  if (fromBdc && !isGenericPlaceName(fromBdc.name)) return fromBdc;

  return fromMeteo ?? fromBdc ?? coordPlace(latitude, longitude);
}

async function reverseOpenMeteo(
  latitude: number,
  longitude: number,
): Promise<Place | null> {
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
  return null;
}

async function reverseBigDataCloud(
  latitude: number,
  longitude: number,
): Promise<Place | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  try {
    const data = await getJson<BigDataCloudResponse>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
    );
    const name = data.city || data.locality;
    if (!name) return null;
    const admin =
      regionAbbrev(data.principalSubdivisionCode, data.countryCode) ??
      data.principalSubdivision ??
      undefined;
    return {
      id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      name,
      admin,
      country: data.countryName,
      countryCode: data.countryCode?.toUpperCase(),
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

function coordPlace(latitude: number, longitude: number): Place {
  return {
    id: `${latitude.toFixed(3)},${longitude.toFixed(3)}`,
    name: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
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
