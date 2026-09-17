import type { Place } from "../types";

export function isConus(place: Place): boolean {
  return (
    place.latitude >= 24.4 &&
    place.latitude <= 49.6 &&
    place.longitude >= -125.0 &&
    place.longitude <= -66.4
  );
}
