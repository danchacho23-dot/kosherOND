import { copy } from "@/lib/copy";
import { minutesToLabel } from "@/lib/utils";
import { getReligiousClosures, type ReligiousClosure } from "./hebrew-calendar";
import {
  DEFAULT_TIMEZONE,
  addDays,
  formatZonedTime,
  getZonedParts,
  startOfZonedDay,
  zonedDayDifference,
  zonedWallTimeToUtc,
} from "./timezone";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Cuántos días hacia adelante buscamos la próxima apertura. */
const DEFAULT_HORIZON_DAYS = 14;

export interface WeeklyRange {
  /** 0 = domingo … 6 = sábado */
  dayOfWeek: number;
  /** Minutos desde medianoche local. */
  opensAt: number;
  /** Minutos desde medianoche local. Si es ≤ opensAt, cruza la medianoche. */
  closesAt: number;
}

export interface ManualClosure {
  startsAt: Date;
  endsAt: Date;
  reason?: string | null;
}

export interface ScheduleInput {
  timezone?: string;
  weeklyHours: WeeklyRange[];
  closures?: ManualClosure[];
  observesShabbat?: boolean;
  shabbatCloseOffsetMinutes?: number;
  havdalahReopenOffsetMinutes?: number;
}

export type ClosedReason =
  | "OUTSIDE_HOURS"
  | "SHABBAT"
  | "HOLIDAY"
  | "MANUAL_CLOSURE"
  | "NO_SCHEDULE";

export interface OpenState {
  isOpen: boolean;
  /** Instante en que cierra, si está abierto. */
  closesAt: Date | null;
  /** Próxima apertura, si está cerrado. `null` si no abre dentro del horizonte. */
  opensAt: Date | null;
  /** Motivo del cierre. `null` si está abierto. */
  closedReason: ClosedReason | null;
  /** Nombre del jag o razón del cierre puntual, para mostrar. */
  closedLabel: string | null;
  /** Frase lista para pantalla: "Cierra a las 18:00" / "Reabre mañana a las 08:00". */
  statusLabel: string;
  /** Frase corta para chips y listados. */
  shortLabel: string;
}

interface Interval {
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Aritmética de intervalos
// ---------------------------------------------------------------------------

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  if (cuts.length === 0) return base;
  let result = base;
  for (const cut of cuts) {
    const next: Interval[] = [];
    for (const interval of result) {
      if (cut.end <= interval.start || cut.start >= interval.end) {
        next.push(interval);
        continue;
      }
      if (cut.start > interval.start) {
        next.push({ start: interval.start, end: cut.start });
      }
      if (cut.end < interval.end) {
        next.push({ start: cut.end, end: interval.end });
      }
    }
    result = next;
  }
  return result;
}

function contains(intervals: Interval[], at: number): Interval | null {
  for (const interval of intervals) {
    if (at >= interval.start && at < interval.end) return interval;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Grilla de días locales (compartida entre comercios de la misma zona)
// ---------------------------------------------------------------------------

interface LocalDay {
  startMs: number;
  weekday: number;
}

const dayGridCache = new Map<string, LocalDay[]>();
const MAX_GRID_CACHE = 32;

function buildDayGrid(from: Date, days: number, timeZone: string): LocalDay[] {
  const firstDay = startOfZonedDay(from, timeZone);
  const key = `${timeZone}:${firstDay.getTime()}:${days}`;
  const cached = dayGridCache.get(key);
  if (cached) return cached;

  const grid: LocalDay[] = [];
  for (let offset = 0; offset < days; offset++) {
    // Se reconstruye desde las partes locales en lugar de sumar 24h, para no
    // arrastrar el error en zonas con horario de verano.
    const approximate = new Date(firstDay.getTime() + offset * DAY_MS + 12 * 60 * MINUTE_MS);
    const parts = getZonedParts(approximate, timeZone);
    const startMs = zonedWallTimeToUtc(
      parts.year,
      parts.month,
      parts.day,
      0,
      timeZone,
    ).getTime();
    grid.push({ startMs, weekday: parts.weekday });
  }

  if (dayGridCache.size >= MAX_GRID_CACHE) {
    const oldest = dayGridCache.keys().next().value;
    if (oldest) dayGridCache.delete(oldest);
  }
  dayGridCache.set(key, grid);
  return grid;
}

export function clearScheduleCaches(): void {
  dayGridCache.clear();
}

// ---------------------------------------------------------------------------
// Cierres religiosos con los offsets del comercio aplicados
// ---------------------------------------------------------------------------

interface AppliedClosure extends Interval {
  source: ReligiousClosure;
}

function religiousCuts(
  from: Date,
  to: Date,
  closeOffsetMinutes: number,
  reopenOffsetMinutes: number,
): AppliedClosure[] {
  return getReligiousClosures(from, to).map((closure) => ({
    start: closure.candleLighting.getTime() - closeOffsetMinutes * MINUTE_MS,
    end: closure.havdalah.getTime() + reopenOffsetMinutes * MINUTE_MS,
    source: closure,
  }));
}

// ---------------------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------------------

export function computeOpenState(
  input: ScheduleInput,
  now: Date = new Date(),
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): OpenState {
  const timeZone = input.timezone || DEFAULT_TIMEZONE;
  const nowMs = now.getTime();

  if (input.weeklyHours.length === 0) {
    return {
      isOpen: false,
      closesAt: null,
      opensAt: null,
      closedReason: "NO_SCHEDULE",
      closedLabel: null,
      statusLabel: copy.hours.noSchedule,
      shortLabel: copy.hours.closedNow,
    };
  }

  // Se arranca un día antes para capturar turnos que cruzan la medianoche.
  const windowStart = addDays(now, -1);
  const windowEnd = addDays(now, horizonDays);
  const grid = buildDayGrid(windowStart, horizonDays + 2, timeZone);

  const weeklyIntervals: Interval[] = [];
  for (const day of grid) {
    for (const range of input.weeklyHours) {
      if (range.dayOfWeek !== day.weekday) continue;
      const closesAt =
        range.closesAt <= range.opensAt ? range.closesAt + 1440 : range.closesAt;
      weeklyIntervals.push({
        start: day.startMs + range.opensAt * MINUTE_MS,
        end: day.startMs + closesAt * MINUTE_MS,
      });
    }
  }

  const openIntervals = mergeIntervals(weeklyIntervals);

  const religious = (input.observesShabbat ?? true)
    ? religiousCuts(
        windowStart,
        windowEnd,
        input.shabbatCloseOffsetMinutes ?? 90,
        input.havdalahReopenOffsetMinutes ?? 60,
      )
    : [];

  const manual: Array<Interval & { reason?: string | null }> = (input.closures ?? []).map(
    (closure) => ({
      start: closure.startsAt.getTime(),
      end: closure.endsAt.getTime(),
      reason: closure.reason,
    }),
  );

  const effective = subtractIntervals(openIntervals, [...religious, ...manual]);

  const current = contains(effective, nowMs);
  if (current) {
    const closesAt = new Date(current.end);
    return {
      isOpen: true,
      closesAt,
      opensAt: null,
      closedReason: null,
      closedLabel: null,
      statusLabel: copy.hours.closesAt(formatZonedTime(closesAt, timeZone)),
      shortLabel: copy.hours.openNow,
    };
  }

  const upcoming = effective
    .filter((interval) => interval.start > nowMs)
    .sort((a, b) => a.start - b.start)[0];
  const opensAt = upcoming ? new Date(upcoming.start) : null;

  const activeReligious = religious.find(
    (cut) => nowMs >= cut.start && nowMs < cut.end,
  );
  const activeManual = manual.find((cut) => nowMs >= cut.start && nowMs < cut.end);

  let closedReason: ClosedReason = "OUTSIDE_HOURS";
  let closedLabel: string | null = null;
  let shortLabel: string = copy.hours.closedNow;

  if (activeReligious) {
    const holiday = activeReligious.source.holidayName;
    closedReason = holiday ? "HOLIDAY" : "SHABBAT";
    closedLabel = activeReligious.source.label;
    shortLabel = holiday
      ? copy.hours.closedForHoliday(holiday)
      : copy.hours.closedForShabbat;
  } else if (activeManual) {
    closedReason = "MANUAL_CLOSURE";
    closedLabel = activeManual.reason ?? null;
    shortLabel = copy.hours.closedTemporarily;
  }

  const statusLabel = opensAt
    ? copy.hours.reopens(describeInstant(opensAt, now, timeZone))
    : shortLabel;

  return {
    isOpen: false,
    closesAt: null,
    opensAt,
    closedReason,
    closedLabel,
    statusLabel,
    shortLabel,
  };
}

/**
 * "hoy a las 16:00" / "mañana a las 08:00" / "el lunes a las 08:00" /
 * "el 12 de septiembre a las 08:00"
 */
export function describeInstant(
  target: Date,
  reference: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const time = formatZonedTime(target, timeZone);
  const dayDiff = zonedDayDifference(reference, target, timeZone);

  if (dayDiff === 0) return `hoy a las ${time}`;
  if (dayDiff === 1) return `mañana a las ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const parts = getZonedParts(target, timeZone);
    return `el ${copy.hours.days[parts.weekday].toLowerCase()} a las ${time}`;
  }
  const parts = getZonedParts(target, timeZone);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `el ${parts.day} de ${months[parts.month - 1]} a las ${time}`;
}

// ---------------------------------------------------------------------------
// Horario para mostrar en la página del comercio
// ---------------------------------------------------------------------------

export interface DaySchedule {
  dayOfWeek: number;
  dayLabel: string;
  ranges: Array<{ opensAt: string; closesAt: string }>;
  isToday: boolean;
  isClosed: boolean;
}

export function buildWeeklySchedule(
  weeklyHours: WeeklyRange[],
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): DaySchedule[] {
  const todayWeekday = getZonedParts(now, timeZone).weekday;
  const days: DaySchedule[] = [];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const ranges = weeklyHours
      .filter((range) => range.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.opensAt - b.opensAt)
      .map((range) => ({
        opensAt: minutesToLabel(range.opensAt),
        closesAt: minutesToLabel(range.closesAt),
      }));

    days.push({
      dayOfWeek,
      dayLabel: copy.hours.days[dayOfWeek],
      ranges,
      isToday: dayOfWeek === todayWeekday,
      isClosed: ranges.length === 0,
    });
  }

  // La semana se muestra empezando por hoy: es lo que el cliente quiere saber.
  return [...days.slice(todayWeekday), ...days.slice(0, todayWeekday)];
}

/** Próximo cierre religioso, para avisar en la página del comercio. */
export function nextReligiousClosure(
  now: Date = new Date(),
  closeOffsetMinutes = 90,
  reopenOffsetMinutes = 60,
): { start: Date; end: Date; label: string } | null {
  const cuts = religiousCuts(now, addDays(now, 10), closeOffsetMinutes, reopenOffsetMinutes);
  const nowMs = now.getTime();
  const next = cuts
    .filter((cut) => cut.end > nowMs)
    .sort((a, b) => a.start - b.start)[0];
  if (!next) return null;
  return {
    start: new Date(next.start),
    end: new Date(next.end),
    label: next.source.label,
  };
}
