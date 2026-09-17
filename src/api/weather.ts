import { applyConsensus } from "../lib/consensus";
import type { Place, WeatherBundle } from "../types";
import { fetchEnsemble, fetchPeerModel } from "./ensemble";
import { fetchNwsAlerts } from "./nws";
import { fetchAirQuality, fetchForecast } from "./openMeteo";

export async function loadWeather(place: Place): Promise<WeatherBundle> {
  const [forecast, air, alerts, ensemble, peer] = await Promise.all([
    fetchForecast(place),
    fetchAirQuality(place),
    fetchNwsAlerts(place),
    fetchEnsemble(place).catch(() => []),
    fetchPeerModel(place).catch(() => []),
  ]);
  const sources = ["Open-Meteo"];
  if (alerts.length) sources.push("NWS");
  const bundle: WeatherBundle = {
    place: { ...place, timezone: forecast.timezone ?? place.timezone },
    current: forecast.current,
    hourly: forecast.hourly,
    daily: forecast.daily,
    air,
    alerts,
    updatedAt: new Date().toISOString(),
    sources,
  };
  if (!ensemble.length && !peer.length) return bundle;
  return applyConsensus(bundle, ensemble, peer, bundle.place);
}
