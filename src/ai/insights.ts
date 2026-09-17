import { weatherLook, isSnowCode, isWetCode } from "../lib/weatherCodes";
import { uvLabel } from "../lib/format";
import type {
  ActivityScore,
  AiBriefing,
  HourPoint,
  InsightCard,
  WeatherBundle,
} from "../types";

export function generateBriefing(bundle: WeatherBundle): AiBriefing {
  const { current, hourly, daily, air, alerts, place } = bundle;
  const look = weatherLook(current.weatherCode, current.isDay);
  const nextHours = hourly.slice(0, 12);
  const rainSoon = nextHours.find((h) => h.rainChance >= 50 || h.precipitation >= 0.2);
  const dryHours = nextHours.filter((h) => h.rainChance < 30 && h.precipitation < 0.1);
  const best = pickBestWindow(nextHours);
  const cards: InsightCard[] = [];

  if (alerts.length) {
    cards.push({
      id: "alert",
      title: alerts[0].event,
      body: alerts[0].headline,
      tone: "alert",
    });
  }

  const skill = bundle.skill;
  if (skill && skill.label !== "High") {
    cards.push({
      id: "skill",
      title:
        skill.label === "Low" ? "Low forecast confidence" : "Models only partly agree",
      body: skill.reason,
      tone: skill.label === "Low" ? "watch" : "calm",
    });
  }

  if (rainSoon) {
    const when = new Date(rainSoon.time);
    const mins = Math.max(
      0,
      Math.round((when.getTime() - Date.now()) / 60000),
    );
    cards.push({
      id: "rain",
      title: mins <= 60 ? "Rain on the way" : "Wet stretch later",
      body:
        mins <= 60
          ? `Precipitation looks likely in about ${mins || "a few"} minutes. Plan indoor gaps or bring a shell.`
          : `Showers look most likely around ${when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} (${rainSoon.rainChance}% chance).`,
      tone: "watch",
    });
  } else if (current.rainChance < 15 && !isWetCode(current.weatherCode)) {
    cards.push({
      id: "dry",
      title: "Mostly dry window",
      body: `The next several hours stay dry in ${place.name}. Good stretch for errands and outdoor time.`,
      tone: "good",
    });
  }

  if (current.uvIndex >= 6 && current.isDay) {
    cards.push({
      id: "uv",
      title: `UV ${uvLabel(current.uvIndex)}`,
      body: `UV index is ${Math.round(current.uvIndex)}. Shade, sleeves, or SPF will matter if you are outside through midday.`,
      tone: current.uvIndex >= 8 ? "alert" : "watch",
    });
  }

  if (air.usAqi != null && air.usAqi > 100) {
    cards.push({
      id: "air",
      title: "Air quality is off",
      body: `US AQI is ${Math.round(air.usAqi)}. Sensitive groups should shorten outdoor workouts.`,
      tone: air.usAqi > 150 ? "alert" : "watch",
    });
  }

  if (Math.abs(current.apparentTemperature - current.temperature) >= 4) {
    const hotter = current.apparentTemperature > current.temperature;
    cards.push({
      id: "feel",
      title: hotter ? "Feels warmer than the number" : "Feels cooler than the number",
      body: hotter
        ? `Humidity is pushing the feel to ${Math.round(current.apparentTemperature)}° versus ${Math.round(current.temperature)}° air temp.`
        : `Wind is knocking the feel down to ${Math.round(current.apparentTemperature)}° from ${Math.round(current.temperature)}°.`,
      tone: "calm",
    });
  }

  const trend = daily[1]
    ? daily[1].tempMax - daily[0].tempMax
    : 0;
  if (Math.abs(trend) >= 4) {
    cards.push({
      id: "trend",
      title: trend > 0 ? "Warming tomorrow" : "Cooling tomorrow",
      body: `Highs swing ${Math.abs(Math.round(trend))}° ${trend > 0 ? "up" : "down"} tomorrow versus today.`,
      tone: "calm",
    });
  }

  const clothing = clothingAdvice(current, nextHours);
  const activities = scoreActivities(bundle, dryHours.length);
  const headline = buildHeadline(look.label, current, rainSoon);
  const summary = buildSummary(place.name, current, look.label, rainSoon, best);

  return {
    headline,
    summary,
    clothing,
    bestWindow: best,
    cards: cards.slice(0, 5),
    activities,
  };
}

function buildHeadline(
  label: string,
  current: WeatherBundle["current"],
  rainSoon?: HourPoint,
): string {
  if (rainSoon && rainSoon.rainChance >= 70) return "Stay flexible — rain is nearby";
  if (isSnowCode(current.weatherCode)) return "Winter pattern in play";
  if (current.weatherCode >= 95) return "Stormy setup — keep plans loose";
  if (current.isDay && current.uvIndex >= 7 && current.rainChance < 20) {
    return "Bright, high-sun day";
  }
  return `${label} and ${Math.round(current.temperature)}° right now`;
}

function buildSummary(
  city: string,
  current: WeatherBundle["current"],
  label: string,
  rainSoon: HourPoint | undefined,
  best: string | null,
): string {
  const feel = Math.round(current.apparentTemperature);
  const air = Math.round(current.temperature);
  const rainBit = rainSoon
    ? ` Expect wetter weather later (${rainSoon.rainChance}% chance).`
    : current.rainChance < 20
      ? " Rain risk stays low."
      : ` Rain chance is ${Math.round(current.rainChance)}%.`;
  const windowBit = best ? ` Best outdoor window: ${best}.` : "";
  return `${city} is ${label.toLowerCase()} with air at ${air}° that feels like ${feel}°. Wind ${Math.round(current.windSpeed)} km/h.${rainBit}${windowBit}`;
}

function clothingAdvice(
  current: WeatherBundle["current"],
  hours: HourPoint[],
): string {
  const feel = current.apparentTemperature;
  const wet = isWetCode(current.weatherCode) || hours.some((h) => h.rainChance >= 50);
  const layers: string[] = [];
  if (feel <= 0) layers.push("heavy coat, hat, and gloves");
  else if (feel <= 8) layers.push("insulated jacket and a warm base layer");
  else if (feel <= 15) layers.push("light jacket or sweater");
  else if (feel <= 22) layers.push("long sleeves you can roll");
  else if (feel <= 28) layers.push("breathable shirt and easy layers");
  else layers.push("light, breathable clothing");
  if (wet) layers.push("a waterproof shell");
  if (current.uvIndex >= 6 && current.isDay) layers.push("sun protection");
  if (isSnowCode(current.weatherCode)) layers.push("waterproof shoes");
  return `Wear ${layers.join(", ")}.`;
}

function pickBestWindow(hours: HourPoint[]): string | null {
  if (!hours.length) return null;
  let best: HourPoint | null = null;
  let bestScore = -Infinity;
  for (const h of hours) {
    let score = 70;
    score -= h.rainChance * 0.7;
    score -= h.precipitation * 20;
    if (h.weatherCode >= 95) score -= 40;
    if (h.uvIndex > 8) score -= 8;
    if (h.temperature >= 16 && h.temperature <= 26) score += 12;
    if (h.isDay) score += 6;
    if (score > bestScore) {
      bestScore = score;
      best = h;
    }
  }
  if (!best || bestScore < 35) return null;
  const start = new Date(best.time);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)}–${fmt(end)}`;
}

function scoreActivities(bundle: WeatherBundle, dryHourCount: number): ActivityScore[] {
  const { current } = bundle;
  const wetPenalty = current.rainChance * 0.6 + (isWetCode(current.weatherCode) ? 25 : 0);
  const windPenalty = Math.max(0, current.windSpeed - 25) * 1.2;
  const heat = current.apparentTemperature;
  const aqi = current && bundle.air.usAqi != null ? bundle.air.usAqi : 40;

  const run = clamp(
    88 - wetPenalty - windPenalty - (heat > 30 ? 20 : 0) - (heat < 2 ? 20 : 0) - (aqi > 100 ? 25 : 0),
  );
  const picnic = clamp(90 - wetPenalty * 1.2 - (heat > 32 ? 15 : 0) - (dryHourCount < 3 ? 15 : 0));
  const photo = clamp(
    80 -
      (current.weatherCode === 0 || current.weatherCode === 1 ? -12 : 0) -
      (current.weatherCode === 2 ? -8 : 0) -
      wetPenalty * 0.4,
  );
  const commute = clamp(92 - wetPenalty * 0.5 - (current.weatherCode >= 95 ? 30 : 0) - windPenalty * 0.4);

  return [
    reason("run", "Running", run, run > 70 ? "Comfortable for a run." : "Scale it back or keep it indoor."),
    reason("picnic", "Outdoor hang", picnic, picnic > 70 ? "Nice patio / park conditions." : "Have a backup plan."),
    reason("photo", "Photography", photo, photo > 75 ? "Interesting light and texture." : "Light is mixed."),
    reason("commute", "Commute", commute, commute > 75 ? "Straightforward travel weather." : "Leave extra time."),
  ];
}

function reason(
  id: string,
  label: string,
  score: number,
  text: string,
): ActivityScore {
  return { id, label, score, reason: text };
}

function clamp(n: number): number {
  return Math.max(5, Math.min(98, Math.round(n)));
}
