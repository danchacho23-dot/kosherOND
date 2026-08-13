/**
 * Utilidades de zona horaria basadas en Intl, sin dependencias.
 *
 * Panamá no tiene horario de verano (UTC−5 todo el año), así que en la práctica
 * esto es aritmética fija. Igual lo resolvemos con Intl para que un comercio con
 * otra zona horaria no rompa el cálculo.
 */

export const DEFAULT_TIMEZONE = "America/Panama";

export interface ZonedParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** Minutos desde la medianoche local. */
  minutesOfDay: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatterCache.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatterCache.set(timeZone, cached);
  }
  return cached;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") lookup[part.type] = part.value;
  }
  const hour = Number(lookup.hour);
  const minute = Number(lookup.minute);
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour,
    minute,
    second: Number(lookup.second),
    weekday: WEEKDAY_INDEX[lookup.weekday] ?? 0,
    minutesOfDay: hour * 60 + minute,
  };
}

/** Desfase de la zona respecto de UTC, en milisegundos, en ese instante. */
export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Hora de pared local → instante UTC.
 * `minutesOfDay` puede exceder 1440 para representar horarios que cruzan la
 * medianoche (ej. cierra a las 01:00 del día siguiente).
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  minutesOfDay: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, 0, minutesOfDay);
  const firstOffset = timeZoneOffsetMs(new Date(guess), timeZone);
  let timestamp = guess - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(timestamp), timeZone);
  if (secondOffset !== firstOffset) {
    timestamp = guess - secondOffset;
  }
  return new Date(timestamp);
}

/** Medianoche local del día que contiene `date`. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
  const p = getZonedParts(date, timeZone);
  return zonedWallTimeToUtc(p.year, p.month, p.day, 0, timeZone);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Compara solo la fecha calendario local de dos instantes. */
export function isSameZonedDay(a: Date, b: Date, timeZone: string): boolean {
  const pa = getZonedParts(a, timeZone);
  const pb = getZonedParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Diferencia en días calendario locales (b − a). */
export function zonedDayDifference(a: Date, b: Date, timeZone: string): number {
  const startA = startOfZonedDay(a, timeZone).getTime();
  const startB = startOfZonedDay(b, timeZone).getTime();
  return Math.round((startB - startA) / (24 * 60 * 60 * 1000));
}

/** "18:30" en la zona del comercio. */
export function formatZonedTime(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
