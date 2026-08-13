"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction } from "@/lib/admin/audit";
import { buildSearchText } from "@/lib/merchants";
import { publicId, slugify } from "@/lib/utils";
import { siteUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/mailer";
import {
  applicationApprovedEmail,
  applicationRejectedEmail,
} from "@/lib/email/templates";
import { applicationDecisionSchema } from "@/lib/validation/merchant";
import { failure, success, text, toFieldErrors, type ActionState } from "@/lib/admin/form";
import { labelToMinutes } from "@/lib/utils";

interface HoursPayloadEntry {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

/** Slug único: si `carniceria-x` está tomado, prueba `carniceria-x-2`, `-3`… */
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "comercio";
  let candidate = root;
  let suffix = 2;
  // A la escala del MVP (decenas de comercios) esto termina en la primera vuelta.
  while (await prisma.merchant.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${suffix++}`;
    if (suffix > 50) return `${root}-${publicId(6).toLowerCase()}`;
  }
  return candidate;
}

export async function decideApplication(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = applicationDecisionSchema.safeParse({
    applicationId: text(formData, "applicationId"),
    decision: text(formData, "decision"),
    reviewNotes: text(formData, "reviewNotes"),
    rejectionReason: text(formData, "rejectionReason"),
  });
  if (!parsed.success) {
    return failure("Decisión inválida.", toFieldErrors(parsed.error));
  }

  const { applicationId, decision, reviewNotes, rejectionReason } = parsed.data;
  const application = await prisma.merchantApplication.findUnique({
    where: { id: applicationId },
  });
  if (!application) return failure("La solicitud ya no existe.");

  // --- Under review -------------------------------------------------------
  if (decision === "UNDER_REVIEW") {
    await prisma.merchantApplication.update({
      where: { id: applicationId },
      data: {
        status: "UNDER_REVIEW",
        reviewNotes: reviewNotes || null,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });
    await logAdminAction({
      session,
      action: "application.underReview",
      entityType: "MerchantApplication",
      entityId: applicationId,
      previousValue: { status: application.status },
      newValue: { status: "UNDER_REVIEW" },
    });
    revalidatePath("/admin/solicitudes");
    return success("Marcada como en revisión.");
  }

  // --- Rejected -----------------------------------------------------------
  if (decision === "REJECTED") {
    await prisma.merchantApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        reviewNotes: reviewNotes || null,
        rejectionReason: rejectionReason || null,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });
    await logAdminAction({
      session,
      action: "application.reject",
      entityType: "MerchantApplication",
      entityId: applicationId,
      previousValue: { status: application.status },
      newValue: { status: "REJECTED", rejectionReason },
    });

    void sendEmail(
      applicationRejectedEmail({
        to: application.email,
        merchantName: application.name,
        reason: rejectionReason || null,
      }),
    );

    revalidatePath("/admin/solicitudes");
    return success("Solicitud rechazada.");
  }

  // --- Approved -----------------------------------------------------------
  if (application.merchantId) {
    return failure("Esta solicitud ya tiene un comercio creado.");
  }
  if (!application.categoryId || !application.neighborhoodId) {
    return failure(
      "La solicitud no tiene categoría o barrio válidos. Corregilos antes de aprobar.",
    );
  }

  const [category, neighborhood] = await Promise.all([
    prisma.category.findUnique({
      where: { id: application.categoryId },
      select: { name: true },
    }),
    prisma.neighborhood.findUnique({
      where: { id: application.neighborhoodId },
      select: { name: true },
    }),
  ]);

  const slug = await uniqueSlug(application.name);
  const hoursPayload = Array.isArray(application.hoursPayload)
    ? (application.hoursPayload as unknown as HoursPayloadEntry[])
    : [];
  const hours = hoursPayload.flatMap((entry) => {
    const opensAt = labelToMinutes(String(entry.opensAt ?? ""));
    const closesAt = labelToMinutes(String(entry.closesAt ?? ""));
    if (opensAt === null || closesAt === null) return [];
    if (typeof entry.dayOfWeek !== "number" || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
      return [];
    }
    return [{ dayOfWeek: entry.dayOfWeek, opensAt, closesAt }];
  });

  const merchant = await prisma.merchant.create({
    data: {
      publicId: publicId(),
      slug,
      legalName: application.legalName,
      name: application.name,
      description: application.description,
      contactName: application.contactName,
      phone: application.phone,
      whatsappPhone: application.whatsappPhone,
      email: application.email,
      categoryId: application.categoryId,
      neighborhoodId: application.neighborhoodId,
      addressLine: application.addressLine,
      deliveryAreaText: application.deliveryAreaText,
      offersDelivery: application.offersDelivery,
      offersPickup: application.offersPickup,
      dietTag: application.dietTag,
      orderChannels: application.orderChannels as OrderChannel[],
      websiteUrl: application.websiteUrl,
      logoUrl: application.logoUrl,
      coverUrl: application.coverUrl,
      // Se publica directo: el admin ya revisó los datos en esta pantalla.
      status: "APPROVED",
      publishedAt: new Date(),
      searchText: buildSearchText({
        name: application.name,
        legalName: application.legalName,
        description: application.description,
        categoryName: category?.name,
        neighborhoodName: neighborhood?.name,
      }),
      hours: { createMany: { data: hours } },
    },
  });

  await prisma.merchantApplication.update({
    where: { id: applicationId },
    data: {
      status: "APPROVED",
      reviewNotes: reviewNotes || null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      merchantId: merchant.id,
    },
  });

  await logAdminAction({
    session,
    action: "application.approve",
    entityType: "MerchantApplication",
    entityId: applicationId,
    previousValue: { status: application.status },
    newValue: { status: "APPROVED", merchantId: merchant.id, slug: merchant.slug },
  });

  void sendEmail(
    applicationApprovedEmail({
      to: application.email,
      merchantName: merchant.name,
      merchantUrl: `${siteUrl()}/comercio/${merchant.slug}`,
    }),
  );

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin/comercios");
  revalidatePath("/");
  redirect(`/admin/comercios/${merchant.id}`);
}
