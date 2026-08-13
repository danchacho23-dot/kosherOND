"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction } from "@/lib/admin/audit";
import { supervisionSchema } from "@/lib/validation/merchant";
import {
  bool,
  failure,
  panamaDate,
  success,
  text,
  toFieldErrors,
  type ActionState,
} from "@/lib/admin/form";
import {
  StorageError,
  deletePrivateDocument,
  putPrivateDocument,
  validateDocument,
} from "@/lib/storage";

/**
 * Supervisión kosher: campo que SOLO edita un administrador.
 *
 * Mientras no exista una fila activa y vigente, la página pública no dice nada
 * sobre supervisión. No hay forma de que un comercio se auto-declare kosher.
 */
export async function saveSupervision(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = supervisionSchema.safeParse({
    merchantId: text(formData, "merchantId"),
    authority: text(formData, "authority"),
    certificateId: text(formData, "certificateId"),
    verifiedAt: text(formData, "verifiedAt"),
    expiresAt: text(formData, "expiresAt"),
    notes: text(formData, "notes"),
    isActive: bool(formData, "isActive"),
  });
  if (!parsed.success) {
    return failure("Revisá los campos marcados.", toFieldErrors(parsed.error));
  }

  const verifiedAt = panamaDate(parsed.data.verifiedAt);
  if (!verifiedAt) {
    return failure("Fecha de verificación inválida.", { verifiedAt: "Fecha inválida" });
  }
  const expiresAt = parsed.data.expiresAt ? panamaDate(parsed.data.expiresAt, true) : null;
  if (parsed.data.expiresAt && !expiresAt) {
    return failure("Fecha de vencimiento inválida.", { expiresAt: "Fecha inválida" });
  }
  if (expiresAt && expiresAt <= verifiedAt) {
    return failure("El vencimiento tiene que ser posterior a la verificación.", {
      expiresAt: "Debe ser posterior a la verificación",
    });
  }

  const { merchantId } = parsed.data;
  const before = await prisma.kosherSupervision.findUnique({ where: { merchantId } });

  const data = {
    authority: parsed.data.authority,
    certificateId: parsed.data.certificateId || null,
    verifiedAt,
    expiresAt,
    notes: parsed.data.notes || null,
    isActive: parsed.data.isActive,
    verifiedByUserId: session.user.id,
    // Un vencimiento nuevo habilita un aviso nuevo.
    expiryNotifiedAt: null,
  };

  const after = await prisma.kosherSupervision.upsert({
    where: { merchantId },
    create: { merchantId, ...data },
    update: data,
  });

  await logAdminAction({
    session,
    action: before ? "supervision.update" : "supervision.create",
    entityType: "Merchant",
    entityId: merchantId,
    previousValue: before
      ? {
          authority: before.authority,
          verifiedAt: before.verifiedAt,
          expiresAt: before.expiresAt,
          isActive: before.isActive,
        }
      : undefined,
    newValue: {
      authority: after.authority,
      verifiedAt: after.verifiedAt,
      expiresAt: after.expiresAt,
      isActive: after.isActive,
    },
  });

  await revalidateMerchant(merchantId);
  return success("Supervisión guardada.");
}

export async function revokeSupervision(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const merchantId = text(formData, "merchantId");
  if (!merchantId) return failure("Falta el identificador.");

  const before = await prisma.kosherSupervision.findUnique({ where: { merchantId } });
  if (!before) return failure("Este comercio no tiene supervisión cargada.");

  await prisma.kosherSupervision.update({
    where: { merchantId },
    data: { isActive: false },
  });

  await logAdminAction({
    session,
    action: "supervision.revoke",
    entityType: "Merchant",
    entityId: merchantId,
    previousValue: { isActive: before.isActive },
    newValue: { isActive: false },
  });

  await revalidateMerchant(merchantId);
  return success("Supervisión revocada. La página pública deja de mostrarla.");
}

export async function uploadCertificationDocument(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const merchantId = text(formData, "merchantId");
  const file = formData.get("file");

  if (!merchantId) return failure("Falta el identificador.");
  if (!(file instanceof File)) return failure("Elegí un archivo.");

  const problem = validateDocument(file);
  if (problem) return failure(problem, { file: problem });

  const supervision = await prisma.kosherSupervision.findUnique({ where: { merchantId } });
  if (!supervision) {
    return failure("Cargá primero los datos de supervisión y después el documento.");
  }

  try {
    const stored = await putPrivateDocument(file);
    const document = await prisma.certificationDocument.create({
      data: {
        supervisionId: supervision.id,
        storageKey: stored.storageKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        uploadedByUserId: session.user.id,
      },
    });

    await logAdminAction({
      session,
      action: "supervision.document.upload",
      entityType: "Merchant",
      entityId: merchantId,
      newValue: { documentId: document.id, fileName: document.fileName },
    });
  } catch (error) {
    if (error instanceof StorageError) return failure(error.message, { file: error.message });
    throw error;
  }

  await revalidateMerchant(merchantId);
  return success("Documento cargado en el almacenamiento privado.");
}

export async function deleteCertificationDocument(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return failure("Falta el identificador.");

  const document = await prisma.certificationDocument.findUnique({
    where: { id },
    include: { supervision: { select: { merchantId: true } } },
  });
  if (!document) return failure("El documento ya no existe.");

  try {
    await deletePrivateDocument(document.storageKey);
  } catch (error) {
    // Si el objeto ya no está en el bucket, igual limpiamos la fila.
    console.error("[storage] no se pudo borrar el objeto", error);
  }

  await prisma.certificationDocument.delete({ where: { id } });
  await logAdminAction({
    session,
    action: "supervision.document.delete",
    entityType: "Merchant",
    entityId: document.supervision.merchantId,
    previousValue: { fileName: document.fileName },
  });

  await revalidateMerchant(document.supervision.merchantId);
  return success("Documento eliminado.");
}

async function revalidateMerchant(merchantId: string): Promise<void> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { slug: true },
  });
  revalidatePath(`/admin/comercios/${merchantId}`);
  if (merchant) revalidatePath(`/comercio/${merchant.slug}`);
}
