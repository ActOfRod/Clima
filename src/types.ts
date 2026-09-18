export type Units = "metric" | "imperial";

export type RouteId = "home" | "local" | "radar" | "cities" | "settings";

export interface Place {
  id: string;
  name: string;
  admin?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  rainChance: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number;
  isDay: boolean;
  visibility: number | null;
  dewPoint: number | null;
  tempLow?: number;
  tempHigh?: number;
}

export interface HourPoint {
  time: string;
  temperature: number;
  apparentTemperature: number;
  rainChance: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  uvIndex: number;
  isDay: boolean;
  humidity: number;
  tempLow?: number;
  tempHigh?: number;
  agreement?: number;
}

export interface DayPoint {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitation: number;
  rainChance: number;
  windSpeedMax: number;
  summary: string;
}

export interface AirQuality {
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
}

export interface AlertItem {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  description: string;
  instruction?: string;
  ends?: string;
  source: "nws";
}

export interface ForecastSkill {
  score: number;
  label: "High" | "Moderate" | "Low";
  reason: string;
  tempSpread: number;
  rainSplit: boolean;
  sources: string[];
  rangeLow?: number;
  rangeHigh?: number;
}

export interface PersonalModel {
  tempBias: number;
  rainScale: number;
  samples: number;
  lastByPlace: Record<string, number>;
}

export interface WeatherBundle {
  place: Place;
  current: CurrentWeather;
  hourly: HourPoint[];
  daily: DayPoint[];
  air: AirQuality;
  alerts: AlertItem[];
  updatedAt: string;
  sources: string[];
  skill?: ForecastSkill;
}

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarCatalog {
  host: string;
  frames: RadarFrame[];
  nowcast: RadarFrame[];
}

export interface InsightCard {
  id: string;
  title: string;
  body: string;
  tone: "calm" | "watch" | "alert" | "good";
}

export interface ActivityScore {
  id: string;
  label: string;
  score: number;
  reason: string;
}

export interface AiBriefing {
  headline: string;
  summary: string;
  clothing: string;
  bestWindow: string | null;
  cards: InsightCard[];
  activities: ActivityScore[];
}

export interface SettingsState {
  units: Units;
  useLocation: boolean;
  animations: boolean;
}
