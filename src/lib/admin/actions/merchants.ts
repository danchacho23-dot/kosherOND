"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DietTag, OrderChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { diffRecords, logAdminAction } from "@/lib/admin/audit";
import { buildSearchText } from "@/lib/merchants";
import { publicId, slugify } from "@/lib/utils";
import {
  closureSchema,
  hoursAdminSchema,
  merchantAdminSchema,
  productSchema,
  type MerchantAdminInput,
} from "@/lib/validation/merchant";
import {
  bool,
  failure,
  json,
  list,
  optionalNumber,
  panamaDate,
  success,
  text,
  toFieldErrors,
  type ActionState,
} from "@/lib/admin/form";

function parseMerchantForm(formData: FormData) {
  return merchantAdminSchema.safeParse({
    legalName: text(formData, "legalName"),
    name: text(formData, "name"),
    slug: text(formData, "slug") || slugify(text(formData, "name")),
    tagline: text(formData, "tagline"),
    description: text(formData, "description"),
    contactName: text(formData, "contactName"),
    phone: text(formData, "phone"),
    whatsappPhone: text(formData, "whatsappPhone"),
    email: text(formData, "email"),
    categoryId: text(formData, "categoryId"),
    neighborhoodId: text(formData, "neighborhoodId"),
    addressLine: text(formData, "addressLine"),
    addressNote: text(formData, "addressNote"),
    latitude: optionalNumber(formData, "latitude"),
    longitude: optionalNumber(formData, "longitude"),
    deliveryAreaText: text(formData, "deliveryAreaText"),
    offersDelivery: bool(formData, "offersDelivery"),
    offersPickup: bool(formData, "offersPickup"),
    dietTag: text(formData, "dietTag"),
    tags: text(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    orderChannels: list(formData, "orderChannels"),
    websiteUrl: text(formData, "websiteUrl"),
    whatsappGreeting: text(formData, "whatsappGreeting"),
    logoUrl: text(formData, "logoUrl"),
    coverUrl: text(formData, "coverUrl"),
    observesShabbat: bool(formData, "observesShabbat"),
    shabbatCloseOffsetMinutes: text(formData, "shabbatCloseOffsetMinutes") || 90,
    havdalahReopenOffsetMinutes: text(formData, "havdalahReopenOffsetMinutes") || 60,
    status: text(formData, "status") || "DRAFT",
    isFeatured: bool(formData, "isFeatured"),
    sortWeight: text(formData, "sortWeight") || 0,
  });
}

type MerchantWriteData = Omit<Prisma.MerchantUncheckedCreateInput, "publicId">;

async function toWriteData(input: MerchantAdminInput): Promise<MerchantWriteData> {
  const [category, neighborhood] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } }),
    prisma.neighborhood.findUnique({
      where: { id: input.neighborhoodId },
      select: { name: true },
    }),
  ]);

  return {
    legalName: input.legalName,
    name: input.name,
    slug: input.slug,
    tagline: input.tagline || null,
    description: input.description || null,
    contactName: input.contactName,
    phone: input.phone,
    whatsappPhone: input.whatsappPhone || null,
    email: input.email,
    categoryId: input.categoryId,
    neighborhoodId: input.neighborhoodId,
    addressLine: input.addressLine,
    addressNote: input.addressNote || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    deliveryAreaText: input.deliveryAreaText || null,
    offersDelivery: input.offersDelivery,
    offersPickup: input.offersPickup,
    dietTag: (input.dietTag || null) as DietTag | null,
    tags: input.tags,
    orderChannels: input.orderChannels as OrderChannel[],
    websiteUrl: input.websiteUrl || null,
    whatsappGreeting: input.whatsappGreeting || null,
    logoUrl: input.logoUrl || null,
    coverUrl: input.coverUrl || null,
    observesShabbat: input.observesShabbat,
    shabbatCloseOffsetMinutes: input.shabbatCloseOffsetMinutes,
    havdalahReopenOffsetMinutes: input.havdalahReopenOffsetMinutes,
    status: input.status,
    isFeatured: input.isFeatured,
    sortWeight: input.sortWeight,
    searchText: buildSearchText({
      name: input.name,
      legalName: input.legalName,
      description: input.description,
      tagline: input.tagline,
      categoryName: category?.name,
      neighborhoodName: neighborhood?.name,
      tags: input.tags,
    }),
    publishedAt: input.status === "APPROVED" ? new Date() : null,
  };
}

export async function createMerchant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parseMerchantForm(formData);
  if (!parsed.success) {
    return failure("Revisá los campos marcados.", toFieldErrors(parsed.error));
  }

  const existing = await prisma.merchant.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return failure("Ya existe un comercio con ese slug.", { slug: "Slug en uso" });

  const data = await toWriteData(parsed.data);
  const created = await prisma.merchant.create({
    data: { ...data, publicId: publicId() },
  });

  await logAdminAction({
    session,
    action: "merchant.create",
    entityType: "Merchant",
    entityId: created.id,
    newValue: { name: created.name, slug: created.slug, status: created.status },
  });

  revalidatePath("/admin/comercios");
  redirect(`/admin/comercios/${created.id}`);
}

export async function updateMerchant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const parsed = parseMerchantForm(formData);
  if (!parsed.success) {
    return failure("Revisá los campos marcados.", toFieldErrors(parsed.error));
  }

  const before = await prisma.merchant.findUnique({ where: { id } });
  if (!before) return failure("El comercio ya no existe.");

  const duplicate = await prisma.merchant.findUnique({ where: { slug: parsed.data.slug } });
  if (duplicate && duplicate.id !== id) {
    return failure("Ya existe un comercio con ese slug.", { slug: "Slug en uso" });
  }

  const data = await toWriteData(parsed.data);
  // `publishedAt` marca la primera publicación: no se pisa en cada guardado.
  const after = await prisma.merchant.update({
    where: { id },
    data: {
      ...data,
      publishedAt:
        data.status === "APPROVED" ? (before.publishedAt ?? new Date()) : before.publishedAt,
    },
  });

  const diff = diffRecords(
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );
  if (diff) {
    await logAdminAction({
      session,
      action: "merchant.update",
      entityType: "Merchant",
      entityId: id,
      previousValue: diff.previous,
      newValue: diff.next,
    });
  }

  revalidatePath("/admin/comercios");
  revalidatePath(`/comercio/${after.slug}`);
  revalidatePath("/");
  return success("Comercio guardado.");
}

export async function setMerchantStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["DRAFT", "APPROVED", "SUSPENDED"].includes(status)) {
    return failure("Estado inválido.");
  }

  const before = await prisma.merchant.findUnique({ where: { id } });
  if (!before) return failure("El comercio ya no existe.");

  const after = await prisma.merchant.update({
    where: { id },
    data: {
      status: status as "DRAFT" | "APPROVED" | "SUSPENDED",
      publishedAt:
        status === "APPROVED" ? (before.publishedAt ?? new Date()) : before.publishedAt,
    },
  });

  await logAdminAction({
    session,
    action: "merchant.status",
    entityType: "Merchant",
    entityId: id,
    previousValue: { status: before.status },
    newValue: { status: after.status },
  });

  revalidatePath("/admin/comercios");
  revalidatePath(`/comercio/${after.slug}`);
  revalidatePath("/");
  return success(`Estado actualizado a ${status}.`);
}

/** Baja lógica: el comercio deja de ser público pero el historial queda. */
export async function softDeleteMerchant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const before = await prisma.merchant.findUnique({ where: { id } });
  if (!before) return failure("El comercio ya no existe.");

  await prisma.merchant.update({
    where: { id },
    data: { deletedAt: new Date(), status: "SUSPENDED" },
  });

  await logAdminAction({
    session,
    action: "merchant.softDelete",
    entityType: "Merchant",
    entityId: id,
    previousValue: { status: before.status, deletedAt: before.deletedAt },
    newValue: { status: "SUSPENDED", deletedAt: new Date() },
  });

  revalidatePath("/admin/comercios");
  revalidatePath("/");
  redirect("/admin/comercios");
}

export async function restoreMerchant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  await prisma.merchant.update({ where: { id }, data: { deletedAt: null, status: "DRAFT" } });
  await logAdminAction({
    session,
    action: "merchant.restore",
    entityType: "Merchant",
    entityId: id,
    newValue: { deletedAt: null, status: "DRAFT" },
  });

  revalidatePath("/admin/comercios");
  return success("Comercio restaurado como borrador.");
}

// ---------------------------------------------------------------------------
// Horarios y cierres
// ---------------------------------------------------------------------------

export async function saveMerchantHours(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = hoursAdminSchema.safeParse({
    merchantId: text(formData, "merchantId"),
    ranges: json(formData, "ranges", []),
  });
  if (!parsed.success) {
    return failure("Horario inválido.", toFieldErrors(parsed.error));
  }

  const { merchantId, ranges } = parsed.data;
  const before = await prisma.merchantHours.findMany({ where: { merchantId } });

  await prisma.$transaction([
    prisma.merchantHours.deleteMany({ where: { merchantId } }),
    prisma.merchantHours.createMany({
      data: ranges.map((range) => ({ ...range, merchantId })),
    }),
  ]);

  await logAdminAction({
    session,
    action: "merchant.hours",
    entityType: "Merchant",
    entityId: merchantId,
    previousValue: before.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      opensAt: h.opensAt,
      closesAt: h.closesAt,
    })),
    newValue: ranges,
  });

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { slug: true },
  });
  if (merchant) revalidatePath(`/comercio/${merchant.slug}`);
  revalidatePath("/");
  return success("Horario guardado.");
}

export async function addClosure(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = closureSchema.safeParse({
    merchantId: text(formData, "merchantId"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    reason: text(formData, "reason"),
  });
  if (!parsed.success) {
    return failure("Revisá las fechas.", toFieldErrors(parsed.error));
  }

  const startsAt = panamaDate(parsed.data.startsAt);
  const endsAt = panamaDate(parsed.data.endsAt, true);
  if (!startsAt || !endsAt) return failure("Fechas inválidas.");
  if (endsAt <= startsAt) {
    return failure("La fecha de fin tiene que ser posterior a la de inicio.", {
      endsAt: "Debe ser posterior al inicio",
    });
  }

  const created = await prisma.holidayClosure.create({
    data: {
      merchantId: parsed.data.merchantId,
      startsAt,
      endsAt,
      reason: parsed.data.reason || null,
    },
  });

  await logAdminAction({
    session,
    action: "merchant.closure.add",
    entityType: "Merchant",
    entityId: parsed.data.merchantId,
    newValue: { startsAt, endsAt, reason: created.reason },
  });

  revalidatePath(`/admin/comercios/${parsed.data.merchantId}`);
  revalidatePath("/");
  return success("Cierre cargado.");
}

export async function removeClosure(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const before = await prisma.holidayClosure.findUnique({ where: { id } });
  if (!before) return failure("El cierre ya no existe.");

  await prisma.holidayClosure.delete({ where: { id } });
  await logAdminAction({
    session,
    action: "merchant.closure.remove",
    entityType: "Merchant",
    entityId: before.merchantId,
    previousValue: { startsAt: before.startsAt, endsAt: before.endsAt, reason: before.reason },
  });

  revalidatePath(`/admin/comercios/${before.merchantId}`);
  revalidatePath("/");
  return success("Cierre eliminado.");
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export async function saveProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const rawPrice = text(formData, "price").trim();
  const parsed = productSchema.safeParse({
    merchantId: text(formData, "merchantId"),
    id: text(formData, "id") || undefined,
    name: text(formData, "name"),
    description: text(formData, "description"),
    // El admin escribe balboas; se guardan centavos.
    priceCents: rawPrice ? Math.round(Number(rawPrice) * 100) : null,
    dietTag: text(formData, "dietTag"),
    sortOrder: text(formData, "sortOrder") || 0,
  });
  if (!parsed.success) {
    return failure("Revisá los campos marcados.", toFieldErrors(parsed.error));
  }

  const { id, merchantId, dietTag, ...rest } = parsed.data;
  const data = {
    ...rest,
    merchantId,
    description: rest.description || null,
    dietTag: (dietTag || null) as DietTag | null,
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    await prisma.product.create({ data });
  }

  await logAdminAction({
    session,
    action: id ? "product.update" : "product.create",
    entityType: "Merchant",
    entityId: merchantId,
    newValue: { name: data.name, priceCents: data.priceCents },
  });

  revalidatePath(`/admin/comercios/${merchantId}`);
  return success("Producto guardado.");
}

export async function deleteProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return failure("El producto ya no existe.");

  await prisma.product.delete({ where: { id } });
  await logAdminAction({
    session,
    action: "product.delete",
    entityType: "Merchant",
    entityId: before.merchantId,
    previousValue: { name: before.name },
  });

  revalidatePath(`/admin/comercios/${before.merchantId}`);
  return success("Producto eliminado.");
}
