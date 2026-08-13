"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction } from "@/lib/admin/audit";
import { taxonomySchema } from "@/lib/validation/merchant";
import {
  bool,
  failure,
  success,
  text,
  toFieldErrors,
  type ActionState,
} from "@/lib/admin/form";

function parse(formData: FormData) {
  return taxonomySchema.safeParse({
    id: text(formData, "id") || undefined,
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    icon: text(formData, "icon"),
    sortOrder: text(formData, "sortOrder") || 0,
    isActive: bool(formData, "isActive"),
  });
}

export async function saveCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) {
    return failure("Revisá los campos marcados.", toFieldErrors(parsed.error));
  }
  const { id, ...data } = parsed.data;

  const duplicate = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (duplicate && duplicate.id !== id) {
    return failure("Ya existe una categoría con ese slug.", { slug: "Slug en uso" });
  }

  if (id) {
    const before = await prisma.category.findUnique({ where: { id } });
    if (!before) return failure("La categoría ya no existe.");
    const after = await prisma.category.update({ where: { id }, data });
    await logAdminAction({
      session,
      action: "category.update",
      entityType: "Category",
      entityId: id,
      previousValue: before,
      newValue: after,
    });
  } else {
    const created = await prisma.category.create({ data });
    await logAdminAction({
      session,
      action: "category.create",
      entityType: "Category",
      entityId: created.id,
      newValue: created,
    });
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return success("Categoría guardada.");
}

export async function deleteCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const inUse = await prisma.merchant.count({ where: { categoryId: id, deletedAt: null } });
  if (inUse > 0) {
    return failure(
      `No se puede eliminar: ${inUse} comercio(s) usan esta categoría. Desactivala en su lugar.`,
    );
  }

  const before = await prisma.category.findUnique({ where: { id } });
  await prisma.category.delete({ where: { id } });
  await logAdminAction({
    session,
    action: "category.delete",
    entityType: "Category",
    entityId: id,
    previousValue: before,
  });

  revalidatePath("/admin/categorias");
  return success("Categoría eliminada.");
}

export async function saveNeighborhood(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) {
    return failure("Revisá los campos marcados.", toFieldErrors(parsed.error));
  }
  const { id, icon: _icon, ...data } = parsed.data;

  const duplicate = await prisma.neighborhood.findUnique({ where: { slug: data.slug } });
  if (duplicate && duplicate.id !== id) {
    return failure("Ya existe un barrio con ese slug.", { slug: "Slug en uso" });
  }

  if (id) {
    const before = await prisma.neighborhood.findUnique({ where: { id } });
    if (!before) return failure("El barrio ya no existe.");
    const after = await prisma.neighborhood.update({ where: { id }, data });
    await logAdminAction({
      session,
      action: "neighborhood.update",
      entityType: "Neighborhood",
      entityId: id,
      previousValue: before,
      newValue: after,
    });
  } else {
    const created = await prisma.neighborhood.create({ data });
    await logAdminAction({
      session,
      action: "neighborhood.create",
      entityType: "Neighborhood",
      entityId: created.id,
      newValue: created,
    });
  }

  revalidatePath("/admin/barrios");
  revalidatePath("/directorio");
  return success("Barrio guardado.");
}

export async function deleteNeighborhood(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const inUse = await prisma.merchant.count({ where: { neighborhoodId: id, deletedAt: null } });
  if (inUse > 0) {
    return failure(
      `No se puede eliminar: ${inUse} comercio(s) están en este barrio. Desactivalo en su lugar.`,
    );
  }

  const before = await prisma.neighborhood.findUnique({ where: { id } });
  await prisma.neighborhood.delete({ where: { id } });
  await logAdminAction({
    session,
    action: "neighborhood.delete",
    entityType: "Neighborhood",
    entityId: id,
    previousValue: before,
  });

  revalidatePath("/admin/barrios");
  return success("Barrio eliminado.");
}
