import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "./guard";

/**
 * Log de acciones de admin: actor, timestamp, objeto, valor anterior, valor nuevo.
 *
 * Nunca bloquea la operación que lo generó. Si el log falla, la acción ya pasó;
 * lo que se pierde es la traza, y eso se ve en el monitoreo, no en la cara del
 * usuario.
 */
export async function logAdminAction(params: {
  session: AdminSession;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        actorUserId: params.session.user.id ?? null,
        actorEmail: params.session.user.email ?? "desconocido",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousValue: toJson(params.previousValue),
        newValue: toJson(params.newValue),
      },
    });
  } catch (error) {
    console.error("[audit] no se pudo registrar la acción", params.action, error);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Las fechas se serializan a ISO para que el diff sea legible en el panel.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Diff de dos objetos planos, quedándose solo con lo que cambió.
 * Evita llenar la auditoría con el registro completo en cada edición.
 */
export function diffRecords<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { previous: Record<string, unknown>; next: Record<string, unknown> } | null {
  const previous: Record<string, unknown> = {};
  const next: Record<string, unknown> = {};
  let changed = false;

  for (const key of Object.keys(after)) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)) {
      continue;
    }
    previous[key] = beforeValue ?? null;
    next[key] = afterValue ?? null;
    changed = true;
  }

  return changed ? { previous, next } : null;
}
