import type { Place } from "../types";

export function isConus(place: Pick<Place, "latitude" | "longitude">): boolean {
  return (
    place.latitude >= 24.4 &&
    place.latitude <= 49.6 &&
    place.longitude >= -125.0 &&
    place.longitude <= -66.4
  );
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
