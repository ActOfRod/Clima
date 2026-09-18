export function formatHour(iso: string, tz?: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(date);
}

export function calendarDate(iso: string, tz?: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function addDays(ymd: string, days: number): string {
  const next = new Date(`${ymd}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function formatWeekday(iso: string, tz?: string, todayIso?: string): string {
  const day = calendarDate(iso, tz);
  const today = calendarDate(todayIso ?? new Date().toISOString(), tz);
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

export function formatClock(iso: string, tz?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

export function placeLabel(name: string, admin?: string, country?: string): string {
  return [name, admin, country].filter(Boolean).join(", ");
}

export function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}
