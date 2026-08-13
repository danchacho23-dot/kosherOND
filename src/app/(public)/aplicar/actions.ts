"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { publicId } from "@/lib/utils";
import { siteUrl } from "@/lib/env";
import { recordEvent } from "@/lib/analytics";
import { checkRateLimit, hashClient } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/mailer";
import {
  applicationReceivedEmail,
  newApplicationNoticeEmail,
} from "@/lib/email/templates";
import {
  applicationSchemaWithChannelRules,
  fieldErrors,
} from "@/lib/validation/application";

export interface ApplicationFormState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  trackingCode?: string;
}

/** Ventana persistida: 3 solicitudes por hora desde el mismo origen. */
const DB_LIMIT = 3;
const DB_WINDOW_MS = 60 * 60 * 1000;

async function checkApplicationRateLimit(submitterHash: string): Promise<boolean> {
  const since = new Date(Date.now() - DB_WINDOW_MS);
  const recent = await prisma.merchantApplication.count({
    where: { submitterHash, createdAt: { gte: since } },
  });
  return recent < DB_LIMIT;
}

export async function submitApplication(
  _previous: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { status: "error", message: "Solicitud inválida" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Solicitud inválida" };
  }

  const parsed = applicationSchemaWithChannelRules.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      errors: fieldErrors(parsed.error),
    };
  }
  const data = parsed.data;

  // Rate limiting en dos capas: memoria (rápida) y base (durable entre instancias).
  const requestHeaders = await headers();
  const pseudoRequest = new Request(siteUrl(), { headers: requestHeaders });
  const submitterHash = hashClient(pseudoRequest);

  const memoryLimit = checkRateLimit(`aplicar:${submitterHash}`, DB_LIMIT, DB_WINDOW_MS);
  if (!memoryLimit.allowed || !(await checkApplicationRateLimit(submitterHash))) {
    return {
      status: "error",
      message:
        "Recibimos varias solicitudes desde esta conexión. Esperá unos minutos e intentá de nuevo.",
    };
  }

  const [category, neighborhood] = await Promise.all([
    prisma.category.findUnique({ where: { slug: data.categorySlug } }),
    prisma.neighborhood.findUnique({ where: { slug: data.neighborhoodSlug } }),
  ]);

  const errors: Record<string, string> = {};
  if (!category) errors.categorySlug = "Elegí una categoría de la lista";
  if (!neighborhood) errors.neighborhoodSlug = "Elegí un barrio de la lista";
  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Revisá los campos marcados.", errors };
  }

  const trackingCode = publicId(8);

  const application = await prisma.merchantApplication.create({
    data: {
      publicId: trackingCode,
      legalName: data.legalName,
      name: data.name,
      contactName: data.contactName,
      phone: data.phone,
      whatsappPhone: data.whatsappPhone || null,
      email: data.email,
      categoryId: category?.id ?? null,
      categorySlug: data.categorySlug,
      neighborhoodId: neighborhood?.id ?? null,
      neighborhoodSlug: data.neighborhoodSlug,
      addressLine: data.addressLine,
      description: data.description || null,
      deliveryAreaText: data.deliveryAreaText || null,
      offersDelivery: data.offersDelivery,
      offersPickup: data.offersPickup,
      dietTag: data.dietTag || null,
      orderChannels: data.orderChannels,
      websiteUrl: data.websiteUrl || null,
      logoUrl: data.logoUrl || null,
      coverUrl: data.coverUrl || null,
      // El horario se guarda tal como lo mandó el solicitante. La normalización
      // pasa recién cuando el admin aprueba y crea el comercio.
      hoursPayload: data.hours,
      status: "SUBMITTED",
      submitterHash,
    },
  });

  await recordEvent({
    type: "APPLICATION_SUBMITTED",
    path: "/aplicar",
    metadata: { categorySlug: data.categorySlug, neighborhoodSlug: data.neighborhoodSlug },
  });

  // Los emails no bloquean la respuesta: si fallan, la solicitud ya está guardada.
  void sendEmail(
    applicationReceivedEmail({
      to: data.email,
      merchantName: data.name,
      trackingCode,
    }),
  );

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    void sendEmail(
      newApplicationNoticeEmail({
        to: adminEmail,
        merchantName: data.name,
        reviewUrl: `${siteUrl()}/admin/solicitudes/${application.id}`,
      }),
    );
  }

  return { status: "success", trackingCode };
}
