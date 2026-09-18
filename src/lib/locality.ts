import type { Place } from "../types";

const GENERIC = /^(current location|unknown)$/i;

const US_STATES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

export function isGenericPlaceName(name?: string): boolean {
  return !name || GENERIC.test(name.trim());
}

export function regionAbbrev(admin?: string, countryCode?: string): string | undefined {
  if (!admin) return undefined;
  const trimmed = admin.trim();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  const fromCode = trimmed.match(/^[A-Z]{2}-([A-Z]{2})$/);
  if (fromCode) return fromCode[1];
  if ((countryCode ?? "US") === "US") {
    return US_STATES[trimmed.toLowerCase()] ?? trimmed;
  }
  return trimmed;
}

export function localityLine(place: Place): string | null {
  const city = isGenericPlaceName(place.name) ? "" : place.name;
  const region = regionAbbrev(place.admin, place.countryCode);
  if (city && region && city.toLowerCase() !== region.toLowerCase()) {
    return `${city} - ${region}`;
  }
  if (city) return city;
  if (region) return region;
  return null;
}
