import { NextResponse, type NextRequest } from "next/server";
import { OrderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CHANNEL_EVENT, buildChannelUrl, recordEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Salida atribuida hacia el comercio.
 *
 * El destino se arma en el servidor, no en el cliente: así el link de WhatsApp
 * y los parámetros UTM no dependen de que el JS haya cargado, y el evento queda
 * registrado aunque el navegador bloquee beacons. Es también el único lugar
 * donde el click se cuenta, así que no hay doble conteo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const merchantPublicId = searchParams.get("m");
  const rawChannel = searchParams.get("c")?.toUpperCase();

  const channel = Object.values(OrderChannel).find((value) => value === rawChannel);
  if (!merchantPublicId || !channel) {
    return NextResponse.redirect(new URL("/directorio", origin), 302);
  }

  const merchant = await prisma.merchant.findFirst({
    where: { publicId: merchantPublicId, status: "APPROVED", deletedAt: null },
    select: {
      id: true,
      publicId: true,
      slug: true,
      name: true,
      phone: true,
      whatsappPhone: true,
      websiteUrl: true,
      addressLine: true,
      whatsappGreeting: true,
      latitude: true,
      longitude: true,
      orderChannels: true,
    },
  });

  if (!merchant) {
    return NextResponse.redirect(new URL("/directorio", origin), 302);
  }

  // Un canal que el comercio no habilitó no se abre, aunque venga en la URL.
  if (!merchant.orderChannels.includes(channel)) {
    return NextResponse.redirect(new URL(`/comercio/${merchant.slug}`, origin), 302);
  }

  const destination = buildChannelUrl(merchant, channel);
  if (!destination) {
    return NextResponse.redirect(new URL(`/comercio/${merchant.slug}`, origin), 302);
  }

  // Un 302 hacia `tel:` no es confiable fuera del celular. El botón de llamar
  // enlaza directo al `tel:` y avisa por beacon; acá solo registramos y
  // devolvemos a la ficha si alguien llega igual.
  if (channel === OrderChannel.PHONE) {
    await recordEvent({
      type: CHANNEL_EVENT[channel],
      merchantId: merchant.id,
      filterKey: "channel",
      filterValue: channel,
      path: `/comercio/${merchant.slug}`,
    });
    return NextResponse.redirect(new URL(`/comercio/${merchant.slug}`, origin), 302);
  }

  await recordEvent({
    type: CHANNEL_EVENT[channel],
    merchantId: merchant.id,
    filterKey: "channel",
    filterValue: channel,
    path: `/comercio/${merchant.slug}`,
  });

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
