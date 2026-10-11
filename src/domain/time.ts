import type { DateKey, LocalDateTime } from "./types.js";

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalDateTime(d: Date): LocalDateTime {
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" as local time. */
export function parseLocal(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function atHour(date: DateKey, hour: number): LocalDateTime {
  return `${date}T${pad(hour)}:00`;
}

export function addHours(value: LocalDateTime, hours: number): LocalDateTime {
  const d = parseLocal(value);
  d.setHours(d.getHours() + hours);
  return toLocalDateTime(d);
}

export function addDays(date: DateKey, days: number): DateKey {
  const d = parseLocal(date);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function hourOf(value: LocalDateTime): number {
  return parseLocal(value).getHours();
}

export function dateOf(value: LocalDateTime): DateKey {
  return value.slice(0, 10);
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = parseLocal(b).getTime() - parseLocal(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function overlaps(aStart: LocalDateTime, aEnd: LocalDateTime, bStart: LocalDateTime, bEnd: LocalDateTime): boolean {
  // Same fixed-width format, so string comparison is chronological.
  return aStart < bEnd && bStart < aEnd;
}

export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatTimeRange(start: LocalDateTime, end: LocalDateTime): string {
  return `${formatHour(hourOf(start))} – ${formatHour(hourOf(end))}`;
}

export function formatDate(date: DateKey, style: "long" | "short" = "long"): string {
  return parseLocal(date).toLocaleDateString(undefined,
    style === "long"
      ? { weekday: "long", month: "long", day: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" },
  );
}

/**
 * The current wall-clock time in a given time zone, as a Date whose local
 * fields (year, month, day, hours, minutes) match that zone. Lets the server
 * (often in UTC) and every browser agree on "now" at the club.
 */
export function nowInTimeZone(timeZone: string, at: Date = new Date()): Date {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at)) {
    parts[p.type] = p.value;
  }
  return new Date(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
}
