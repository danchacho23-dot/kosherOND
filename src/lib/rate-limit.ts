import { createHash } from "node:crypto";

/**
 * Rate limiting en memoria. Alcanza para el volumen del MVP.
 *
 * En serverless el estado es por instancia, así que esto frena el abuso obvio
 * (un script pegándole al mismo endpoint) pero no es una garantía dura. El
 * formulario público suma además un límite persistido en base — ver
 * `checkApplicationRateLimit`.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) pruneExpired(now);
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Si tras la limpieza sigue lleno, se descarta lo más viejo por inserción.
  if (buckets.size >= MAX_BUCKETS) {
    const excess = buckets.size - Math.floor(MAX_BUCKETS / 2);
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= excess) break;
    }
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Identificador opaco y estable del cliente, para rate limiting.
 * Es un hash con sal: no guardamos la IP y no se puede revertir.
 */
export function hashClient(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "desconocido";
  const userAgent = headers.get("user-agent") ?? "";
  const salt = process.env.AUTH_SECRET ?? "kosherondemand";
  return createHash("sha256").update(`${salt}:${ip}:${userAgent}`).digest("hex").slice(0, 32);
}
