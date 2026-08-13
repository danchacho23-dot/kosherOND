import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { Alert, Badge, Card, CardContent } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { ActionButton } from "@/components/admin/action-form";
import { MerchantForm } from "@/components/admin/merchant-form";
import { HoursEditor } from "@/components/admin/hours-editor";
import { ClosuresEditor } from "@/components/admin/closures-editor";
import { ProductsEditor } from "@/components/admin/products-editor";
import { SupervisionPanel } from "@/components/admin/supervision-panel";
import {
  restoreMerchant,
  setMerchantStatus,
  softDeleteMerchant,
  updateMerchant,
} from "@/lib/admin/actions/merchants";
import { computeOpenState } from "@/lib/hours/engine";
import { isStorageConfigured } from "@/lib/storage";
import { OpenBadge } from "@/components/open-badge";

export const dynamic = "force-dynamic";

/** `Date` → `YYYY-MM-DD` en hora de Panamá, para inputs `type="date"`. */
function dateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AdminMerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [merchant, categories, neighborhoods] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id },
      include: {
        hours: { orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }] },
        closures: { orderBy: { startsAt: "desc" } },
        products: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        supervision: { include: { documents: { orderBy: { createdAt: "desc" } } } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.neighborhood.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!merchant) notFound();

  const now = new Date();
  const openState = computeOpenState(
    {
      timezone: merchant.timezone,
      weeklyHours: merchant.hours,
      closures: merchant.closures,
      observesShabbat: merchant.observesShabbat,
      shabbatCloseOffsetMinutes: merchant.shabbatCloseOffsetMinutes,
      havdalahReopenOffsetMinutes: merchant.havdalahReopenOffsetMinutes,
    },
    now,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/comercios" className="text-sm text-brand-700 hover:underline">
            ← Comercios
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">{merchant.name}</h1>
          <p className="text-xs text-ink-500">
            <span className="font-mono">{merchant.publicId}</span> · /{merchant.slug}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={merchant.status === "APPROVED" ? "success" : "neutral"}>
              {merchant.status}
            </Badge>
            <OpenBadge state={openState} withDetail />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {merchant.status === "APPROVED" ? (
            <Link
              href={`/comercio/${merchant.slug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Ver página
            </Link>
          ) : null}
          {merchant.deletedAt ? (
            <ActionButton
              action={restoreMerchant}
              label="Restaurar"
              fields={{ id: merchant.id }}
            />
          ) : merchant.status === "APPROVED" ? (
            <ActionButton
              action={setMerchantStatus}
              label="Suspender"
              fields={{ id: merchant.id, status: "SUSPENDED" }}
              confirm="El comercio deja de ser visible al público. ¿Continuar?"
            />
          ) : (
            <ActionButton
              action={setMerchantStatus}
              label="Publicar"
              variant="primary"
              fields={{ id: merchant.id, status: "APPROVED" }}
            />
          )}
        </div>
      </div>

      {merchant.deletedAt ? (
        <Alert variant="warning" title="Comercio eliminado">
          Se eliminó el {merchant.deletedAt.toISOString().slice(0, 10)}. No aparece en el
          directorio. El historial y las métricas quedan intactos.
        </Alert>
      ) : null}

      {merchant.isSeedData ? (
        <Alert variant="danger" title="Dato ficticio">
          Este comercio viene del seed de desarrollo. No puede quedar publicado en el
          lanzamiento.
        </Alert>
      ) : null}

      <MerchantForm
        action={updateMerchant}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        neighborhoods={neighborhoods.map((n) => ({ id: n.id, name: n.name }))}
        values={{
          id: merchant.id,
          legalName: merchant.legalName,
          name: merchant.name,
          slug: merchant.slug,
          tagline: merchant.tagline ?? "",
          description: merchant.description ?? "",
          contactName: merchant.contactName,
          phone: merchant.phone,
          whatsappPhone: merchant.whatsappPhone ?? "",
          email: merchant.email,
          categoryId: merchant.categoryId,
          neighborhoodId: merchant.neighborhoodId,
          addressLine: merchant.addressLine,
          addressNote: merchant.addressNote ?? "",
          latitude: merchant.latitude?.toString() ?? "",
          longitude: merchant.longitude?.toString() ?? "",
          deliveryAreaText: merchant.deliveryAreaText ?? "",
          offersDelivery: merchant.offersDelivery,
          offersPickup: merchant.offersPickup,
          dietTag: merchant.dietTag ?? "",
          tags: merchant.tags.join(", "),
          orderChannels: merchant.orderChannels,
          websiteUrl: merchant.websiteUrl ?? "",
          whatsappGreeting: merchant.whatsappGreeting ?? "",
          logoUrl: merchant.logoUrl ?? "",
          coverUrl: merchant.coverUrl ?? "",
          observesShabbat: merchant.observesShabbat,
          shabbatCloseOffsetMinutes: merchant.shabbatCloseOffsetMinutes,
          havdalahReopenOffsetMinutes: merchant.havdalahReopenOffsetMinutes,
          status: merchant.status,
          isFeatured: merchant.isFeatured,
          sortWeight: merchant.sortWeight,
        }}
      />

      <HoursEditor
        merchantId={merchant.id}
        initialRanges={merchant.hours.map((range) => ({
          dayOfWeek: range.dayOfWeek,
          opensAt: range.opensAt,
          closesAt: range.closesAt,
        }))}
      />

      <ClosuresEditor
        merchantId={merchant.id}
        closures={merchant.closures.map((closure) => ({
          id: closure.id,
          startsAt: dateInputValue(closure.startsAt),
          endsAt: dateInputValue(closure.endsAt),
          reason: closure.reason,
        }))}
      />

      <SupervisionPanel
        merchantId={merchant.id}
        hasSupervision={Boolean(merchant.supervision)}
        storageConfigured={isStorageConfigured()}
        values={
          merchant.supervision
            ? {
                authority: merchant.supervision.authority,
                certificateId: merchant.supervision.certificateId ?? "",
                verifiedAt: dateInputValue(merchant.supervision.verifiedAt),
                expiresAt: dateInputValue(merchant.supervision.expiresAt),
                notes: merchant.supervision.notes ?? "",
                isActive: merchant.supervision.isActive,
              }
            : null
        }
        documents={(merchant.supervision?.documents ?? []).map((document) => ({
          id: document.id,
          fileName: document.fileName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          createdAt: document.createdAt.toISOString().slice(0, 10),
        }))}
      />

      <ProductsEditor
        merchantId={merchant.id}
        products={merchant.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          dietTag: product.dietTag,
        }))}
      />

      {!merchant.deletedAt ? (
        <Card className="border-danger-500/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
            <div>
              <p className="text-sm font-medium text-ink-900">Eliminar comercio</p>
              <p className="text-xs text-ink-500">
                Baja lógica: deja de ser público, pero el historial y las métricas quedan.
              </p>
            </div>
            <ActionButton
              action={softDeleteMerchant}
              label="Eliminar"
              variant="danger"
              fields={{ id: merchant.id }}
              confirm={`¿Eliminar “${merchant.name}” del directorio?`}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
