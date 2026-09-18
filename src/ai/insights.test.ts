import { describe, expect, it } from "vitest";
import { generateBriefing } from "./insights";
import type { WeatherBundle } from "../types";

function bundle(over: Partial<WeatherBundle> = {}): WeatherBundle {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const hours = Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() + i * 3600_000);
    return {
      time: t.toISOString(),
      temperature: 22,
      apparentTemperature: 22,
      rainChance: 5,
      precipitation: 0,
      weatherCode: 0,
      windSpeed: 8,
      uvIndex: 4,
      isDay: true,
      humidity: 40,
    };
  });
  return {
    place: {
      id: "1",
      name: "Madrid",
      latitude: 40.4,
      longitude: -3.7,
      countryCode: "ES",
    },
    current: {
      time: now.toISOString(),
      temperature: 31,
      apparentTemperature: 30,
      humidity: 28,
      precipitation: 0,
      rainChance: 0,
      weatherCode: 0,
      cloudCover: 5,
      pressure: 1016,
      windSpeed: 0.2,
      windDirection: 180,
      windGusts: 2,
      uvIndex: 7,
      isDay: true,
      visibility: 16,
      dewPoint: 10,
    },
    hourly: hours,
    daily: [
      {
        date: now.toISOString().slice(0, 10),
        weatherCode: 0,
        tempMax: 36,
        tempMin: 22,
        sunrise: now.toISOString(),
        sunset: now.toISOString(),
        uvIndexMax: 8,
        precipitation: 0,
        rainChance: 0,
        windSpeedMax: 12,
        summary: "Sunny",
      },
      {
        date: new Date(now.getTime() + 86400_000).toISOString().slice(0, 10),
        weatherCode: 0,
        tempMax: 37,
        tempMin: 21,
        sunrise: now.toISOString(),
        sunset: now.toISOString(),
        uvIndexMax: 8,
        precipitation: 0,
        rainChance: 0,
        windSpeedMax: 12,
        summary: "Sunny",
      },
    ],
    air: {
      usAqi: 32,
      europeanAqi: 20,
      pm25: 6,
      pm10: 10,
      ozone: 40,
      no2: 8,
    },
    alerts: [],
    updatedAt: now.toISOString(),
    sources: ["Open-Meteo"],
    ...over,
  };
}

describe("generateBriefing", () => {
  it("produces a dry, high-sun briefing", () => {
    const result = generateBriefing(bundle());
    expect(result.headline.toLowerCase()).toMatch(/bright|sunny|high-sun|31/);
    expect(result.clothing.toLowerCase()).toMatch(/breathable|sun/);
    expect(result.activities).toHaveLength(4);
    expect(result.cards.some((c) => c.id === "uv" || c.id === "dry")).toBe(true);
  });

  it("flags incoming rain", () => {
    const b = bundle();
    b.hourly[2] = { ...b.hourly[2], rainChance: 80, precipitation: 1.2, weatherCode: 61 };
    const result = generateBriefing(b);
    expect(result.cards.some((c) => c.id === "rain")).toBe(true);
    expect(result.summary.toLowerCase()).toMatch(/wet|rain/);
  });

  it("calls out low model agreement", () => {
    const result = generateBriefing(
      bundle({
        skill: {
          score: 42,
          label: "Low",
          reason: "This is a messy pattern — members disagree.",
          tempSpread: 3,
          rainSplit: true,
          sources: ["GEFS"],
        },
      }),
    );
    expect(result.cards.some((c) => c.id === "skill")).toBe(true);
  });

  it("surfaces nws alerts first", () => {
    const result = generateBriefing(
      bundle({
        alerts: [
          {
            id: "a1",
            event: "Heat Advisory",
            headline: "Heat Advisory in effect",
            severity: "Moderate",
            urgency: "Expected",
            description: "Hot.",
            source: "nws",
          },
        ],
      }),
    );
    expect(result.cards[0].id).toBe("alert");
    expect(result.cards[0].title).toBe("Heat Advisory");
  });

  it("formats temperatures and wind for imperial", () => {
    const result = generateBriefing(bundle(), "imperial");
    expect(result.headline).toContain("88°");
    expect(result.summary).toContain("mph");
  });
});
