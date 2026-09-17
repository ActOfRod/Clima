import type { ForecastSkill, HourPoint, Place, WeatherBundle } from "../types";
import { isConus } from "./geo";
import { clamp, finite, mean, quantile, stdev } from "./stats";

export interface PeerHour {
  time: string;
  temperature: number | null;
  precipitation: number | null;
  rainChance: number | null;
}

export interface EnsembleHour {
  time: string;
  temps: number[];
  precips: number[];
}

export function blendRain(
  official: number,
  ensembleFrac: number,
  peer?: number | null,
): number {
  const ens = ensembleFrac * 100;
  if (peer == null || !Number.isFinite(peer)) {
    return clamp(0.55 * official + 0.45 * ens, 0, 100);
  }
  return clamp(0.35 * official + 0.35 * peer + 0.3 * ens, 0, 100);
}

export function blendTemp(
  official: number,
  peer: number | null | undefined,
  hourOffset: number,
  conus: boolean,
): number {
  if (peer == null || !Number.isFinite(peer)) return official;
  const w = conus ? (hourOffset < 6 ? 0.3 : 0.65) : 0.4;
  return official * (1 - w) + peer * w;
}

export function hourAgreement(temps: number[], precipFrac: number): number {
  const spread = stdev(temps);
  const tempScore = clamp(100 - spread * 22, 0, 100);
  const mixed = precipFrac > 0.15 && precipFrac < 0.85;
  const rainScore = mixed ? 45 : 88;
  return Math.round(0.65 * tempScore + 0.35 * rainScore);
}

export function buildSkill(
  hours: Array<{ agreement: number; tempSpread: number; precipFrac: number }>,
  sources: string[],
): ForecastSkill {
  const window = hours.slice(0, 16);
  if (!window.length) {
    return {
      score: 55,
      label: "Moderate",
      reason: "Not enough ensemble data yet — treating this as an average-confidence forecast.",
      tempSpread: 0,
      rainSplit: false,
      sources,
    };
  }
  const score = Math.round(mean(window.map((h) => h.agreement)));
  const tempSpread = mean(window.map((h) => h.tempSpread));
  const rainSplit = window.some((h) => h.precipFrac > 0.2 && h.precipFrac < 0.8);
  const label: ForecastSkill["label"] =
    score >= 75 && !rainSplit ? "High" : score >= 50 ? "Moderate" : "Low";
  let reason: string;
  if (label === "High") {
    reason =
      "Models line up for the next half-day. The number on screen is a fair bet, not a coin flip.";
  } else if (rainSplit && tempSpread >= 2) {
    reason =
      "This is a messy pattern — members disagree on both temperature and rain. Plan with a range, not a single hour.";
  } else if (rainSplit) {
    reason =
      "Rain timing is the weak spot. Some members stay dry, others do not. Keep a backup plan.";
  } else if (tempSpread >= 2.5) {
    reason = `Temperature is jumpy here (about ±${tempSpread.toFixed(1)}° across members). Expect swings, especially if fronts or terrain are nearby.`;
  } else {
    reason =
      "Models only partly agree. Useful as a guide, but don’t lock plans to a single hour.";
  }
  return { score, label, reason, tempSpread, rainSplit, sources };
}

export function applyConsensus(
  bundle: WeatherBundle,
  ensemble: EnsembleHour[],
  peer: PeerHour[],
  place: Place,
): WeatherBundle {
  const conus = isConus(place);
  const peerByTime = new Map(peer.map((p) => [p.time.slice(0, 13), p]));
  const ensByTime = new Map(ensemble.map((e) => [e.time.slice(0, 13), e]));
  const now = new Date(bundle.current.time).getTime();

  const hourMeta: Array<{
    agreement: number;
    tempSpread: number;
    precipFrac: number;
  }> = [];

  const hourly: HourPoint[] = bundle.hourly.map((h) => {
    const key = h.time.slice(0, 13);
    const ens = ensByTime.get(key);
    const p = peerByTime.get(key);
    const hourOffset = (new Date(h.time).getTime() - now) / 3600_000;
    const temps = finite(ens?.temps ?? [h.temperature, p?.temperature]);
    const precips = finite(ens?.precips ?? [h.precipitation, p?.precipitation]);
    const precipFrac =
      precips.length > 0 ? precips.filter((x) => x >= 0.2).length / precips.length : h.rainChance / 100;
    const rainChance = blendRain(h.rainChance, precipFrac, p?.rainChance);
    const temperature = blendTemp(h.temperature, p?.temperature ?? null, hourOffset, conus);
    const spread = stdev(temps);
    hourMeta.push({
      agreement: hourAgreement(temps.length ? temps : [h.temperature], precipFrac),
      tempSpread: spread,
      precipFrac,
    });
    const p10 = temps.length ? quantile(temps, 0.1) : temperature;
    const p90 = temps.length ? quantile(temps, 0.9) : temperature;
    return {
      ...h,
      temperature,
      rainChance,
      tempLow: p10,
      tempHigh: p90,
      agreement: hourMeta[hourMeta.length - 1].agreement,
    };
  });

  const currentKey = bundle.current.time.slice(0, 13);
  const currentHour =
    hourly.find((h) => h.time.slice(0, 13) === currentKey) ?? hourly[0];
  const current = {
    ...bundle.current,
    rainChance: currentHour?.rainChance ?? bundle.current.rainChance,
    temperature: currentHour?.temperature ?? bundle.current.temperature,
    tempLow: currentHour?.tempLow,
    tempHigh: currentHour?.tempHigh,
  };

  const extra = [
    ...bundle.sources,
    "GEFS ensemble",
    conus ? "NCEP NBM" : "ECMWF IFS",
  ].filter((s, i, a) => a.indexOf(s) === i);

  const skill = buildSkill(hourMeta, extra);
  const next = hourly.slice(0, 12);
  const rangeLow = next.length ? Math.min(...next.map((h) => h.tempLow ?? h.temperature)) : current.temperature;
  const rangeHigh = next.length ? Math.max(...next.map((h) => h.tempHigh ?? h.temperature)) : current.temperature;

  return {
    ...bundle,
    current,
    hourly,
    skill: {
      ...skill,
      rangeLow,
      rangeHigh,
    },
    sources: extra,
  };
}
