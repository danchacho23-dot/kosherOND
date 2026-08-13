import { NextResponse } from "next/server";
import { AnalyticsEventType } from "@prisma/client";
import { z } from "zod";
import { recordEvent } from "@/lib/analytics";
import { checkRateLimit, hashClient } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Endpoint de eventos para el cliente (`navigator.sendBeacon`).
 *
 * Solo acepta los tipos que efectivamente se emiten desde el navegador. Los
 * clicks a WhatsApp y a sitio externo NO pasan por acá: se registran del lado
 * del servidor en `/ir`, que es más confiable y evita el doble conteo.
 */
const CLIENT_EVENTS = [
  AnalyticsEventType.SEARCH,
  AnalyticsEventType.FILTER_USE,
  AnalyticsEventType.PHONE_CLICK,
] as const;

const schema = z.object({
  type: z.enum(CLIENT_EVENTS),
  merchantId: z.cuid().optional(),
  searchTerm: z.string().max(120).optional(),
  filterKey: z.string().max(40).optional(),
  filterValue: z.string().max(80).optional(),
  path: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const client = hashClient(request);
  const limit = checkRateLimit(`eventos:${client}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await recordEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
