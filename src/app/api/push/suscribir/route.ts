import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, hashClient } from "@/lib/rate-limit";
import { isPushConfigured } from "@/lib/push/send";
import {
  MAX_LEAD_MINUTES,
  MIN_LEAD_MINUTES,
  normalizeLeadMinutes,
} from "@/lib/push/reminders";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.url().max(600),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
  leadMinutes: z.number().int().min(MIN_LEAD_MINUTES).max(MAX_LEAD_MINUTES).optional(),
});

/** Alta o actualización de una suscripción a los avisos de Shabat. */
export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Los avisos no están configurados en este servidor." },
      { status: 503 },
    );
  }

  const client = hashClient(request);
  if (!checkRateLimit(`push:${client}`, 10, 60_000).allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = subscriptionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Suscripción inválida" }, { status: 400 });
  }

  const { endpoint, keys, leadMinutes } = parsed.data;
  const lead = normalizeLeadMinutes(leadMinutes);

  // El endpoint es único: volver a suscribirse actualiza, no duplica.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, leadMinutes: lead },
    update: { p256dh: keys.p256dh, auth: keys.auth, leadMinutes: lead, failureCount: 0 },
  });

  return NextResponse.json({ ok: true, leadMinutes: lead });
}

/** Baja. Se borra la fila entera: no guardamos historial de quién se fue. */
export async function DELETE(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = z.object({ endpoint: z.url().max(600) }).safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });
  return NextResponse.json({ ok: true });
}
