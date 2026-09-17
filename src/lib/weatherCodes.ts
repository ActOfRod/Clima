export interface WeatherLook {
  label: string;
  kind:
    | "sun"
    | "partly"
    | "cloud"
    | "fog"
    | "drizzle"
    | "rain"
    | "snow"
    | "storm"
    | "night";
}

const TABLE: Record<number, WeatherLook> = {
  0: { label: "Sunny", kind: "sun" },
  1: { label: "Mainly clear", kind: "sun" },
  2: { label: "Partly cloudy", kind: "partly" },
  3: { label: "Cloudy", kind: "cloud" },
  45: { label: "Fog", kind: "fog" },
  48: { label: "Rime fog", kind: "fog" },
  51: { label: "Light drizzle", kind: "drizzle" },
  53: { label: "Drizzle", kind: "drizzle" },
  55: { label: "Heavy drizzle", kind: "drizzle" },
  56: { label: "Freezing drizzle", kind: "drizzle" },
  57: { label: "Freezing drizzle", kind: "drizzle" },
  61: { label: "Light rain", kind: "rain" },
  63: { label: "Rain", kind: "rain" },
  65: { label: "Heavy rain", kind: "rain" },
  66: { label: "Freezing rain", kind: "rain" },
  67: { label: "Freezing rain", kind: "rain" },
  71: { label: "Light snow", kind: "snow" },
  73: { label: "Snow", kind: "snow" },
  75: { label: "Heavy snow", kind: "snow" },
  77: { label: "Snow grains", kind: "snow" },
  80: { label: "Rain showers", kind: "rain" },
  81: { label: "Rain showers", kind: "rain" },
  82: { label: "Heavy showers", kind: "rain" },
  85: { label: "Snow showers", kind: "snow" },
  86: { label: "Snow showers", kind: "snow" },
  95: { label: "Storm", kind: "storm" },
  96: { label: "Storm", kind: "storm" },
  99: { label: "Severe storm", kind: "storm" },
};

export function weatherLook(code: number, isDay = true): WeatherLook {
  const look = TABLE[code] ?? { label: "Unknown", kind: "cloud" as const };
  if (!isDay && (look.kind === "sun" || look.kind === "partly")) {
    return { ...look, kind: "night", label: code === 0 ? "Clear" : look.label };
  }
  if (!isDay && code === 0) return { label: "Clear", kind: "night" };
  return look;
}

export function isWetCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}

export function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}
