import {
  LOCAL_MODEL_VERSION,
  applyLocalModel,
  summarizeLocalModel,
  trainLocalModel,
  type PlaceForecast,
  type TrainedLocalModel,
} from "../lib/localModel";
import { readJson, writeJson } from "../lib/storage";
import type { LocalModelInfo, Place, SkillSnapshot, WeatherBundle, WeatherStation } from "../types";
import { fetchModelHistory, fetchPlaceForecast, modelsFor } from "./modelHistory";
import { fetchObservations, findStation } from "./observations";

const TRAIN_DAYS = 60;
const RETRAIN_MS = 3 * 60 * 60 * 1000;
const STATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const NO_STATION_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_HISTORY = 60;
const FAILURE_BACKOFF_MS = 30 * 60 * 1000;

export interface LocalLearning {
  placeId: string;
  model: TrainedLocalModel | null;
  forecast: PlaceForecast | null;
  info: LocalModelInfo;
}

interface StationCache {
  station: WeatherStation | null;
  at: number;
}

function placeKey(place: Place): string {
  return `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
}

async function cachedStation(place: Place, key: string): Promise<WeatherStation | null> {
  const cached = readJson<StationCache | null>(`local-station:${key}`, null);
  const ttl = cached?.station ? STATION_TTL_MS : NO_STATION_TTL_MS;
  if (cached && Date.now() - cached.at < ttl) return cached.station;
  const station = await findStation(place);
  writeJson<StationCache>(`local-station:${key}`, { station, at: Date.now() });
  return station;
}

function readModel(key: string, station: WeatherStation): TrainedLocalModel | null {
  const model = readJson<TrainedLocalModel | null>(`local-model:${key}`, null);
  if (!model || model.version !== LOCAL_MODEL_VERSION || model.station.id !== station.id) {
    return null;
  }
  return model;
}

function recordSkill(key: string, model: TrainedLocalModel): SkillSnapshot[] {
  const history = readJson<SkillSnapshot[]>(`local-skill:${key}`, []);
  const lead0 = model.temp[0];
  if (!lead0) return history;
  const next = [...history, { t: model.trainedAt, mae: lead0.mae, base: lead0.baseMae }].slice(
    -MAX_HISTORY,
  );
  writeJson(`local-skill:${key}`, next);
  return next;
}

function emptyInfo(status: LocalModelInfo["status"], history: SkillSnapshot[]): LocalModelInfo {
  return { status, samples: 0, trust: [], history };
}

const inflight = new Map<string, Promise<LocalLearning>>();

/**
 * Train (or reuse) the on-device model for this place. Retrains at most every
 * few hours on a rolling window, so it tracks the season and keeps improving as
 * new observations arrive. Concurrent calls for the same place share one run,
 * because the IEM archive throttles to one request per second per IP.
 */
export function loadLocalLearning(place: Place): Promise<LocalLearning> {
  const key = `${place.id}|${placeKey(place)}`;
  const running = inflight.get(key);
  if (running) return running;
  const run = learn(place).finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

async function learn(place: Place): Promise<LocalLearning> {
  const key = placeKey(place);
  const models = modelsFor(place);
  const forecastPromise = fetchPlaceForecast(place, models).catch(() => null);
  const history = readJson<SkillSnapshot[]>(`local-skill:${key}`, []);

  let station: WeatherStation | null;
  try {
    station = await cachedStation(place, key);
  } catch {
    return {
      placeId: place.id,
      model: null,
      forecast: await forecastPromise,
      info: emptyInfo("unavailable", history),
    };
  }
  if (!station) {
    return {
      placeId: place.id,
      model: null,
      forecast: await forecastPromise,
      info: emptyInfo("no-station", history),
    };
  }

  const cached = readModel(key, station);
  const fresh = cached && Date.now() - Date.parse(cached.trainedAt) < RETRAIN_MS;
  const lastFailure = readJson<number>(`local-fail:${key}`, 0);
  const backingOff = Date.now() - lastFailure < FAILURE_BACKOFF_MS;
  let model = fresh || backingOff ? cached : null;
  let skill = history;
  if (!model && !backingOff) {
    try {
      const [past, obs] = await Promise.all([
        fetchModelHistory(station.latitude, station.longitude, models, TRAIN_DAYS),
        fetchObservations(station, TRAIN_DAYS),
      ]);
      model = trainLocalModel(past, obs, station);
      writeJson(`local-model:${key}`, model);
      skill = recordSkill(key, model);
    } catch {
      writeJson(`local-fail:${key}`, Date.now());
      model = cached;
    }
  }

  return {
    placeId: place.id,
    model,
    forecast: await forecastPromise,
    info: model ? summarizeLocalModel(model, skill) : emptyInfo("unavailable", history),
  };
}

export function withLocalLearning(bundle: WeatherBundle, learning: LocalLearning): WeatherBundle {
  if (learning.placeId !== bundle.place.id) return bundle;
  const applied =
    learning.model && learning.forecast
      ? applyLocalModel(bundle, learning.model, learning.forecast)
      : bundle;
  return { ...applied, local: learning.info };
}
