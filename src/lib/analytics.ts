import type { AnalyticsEventType, OrderChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { copy } from "@/lib/copy";
import { normalizeText, toInternationalPhone } from "@/lib/utils";

/**
 * Eventos sin datos personales. No guardamos IP, ni user agent, ni cookie de
 * usuario: nada acá permite reconstruir quién hizo qué. Lo que sí permite es
 * decidir la Fase 2 — a qué comercio le conviene el pedido nativo se ve en el
 * volumen de clicks a WhatsApp, no en una encuesta.
 */

export interface EventInput {
  type: AnalyticsEventType;
  merchantId?: string | null;
  searchTerm?: string | null;
  filterKey?: string | null;
  filterValue?: string | null;
  path?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Nunca lanza: una métrica perdida no puede romper una página. */
export async function recordEvent(input: EventInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: input.type,
        merchantId: input.merchantId ?? null,
        // El término se guarda normalizado: sirve para agrupar, no para espiar.
        searchTerm: input.searchTerm ? normalizeText(input.searchTerm).slice(0, 120) : null,
        filterKey: input.filterKey ?? null,
        filterValue: input.filterValue ?? null,
        path: input.path?.slice(0, 200) ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[analytics] no se pudo registrar el evento", input.type, error);
  }
}

/** Igual que `recordEvent` pero sin esperar: para render de páginas. */
export function recordEventAsync(input: EventInput): void {
  void recordEvent(input);
}

// ---------------------------------------------------------------------------
// Construcción de destinos externos
// ---------------------------------------------------------------------------

export const ATTRIBUTION_SOURCE = "kosherondemand";

export interface ExternalTargetMerchant {
  publicId: string;
  name: string;
  phone: string;
  whatsappPhone: string | null;
  websiteUrl: string | null;
  addressLine: string;
  whatsappGreeting: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Deep link de WhatsApp con mensaje prellenado. Incluye el nombre del comercio
 * y un identificador corto de origen, para que el comercio sepa de dónde vino
 * el pedido aunque nunca entre al panel.
 */
export function buildWhatsappUrl(merchant: ExternalTargetMerchant): string | null {
  const phone = toInternationalPhone(merchant.whatsappPhone ?? merchant.phone);
  if (!phone) return null;
  const greeting = merchant.whatsappGreeting?.trim() || copy.order.whatsappGreeting(merchant.name);
  const text = `${greeting} [ref: ${merchant.publicId}]`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildWebsiteUrl(merchant: ExternalTargetMerchant): string | null {
  if (!merchant.websiteUrl) return null;
  try {
    const url = new URL(merchant.websiteUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.searchParams.set("utm_source", ATTRIBUTION_SOURCE);
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_content", merchant.publicId);
    return url.toString();
  } catch {
    return null;
  }
}

export function buildPhoneUrl(merchant: ExternalTargetMerchant): string | null {
  const phone = toInternationalPhone(merchant.phone);
  return phone ? `tel:+${phone}` : null;
}

export function buildMapsUrl(merchant: ExternalTargetMerchant): string {
  const query =
    merchant.latitude !== null && merchant.longitude !== null
      ? `${merchant.latitude},${merchant.longitude}`
      : `${merchant.name}, ${merchant.addressLine}, Panamá`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildChannelUrl(
  merchant: ExternalTargetMerchant,
  channel: OrderChannel,
): string | null {
  switch (channel) {
    case "WHATSAPP":
      return buildWhatsappUrl(merchant);
    case "WEBSITE":
      return buildWebsiteUrl(merchant);
    case "PHONE":
      return buildPhoneUrl(merchant);
    case "PICKUP":
      return buildMapsUrl(merchant);
    default:
      return null;
  }
}

export const CHANNEL_EVENT: Record<OrderChannel, AnalyticsEventType> = {
  WHATSAPP: "WHATSAPP_CLICK",
  WEBSITE: "WEBSITE_CLICK",
  PHONE: "PHONE_CLICK",
  PICKUP: "DIRECTIONS_CLICK",
};
