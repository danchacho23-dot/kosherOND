import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/mailer";
import { supervisionExpiringEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Aviso al admin cuando falta un mes para el vencimiento de una supervisión.
 *
 * Pensado para correr una vez por día (cron de Vercel). Cada supervisión se
 * avisa una sola vez por vencimiento: `expiryNotifiedAt` se limpia cuando el
 * admin carga una fecha nueva.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const now = new Date();
  const threshold = new Date(now.getTime() + THIRTY_DAYS_MS);

  const expiring = await prisma.kosherSupervision.findMany({
    where: {
      isActive: true,
      expiryNotifiedAt: null,
      expiresAt: { not: null, lte: threshold, gte: now },
    },
    include: { merchant: { select: { id: true, name: true } } },
    orderBy: { expiresAt: "asc" },
  });

  if (expiring.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!recipient) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_NOTIFICATION_EMAIL no configurada", pending: expiring.length },
      { status: 500 },
    );
  }

  const result = await sendEmail(
    supervisionExpiringEmail({
      to: recipient,
      merchants: expiring.map((supervision) => ({
        name: supervision.merchant.name,
        authority: supervision.authority,
        expiresAt: supervision.expiresAt!,
        url: `${siteUrl()}/admin/comercios/${supervision.merchant.id}`,
      })),
    }),
  );

  if (!result.ok) {
    // Sin marcar como notificadas: la próxima corrida vuelve a intentar.
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  await prisma.kosherSupervision.updateMany({
    where: { id: { in: expiring.map((supervision) => supervision.id) } },
    data: { expiryNotifiedAt: now },
  });

  return NextResponse.json({ ok: true, notified: expiring.length });
}
