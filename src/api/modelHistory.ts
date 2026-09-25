import { isConus } from "../lib/geo";
import { LEADS, type ModelHistory, type PlaceForecast } from "../lib/localModel";
import type { Place } from "../types";
import { getJson } from "./client";

const GLOBAL_MODELS = [
  "ecmwf_ifs025",
  "gfs_seamless",
  "icon_seamless",
  "gem_seamless",
  "ukmo_seamless",
];

export function modelsFor(place: Pick<Place, "latitude" | "longitude">): string[] {
  return isConus(place) ? [...GLOBAL_MODELS, "ncep_nbm_conus"] : GLOBAL_MODELS;
}

interface HourlyResponse {
  utc_offset_seconds?: number;
  hourly?: { time: string[] } & Record<string, Array<number | null> | string[]>;
}

function column(
  hourly: NonNullable<HourlyResponse["hourly"]>,
  variable: string,
  model: string,
  single: boolean,
): Array<number | null> {
  const values = hourly[`${variable}_${model}`] ?? (single ? hourly[variable] : undefined);
  if (!Array.isArray(values)) return hourly.time.map(() => null);
  return values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
}

function leadVar(variable: string, lead: number): string {
  return lead === 0 ? variable : `${variable}_previous_day${lead}`;
}

/** What each model forecast for the last `days` days at this point, at 0–3 day leads. */
export async function fetchModelHistory(
  latitude: number,
  longitude: number,
  models: string[],
  days: number,
): Promise<ModelHistory> {
  const vars = LEADS.flatMap((lead) => [
    leadVar("temperature_2m", lead),
    leadVar("precipitation", lead),
  ]);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: vars.join(","),
    models: models.join(","),
    past_days: String(days),
    forecast_days: "1",
    timezone: "GMT",
  });
  const data = await getJson<HourlyResponse>(
    `https://previous-runs-api.open-meteo.com/v1/forecast?${params}`,
    {},
    25_000,
  );
  const hourly = data.hourly;
  if (!hourly?.time?.length) throw new Error("Empty model history");
  const single = models.length === 1;
  return {
    times: hourly.time,
    models,
    temp: LEADS.map((lead) =>
      models.map((m) => column(hourly, leadVar("temperature_2m", lead), m, single)),
    ),
    precip: LEADS.map((lead) =>
      models.map((m) => column(hourly, leadVar("precipitation", lead), m, single)),
    ),
  };
}

/** Current 7-day hourly forecast from every model, in the place's local time. */
export async function fetchPlaceForecast(place: Place, models: string[]): Promise<PlaceForecast> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    hourly: "temperature_2m,precipitation",
    models: models.join(","),
    forecast_days: "7",
    timezone: "auto",
  });
  const data = await getJson<HourlyResponse>(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  const hourly = data.hourly;
  if (!hourly?.time?.length) throw new Error("Empty multi-model forecast");
  const single = models.length === 1;
  return {
    times: hourly.time,
    utcOffsetSeconds: data.utc_offset_seconds ?? 0,
    models,
    temp: models.map((m) => column(hourly, "temperature_2m", m, single)),
    precip: models.map((m) => column(hourly, "precipitation", m, single)),
  };
}
