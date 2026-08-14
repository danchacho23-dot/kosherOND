import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReligiousClosures } from "@/lib/hours/hebrew-calendar";
import { addDays } from "@/lib/hours/timezone";
import { buildReminder, isWithinLeadWindow } from "@/lib/push/reminders";
import { isPushConfigured, sendToSubscriptions } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/**
 * Manda el aviso de cierre por Shabat o jag.
 *
 * Pensado para correr cada hora. Cada suscripción elige con cuánta anticipación
 * quiere el aviso, así que en cada corrida se manda solo a las que entran en su
 * ventana y todavía no fueron avisadas de ESTE cierre.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, error: "Web Push no configurado" }, { status: 503 });
  }

  const now = new Date();

  // El próximo cierre que todavía no empezó. La ventana de 3 días alcanza:
  // nunca pasan más de 3 días sin un Shabat.
  const closure = getReligiousClosures(now, addDays(now, 4))
    .filter((candidate) => candidate.candleLighting.getTime() > now.getTime())
    .sort((a, b) => a.candleLighting.getTime() - b.candleLighting.getTime())[0];

  if (!closure) {
    return NextResponse.json({ ok: true, sent: 0, reason: "sin cierres próximos" });
  }

  const candidates = await prisma.pushSubscription.findMany({
    where: {
      OR: [{ lastNotifiedFor: null }, { lastNotifiedFor: { lt: closure.candleLighting } }],
    },
    select: { id: true, endpoint: true, p256dh: true, auth: true, leadMinutes: true, failureCount: true },
  });

  const due = candidates.filter((subscription) =>
    isWithinLeadWindow(closure.candleLighting, now, subscription.leadMinutes),
  );

  if (due.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      nextClosure: closure.candleLighting.toISOString(),
      label: closure.label,
    });
  }

  const summary = await sendToSubscriptions(
    due,
    buildReminder(closure, now),
    closure.candleLighting,
  );

  return NextResponse.json({
    ok: true,
    label: closure.label,
    nextClosure: closure.candleLighting.toISOString(),
    ...summary,
  });
}
