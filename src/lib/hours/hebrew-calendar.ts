import {
  CandleLightingEvent,
  HavdalahEvent,
  HebrewCalendar,
  Location,
  flags,
  type Event,
} from "@hebcal/core";
import { DEFAULT_TIMEZONE, addDays } from "./timezone";

/**
 * Ventanas de cierre religioso (Shabat y jaguim) para Ciudad de Panamá.
 *
 * Un intervalo va desde el encendido de velas hasta la havdalá siguiente. Eso
 * hace que un jag de dos días, o un jag pegado a Shabat, salga como UN solo
 * intervalo continuo — que es exactamente cómo lo vive el comercio: no reabre
 * el sábado a la noche si el domingo sigue siendo Yom Tov.
 */

/** Ciudad de Panamá. Sin horario de verano. */
export const PANAMA_LOCATION = {
  latitude: 8.9824,
  longitude: -79.5199,
  timezone: DEFAULT_TIMEZONE,
  cityName: "Panama City",
  countryCode: "PA",
} as const;

export interface ReligiousClosure {
  /** Encendido de velas. */
  candleLighting: Date;
  /** Havdalá / salida del jag. */
  havdalah: Date;
  /** Nombre del jag si corresponde; null si es Shabat a secas. */
  holidayName: string | null;
  /** Nombre en español para mostrar. */
  label: string;
}

/** Nombres en español de los jaguim que implican cierre. */
const HOLIDAY_ES: Array<[RegExp, string]> = [
  [/^Rosh Hashana/i, "Rosh Hashaná"],
  [/^Yom Kippur/i, "Yom Kipur"],
  [/^Sukkot/i, "Sucot"],
  [/^Shmini Atzeret/i, "Shminí Atzeret"],
  [/^Simchat Torah/i, "Simjat Torá"],
  [/^Pesach/i, "Pésaj"],
  [/^Shavuot/i, "Shavuot"],
];

function toSpanishHolidayName(desc: string): string {
  for (const [pattern, name] of HOLIDAY_ES) {
    if (pattern.test(desc)) return name;
  }
  return desc;
}

let cachedLocation: Location | null = null;

function panamaLocation(): Location {
  if (!cachedLocation) {
    cachedLocation = new Location(
      PANAMA_LOCATION.latitude,
      PANAMA_LOCATION.longitude,
      false, // diáspora: jaguim de dos días
      PANAMA_LOCATION.timezone,
      PANAMA_LOCATION.cityName,
      PANAMA_LOCATION.countryCode,
    );
  }
  return cachedLocation;
}

/** Yom Tov mayor: los días en que el comercio no puede operar. */
function isMajorHolidayEvent(event: Event): boolean {
  const mask = event.getFlags();
  return (mask & flags.CHAG) !== 0;
}

/** Las velas de Janucá también son un evento con hora, y no cierran nada. */
function isClosureCandleLighting(event: Event): event is CandleLightingEvent {
  return (
    event instanceof CandleLightingEvent &&
    (event.getFlags() & flags.CHANUKAH_CANDLES) === 0
  );
}

/**
 * Calcula los intervalos de cierre religioso que se solapan con [from, to].
 *
 * Se consulta una ventana más ancha en ambos extremos para no cortar un
 * intervalo que empezó antes de `from` o que termina después de `to`.
 */
export function computeReligiousClosures(from: Date, to: Date): ReligiousClosure[] {
  const start = addDays(from, -4);
  const end = addDays(to, 5);

  const events = HebrewCalendar.calendar({
    start,
    end,
    location: panamaLocation(),
    candlelighting: true,
    il: false,
    sedrot: false,
    omer: false,
    noMinorFast: true,
    noSpecialShabbat: true,
  });

  const timed: Array<{ time: Date; kind: "candle" | "havdalah" }> = [];
  const majorHolidays: Array<{ time: number; name: string }> = [];

  for (const event of events) {
    if (isClosureCandleLighting(event) && event.eventTime) {
      timed.push({ time: event.eventTime, kind: "candle" });
      continue;
    }
    if (event instanceof HavdalahEvent && event.eventTime) {
      timed.push({ time: event.eventTime, kind: "havdalah" });
      continue;
    }
    if (isMajorHolidayEvent(event)) {
      majorHolidays.push({
        time: event.getDate().greg().getTime(),
        name: toSpanishHolidayName(event.getDesc()),
      });
    }
  }

  timed.sort((a, b) => a.time.getTime() - b.time.getTime());

  const closures: ReligiousClosure[] = [];
  let openCandle: Date | null = null;

  for (const entry of timed) {
    if (entry.kind === "candle") {
      // Un segundo encendido dentro de un intervalo abierto (segundo día de jag)
      // es continuación, no un intervalo nuevo.
      if (!openCandle) openCandle = entry.time;
      continue;
    }
    if (openCandle) {
      closures.push(buildClosure(openCandle, entry.time, majorHolidays));
      openCandle = null;
    }
  }

  return closures.filter(
    (closure) =>
      closure.havdalah.getTime() > from.getTime() &&
      closure.candleLighting.getTime() < to.getTime(),
  );
}

function buildClosure(
  candleLighting: Date,
  havdalah: Date,
  majorHolidays: Array<{ time: number; name: string }>,
): ReligiousClosure {
  // Un jag cuenta para este intervalo si su fecha gregoriana cae dentro.
  // Las fechas hebreas empiezan al anochecer, así que el día del encendido
  // todavía es el día anterior en el calendario gregoriano.
  const windowStart = candleLighting.getTime();
  const windowEnd = havdalah.getTime();
  const names: string[] = [];
  for (const holiday of majorHolidays) {
    // `holiday.time` es medianoche local del día del jag.
    const dayEnd = holiday.time + 24 * 60 * 60 * 1000;
    if (dayEnd > windowStart && holiday.time < windowEnd) {
      if (!names.includes(holiday.name)) names.push(holiday.name);
    }
  }
  const holidayName = names.length > 0 ? names.join(" y ") : null;
  return {
    candleLighting,
    havdalah,
    holidayName,
    label: holidayName ?? "Shabat",
  };
}

// ---------------------------------------------------------------------------
// Caché en memoria
// ---------------------------------------------------------------------------
//
// Los intervalos son idénticos para todos los comercios: dependen solo de las
// coordenadas de Panamá. Los offsets por comercio se aplican después. Cachear
// por ventana de días evita recalcular hebcal en cada request.

const DAY_MS = 24 * 60 * 60 * 1000;
const closureCache = new Map<string, ReligiousClosure[]>();
const MAX_CACHE_ENTRIES = 64;

export function getReligiousClosures(from: Date, to: Date): ReligiousClosure[] {
  const fromBucket = Math.floor(from.getTime() / DAY_MS);
  const toBucket = Math.ceil(to.getTime() / DAY_MS);
  const key = `${fromBucket}:${toBucket}`;

  const cached = closureCache.get(key);
  if (cached) return cached;

  const computed = computeReligiousClosures(
    new Date(fromBucket * DAY_MS),
    new Date(toBucket * DAY_MS),
  );

  if (closureCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = closureCache.keys().next().value;
    if (oldest) closureCache.delete(oldest);
  }
  closureCache.set(key, computed);
  return computed;
}

export function clearReligiousClosureCache(): void {
  closureCache.clear();
}
