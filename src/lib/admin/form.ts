import type { ZodError } from "zod";

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export const idleState: ActionState = { ok: false };

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function bool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function list(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function optionalNumber(formData: FormData, key: string): number | null {
  const value = text(formData, key).trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** JSON embebido en un input hidden (horarios, listas de productos). */
export function json<T>(formData: FormData, key: string, fallback: T): T {
  const raw = text(formData, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function toFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

export function failure(message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors };
}

export function success(message: string): ActionState {
  return { ok: true, message };
}

/** Fecha `YYYY-MM-DD` de un input date → instante en hora de Panamá. */
export function panamaDate(value: string, endOfDay = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  // Panamá es UTC−5 fijo, sin horario de verano.
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return new Date(`${year}-${month}-${day}T${time}-05:00`);
}
