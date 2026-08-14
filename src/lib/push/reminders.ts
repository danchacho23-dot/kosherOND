import { copy } from "@/lib/copy";
import { formatZonedTime, getZonedParts, DEFAULT_TIMEZONE } from "@/lib/hours/timezone";
import type { ReligiousClosure } from "@/lib/hours/hebrew-calendar";

/**
 * Aviso antes del cierre por Shabat o jag.
 *
 * Es la única función del producto que solo puede dar una app instalada: un
 * sitio web no puede avisarte de nada cuando está cerrado. Reusa el mismo
 * calendario que calcula el estado abierto/cerrado, así que el aviso y lo que
 * muestra la ficha del comercio nunca se contradicen.
 */

export const MIN_LEAD_MINUTES = 30;
export const MAX_LEAD_MINUTES = 24 * 60;
export const DEFAULT_LEAD_MINUTES = 120;

const MINUTE_MS = 60 * 1000;

export interface ReminderPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/**
 * ¿Corresponde avisar ahora?
 *
 * La ventana va desde `encendido de velas − lead` hasta el encendido. Pasado
 * ese punto no se avisa: llegar tarde con este aviso es peor que no mandarlo.
 */
export function isWithinLeadWindow(
  candleLighting: Date,
  now: Date,
  leadMinutes: number,
): boolean {
  const start = candleLighting.getTime() - leadMinutes * MINUTE_MS;
  const end = candleLighting.getTime();
  const at = now.getTime();
  return at >= start && at < end;
}

/** Ya se avisó de este cierre si la última marca es igual o posterior al encendido. */
export function alreadyNotified(
  lastNotifiedFor: Date | null | undefined,
  candleLighting: Date,
): boolean {
  if (!lastNotifiedFor) return false;
  return lastNotifiedFor.getTime() >= candleLighting.getTime();
}

/** Minutos que faltan para el encendido, redondeados hacia abajo. */
export function minutesUntil(candleLighting: Date, now: Date): number {
  return Math.floor((candleLighting.getTime() - now.getTime()) / MINUTE_MS);
}

export function normalizeLeadMinutes(value: unknown): number {
  // `Number(null)` y `Number("")` dan 0, que es finito: sin este chequeo un
  // valor ausente se acotaría al mínimo en vez de caer al valor por defecto.
  if (value === null || value === undefined || value === "") return DEFAULT_LEAD_MINUTES;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LEAD_MINUTES;
  return Math.min(MAX_LEAD_MINUTES, Math.max(MIN_LEAD_MINUTES, Math.round(parsed)));
}

/** "en 2 horas" / "en 45 minutos" / "en 1 hora y 30 minutos" */
export function describeLead(minutes: number): string {
  if (minutes < 60) return `en ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursLabel = hours === 1 ? "1 hora" : `${hours} horas`;
  if (rest === 0) return `en ${hoursLabel}`;
  return `en ${hoursLabel} y ${rest} minutos`;
}

export function buildReminder(
  closure: ReligiousClosure,
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): ReminderPayload {
  const time = formatZonedTime(closure.candleLighting, timeZone);
  const remaining = describeLead(minutesUntil(closure.candleLighting, now));

  // El mismo día calendario que el aviso → "hoy"; si no, el día de la semana.
  const nowParts = getZonedParts(now, timeZone);
  const closureParts = getZonedParts(closure.candleLighting, timeZone);
  const sameDay =
    nowParts.year === closureParts.year &&
    nowParts.month === closureParts.month &&
    nowParts.day === closureParts.day;
  const whenLabel = sameDay
    ? "hoy"
    : `el ${copy.hours.days[closureParts.weekday].toLowerCase()}`;

  const title = closure.holidayName
    ? `${closure.holidayName} empieza ${whenLabel} a las ${time}`
    : `Shabat empieza ${whenLabel} a las ${time}`;

  return {
    title,
    body: `Los comercios cierran antes. Mirá quién sigue abierto — quedan ${remaining.replace("en ", "")}.`,
    url: "/directorio?abierto=1",
    // Un aviso por cierre: si llega dos veces, el navegador reemplaza el anterior.
    tag: `cierre-${closure.candleLighting.toISOString()}`,
  };
}
