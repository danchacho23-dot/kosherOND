import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";
import type { ReminderPayload } from "./reminders";

/**
 * Envío de Web Push. Un proveedor no hace falta: el estándar habla directo con
 * el servicio de push de cada navegador, firmado con las claves VAPID.
 */

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configure(): void {
  if (configured) return;
  if (!isPushConfigured()) {
    throw new Error(
      "Web Push no configurado. Definí VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT.",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface SendSummary {
  sent: number;
  expired: number;
  failed: number;
}

interface Target {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failureCount: number;
}

/**
 * Envía a una tanda de suscripciones y limpia las que el navegador dio de baja.
 *
 * 404 y 410 significan que la suscripción ya no existe: se borra la fila en el
 * acto, que es lo que corresponde y además mantiene chica la única tabla con un
 * identificador persistente.
 */
export async function sendToSubscriptions(
  targets: Target[],
  payload: ReminderPayload,
  markNotifiedFor?: Date,
): Promise<SendSummary> {
  configure();

  const body = JSON.stringify({ ...payload, origin: siteUrl() });
  const summary: SendSummary = { sent: 0, expired: 0, failed: 0 };
  const delivered: string[] = [];
  const gone: string[] = [];
  const failed: string[] = [];

  // En tandas para no abrir cientos de conexiones a la vez.
  const BATCH = 50;
  for (let index = 0; index < targets.length; index += BATCH) {
    const batch = targets.slice(index, index + BATCH);
    await Promise.all(
      batch.map(async (target) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: { p256dh: target.p256dh, auth: target.auth },
            },
            body,
            { TTL: 60 * 60 },
          );
          delivered.push(target.id);
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            gone.push(target.id);
          } else {
            console.error("[push] fallo de envío", status, target.id);
            failed.push(target.id);
          }
        }
      }),
    );
  }

  summary.sent = delivered.length;
  summary.expired = gone.length;
  summary.failed = failed.length;

  if (gone.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  }

  if (delivered.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: delivered } },
      data: {
        failureCount: 0,
        ...(markNotifiedFor ? { lastNotifiedFor: markNotifiedFor } : {}),
      },
    });
  }

  if (failed.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: failed } },
      data: { failureCount: { increment: 1 } },
    });
    // Tras varios fallos seguidos el endpoint está muerto aunque no devuelva 410.
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: failed }, failureCount: { gte: 5 } },
    });
  }

  return summary;
}
