import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireAdminApi } from "@/lib/admin/guard";
import { StorageError, getPrivateDocument } from "@/lib/storage";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/**
 * Única salida de un documento de certificación.
 *
 * El bucket es privado y no expone URLs. Sin sesión de admin válida, esto
 * devuelve 401 antes de tocar el almacenamiento. Cada descarga queda en la
 * auditoría: quién miró qué certificado y cuándo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireAdminApi();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    throw error;
  }

  const { id } = await params;
  const document = await prisma.certificationDocument.findUnique({
    where: { id },
    include: { supervision: { select: { merchantId: true } } },
  });
  if (!document) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const upstream = await getPrivateDocument(document.storageKey);
    const body = await upstream.arrayBuffer();

    await logAdminAction({
      session,
      action: "supervision.document.download",
      entityType: "Merchant",
      entityId: document.supervision.merchantId,
      newValue: { documentId: document.id, fileName: document.fileName },
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(body.byteLength),
        // `inline` para poder mirarlo sin descargarlo; el nombre va entre
        // comillas por si trae espacios.
        "Content-Disposition": `inline; filename="${document.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
