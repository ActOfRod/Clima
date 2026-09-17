import type { Place, WeatherBundle } from "../types";
import { fetchAirQuality, fetchForecast } from "./openMeteo";
import { fetchNwsAlerts } from "./nws";

export async function loadWeather(place: Place): Promise<WeatherBundle> {
  const [forecast, air, alerts] = await Promise.all([
    fetchForecast(place),
    fetchAirQuality(place),
    fetchNwsAlerts(place),
  ]);
  const sources = ["Open-Meteo"];
  if (alerts.length) sources.push("NWS");
  return {
    place: { ...place, timezone: forecast.timezone ?? place.timezone },
    current: forecast.current,
    hourly: forecast.hourly,
    daily: forecast.daily,
    air,
    alerts,
    updatedAt: new Date().toISOString(),
    sources,
  };
}
