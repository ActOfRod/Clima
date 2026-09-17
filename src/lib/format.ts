export function formatHour(iso: string, tz?: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(date);
}

export function formatWeekday(iso: string, tz?: string, todayIso?: string): string {
  const date = new Date(iso);
  const today = todayIso ? new Date(todayIso) : new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    timeZone: tz,
  }).format(date);
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
