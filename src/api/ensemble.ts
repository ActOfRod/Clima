import type { Place } from "../types";
import { isConus } from "../lib/geo";
import { finite } from "../lib/stats";
import type { EnsembleHour, PeerHour } from "../lib/consensus";
import { getJson } from "./client";

interface HourlyMap {
  time: string[];
  [key: string]: Array<number | null | string>;
}

interface ModelResponse {
  hourly?: HourlyMap;
}

function memberSeries(hourly: HourlyMap, prefix: string): number[][] {
  const series: number[][] = [];
  const control = hourly[prefix];
  if (Array.isArray(control) && typeof control[0] !== "string") {
    series.push(control as Array<number | null> as number[]);
  }
  for (let i = 1; i <= 40; i++) {
    const key = `${prefix}_member${String(i).padStart(2, "0")}`;
    const row = hourly[key];
    if (!row) break;
    series.push(row as Array<number | null> as number[]);
  }
  return series;
}

export async function fetchEnsemble(place: Place): Promise<EnsembleHour[]> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    hourly: "temperature_2m,precipitation",
    forecast_days: "2",
    timezone: "auto",
    models: "gfs_seamless",
  });
  const data = await getJson<ModelResponse>(
    `https://ensemble-api.open-meteo.com/v1/ensemble?${params}`,
  );
  const hourly = data.hourly;
  if (!hourly?.time) return [];
  const temps = memberSeries(hourly, "temperature_2m");
  const precips = memberSeries(hourly, "precipitation");
  return hourly.time.map((time, i) => ({
    time,
    temps: finite(temps.map((s) => s[i])),
    precips: finite(precips.map((s) => s[i])),
  }));
}

export async function fetchPeerModel(place: Place): Promise<PeerHour[]> {
  const model = isConus(place) ? "ncep_nbm_conus" : "ecmwf_ifs025";
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    hourly: "temperature_2m,precipitation,precipitation_probability",
    forecast_days: "2",
    timezone: "auto",
    models: model,
    wind_speed_unit: "kmh",
  });
  const data = await getJson<ModelResponse>(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  const hourly = data.hourly;
  if (!hourly?.time) return [];
  const temp = hourly.temperature_2m as Array<number | null> | undefined;
  const precip = hourly.precipitation as Array<number | null> | undefined;
  const pop = hourly.precipitation_probability as Array<number | null> | undefined;
  return hourly.time.map((time, i) => ({
    time,
    temperature: typeof temp?.[i] === "number" ? (temp[i] as number) : null,
    precipitation: typeof precip?.[i] === "number" ? (precip[i] as number) : null,
    rainChance: typeof pop?.[i] === "number" ? (pop[i] as number) : null,
  }));
}
