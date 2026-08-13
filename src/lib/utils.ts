import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza texto para búsqueda: minúsculas, sin acentos, espacios colapsados.
 * Se aplica tanto al indexar (`Merchant.searchText`) como a la consulta, de modo
 * que no dependemos de la extensión `unaccent` de Postgres.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Identificador público no secuencial. 12 caracteres del alfabeto Crockford
 * (sin I, L, O, U) para que se pueda dictar por teléfono sin ambigüedad.
 */
const PUBLIC_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function publicId(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PUBLIC_ID_ALPHABET[bytes[i] % PUBLIC_ID_ALPHABET.length];
  }
  return out;
}

/** Precio en centavos → "B/. 12.50". Panamá usa el balboa a la par del dólar. */
export function formatPrice(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  return `B/. ${(cents / 100).toFixed(2)}`;
}

/**
 * Deja solo dígitos y garantiza el código de país panameño.
 * `6000-0000` → `50760000000`; un número que ya trae 507 se respeta.
 */
export function toInternationalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("507")) return digits;
  if (digits.startsWith("00507")) return digits.slice(2);
  return `507${digits}`;
}

/** `50761234567` → `+507 6123-4567` */
export function formatPhoneDisplay(raw: string): string {
  const digits = toInternationalPhone(raw);
  const local = digits.startsWith("507") ? digits.slice(3) : digits;
  if (local.length === 8) return `+507 ${local.slice(0, 4)}-${local.slice(4)}`;
  if (local.length === 7) return `+507 ${local.slice(0, 3)}-${local.slice(3)}`;
  return `+${digits}`;
}

/** Minutos desde medianoche → "18:30" (formato 24h, el que usa Panamá por escrito). */
export function minutesToLabel(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function absoluteUrl(path: string, base: string): string {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}
