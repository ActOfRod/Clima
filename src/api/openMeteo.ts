import type { AirQuality, CurrentWeather, DayPoint, HourPoint, Place } from "../types";
import { calendarDate } from "../lib/format";
import { weatherLook } from "../lib/weatherCodes";
import { getJson } from "./client";

interface ForecastResponse {
  timezone?: string;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    uv_index?: number;
    is_day: number;
    visibility?: number;
    dew_point_2m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (number | null)[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    uv_index: (number | null)[];
    is_day: number[];
    relative_humidity_2m: number[];
    visibility?: (number | null)[];
    dew_point_2m?: (number | null)[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
    precipitation_sum: number[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
  };
}

interface AirResponse {
  current?: {
    us_aqi?: number | null;
    european_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    ozone?: number | null;
    nitrogen_dioxide?: number | null;
  };
}

const CURRENT =
  "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day,visibility,dew_point_2m";
const HOURLY =
  "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,is_day,relative_humidity_2m,visibility,dew_point_2m";
const DAILY =
  "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max";

export async function fetchForecast(place: Place): Promise<{
  current: CurrentWeather;
  hourly: HourPoint[];
  daily: DayPoint[];
  timezone?: string;
}> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: CURRENT,
    hourly: HOURLY,
    daily: DAILY,
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });
  const data = await getJson<ForecastResponse>(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  if (!data.current || !data.hourly || !data.daily) {
    throw new Error("Incomplete forecast payload");
  }

  const now = new Date(data.current.time).getTime();
  const rainChanceNow = nearestHourValue(
    data.hourly.time,
    data.hourly.precipitation_probability,
    data.current.time,
  );

  const current: CurrentWeather = {
    time: data.current.time,
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    rainChance: rainChanceNow ?? 0,
    weatherCode: data.current.weather_code,
    cloudCover: data.current.cloud_cover,
    pressure: data.current.pressure_msl,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    windGusts: data.current.wind_gusts_10m,
    uvIndex: data.current.uv_index ?? 0,
    isDay: data.current.is_day === 1,
    visibility:
      data.current.visibility != null ? data.current.visibility / 1000 : null,
    dewPoint: data.current.dew_point_2m ?? null,
  };

  const hourly: HourPoint[] = data.hourly.time
    .map((time, i) => ({
      time,
      temperature: data.hourly!.temperature_2m[i],
      apparentTemperature: data.hourly!.apparent_temperature[i],
      rainChance: data.hourly!.precipitation_probability[i] ?? 0,
      precipitation: data.hourly!.precipitation[i],
      weatherCode: data.hourly!.weather_code[i],
      windSpeed: data.hourly!.wind_speed_10m[i],
      uvIndex: data.hourly!.uv_index[i] ?? 0,
      isDay: data.hourly!.is_day[i] === 1,
      humidity: data.hourly!.relative_humidity_2m[i],
    }))
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 48);

  const today = calendarDate(data.current.time, data.timezone);
  const daily: DayPoint[] = data.daily.time
    .map((date, i) => ({
      date,
      weatherCode: data.daily!.weather_code[i],
      tempMax: data.daily!.temperature_2m_max[i],
      tempMin: data.daily!.temperature_2m_min[i],
      sunrise: data.daily!.sunrise[i],
      sunset: data.daily!.sunset[i],
      uvIndexMax: data.daily!.uv_index_max[i] ?? 0,
      precipitation: data.daily!.precipitation_sum[i],
      rainChance: data.daily!.precipitation_probability_max[i] ?? 0,
      windSpeedMax: data.daily!.wind_speed_10m_max[i],
      summary: weatherLook(data.daily!.weather_code[i]).label,
    }))
    .filter((d) => calendarDate(d.date, data.timezone) >= today)
    .slice(0, 7);

  return { current, hourly, daily, timezone: data.timezone };
}

export async function fetchAirQuality(place: Place): Promise<AirQuality> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
    timezone: "auto",
  });
  try {
    const data = await getJson<AirResponse>(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
    );
    return {
      usAqi: data.current?.us_aqi ?? null,
      europeanAqi: data.current?.european_aqi ?? null,
      pm25: data.current?.pm2_5 ?? null,
      pm10: data.current?.pm10 ?? null,
      ozone: data.current?.ozone ?? null,
      no2: data.current?.nitrogen_dioxide ?? null,
    };
  } catch {
    return {
      usAqi: null,
      europeanAqi: null,
      pm25: null,
      pm10: null,
      ozone: null,
      no2: null,
    };
  }
}

function nearestHourValue(
  times: string[],
  values: (number | null)[],
  currentTime: string,
): number | null {
  const target = new Date(currentTime).getTime();
  let best: number | null = null;
  let bestDelta = Infinity;
  times.forEach((t, i) => {
    const delta = Math.abs(new Date(t).getTime() - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = values[i];
    }
  });
  return best;
}
