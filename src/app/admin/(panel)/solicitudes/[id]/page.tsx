import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { ApplicationDecisionForm } from "@/components/admin/application-decision-form";
import { copy } from "@/lib/copy";
import { formatPhoneDisplay, minutesToLabel } from "@/lib/utils";
import { labelToMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface HoursEntry {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const application = await prisma.merchantApplication.findUnique({
    where: { id },
    include: {
      merchant: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { email: true } },
    },
  });
  if (!application) notFound();

  const [category, neighborhood] = await Promise.all([
    application.categoryId
      ? prisma.category.findUnique({ where: { id: application.categoryId } })
      : null,
    application.neighborhoodId
      ? prisma.neighborhood.findUnique({ where: { id: application.neighborhoodId } })
      : null,
  ]);

  const hours = Array.isArray(application.hoursPayload)
    ? (application.hoursPayload as unknown as HoursEntry[])
    : [];

  const decided = application.status === "APPROVED" || application.status === "REJECTED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/solicitudes" className="text-sm text-brand-700 hover:underline">
            ← {copy.admin.nav.applications}
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">{application.name}</h1>
          <p className="text-xs text-ink-500">
            Código <span className="font-mono">{application.publicId}</span> · recibida el{" "}
            {application.createdAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <Badge variant={decided ? "neutral" : "brand"}>{application.status}</Badge>
      </div>

      {application.merchant ? (
        <Alert variant="success" title="Ya fue aprobada">
          Se creó el comercio{" "}
          <Link
            href={`/admin/comercios/${application.merchant.id}`}
            className="font-medium underline"
          >
            {application.merchant.name}
          </Link>
          .
        </Alert>
      ) : null}

      {!category || !neighborhood ? (
        <Alert variant="warning" title="Faltan datos de taxonomía">
          La solicitud llegó con una categoría o un barrio que ya no existe. Creá la
          categoría/barrio o cargá el comercio a mano antes de aprobar.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos enviados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Nombre público" value={application.name} />
              <Row label="Razón social" value={application.legalName} />
              <Row label="Responsable" value={application.contactName} />
              <Row label="Email" value={application.email} />
              <Row label="Teléfono" value={formatPhoneDisplay(application.phone)} />
              <Row
                label="WhatsApp"
                value={
                  application.whatsappPhone
                    ? formatPhoneDisplay(application.whatsappPhone)
                    : "—"
                }
              />
              <Row label="Categoría" value={category?.name ?? application.categorySlug ?? "—"} />
              <Row
                label="Barrio"
                value={neighborhood?.name ?? application.neighborhoodSlug ?? "—"}
              />
              <Row label="Dirección" value={application.addressLine} />
              <Row
                label="Tipo"
                value={application.dietTag ? copy.diet[application.dietTag] : "—"}
              />
              <Row
                label="Entrega"
                value={[
                  application.offersDelivery ? "Delivery" : null,
                  application.offersPickup ? "Retiro" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              />
              <Row label="Zona de entrega" value={application.deliveryAreaText ?? "—"} />
              <Row
                label="Canales"
                value={application.orderChannels.map((c) => copy.channel[c]).join(", ") || "—"}
              />
              <Row label="Sitio web" value={application.websiteUrl ?? "—"} />
              <Row label="Logo" value={application.logoUrl ?? "—"} />
              <Row label="Portada" value={application.coverUrl ?? "—"} />
              <div className="sm:col-span-2">
                <Row label="Descripción" value={application.description ?? "—"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horario informado</CardTitle>
            </CardHeader>
            <CardContent>
              {hours.length === 0 ? (
                <p className="text-sm text-ink-500">No informó horarios.</p>
              ) : (
                <table className="w-full max-w-sm text-sm">
                  <tbody>
                    {copy.hours.days.map((dayLabel, day) => {
                      const ranges = hours
                        .filter((entry) => entry.dayOfWeek === day)
                        .map((entry) => {
                          const opens = labelToMinutes(String(entry.opensAt));
                          const closes = labelToMinutes(String(entry.closesAt));
                          if (opens === null || closes === null) return null;
                          return `${minutesToLabel(opens)}–${minutesToLabel(closes)}`;
                        })
                        .filter(Boolean);
                      return (
                        <tr key={day} className="border-b border-ink-100 last:border-0">
                          <th scope="row" className="py-2 text-left font-normal text-ink-600">
                            {dayLabel}
                          </th>
                          <td className="py-2 text-right text-ink-800">
                            {ranges.length > 0 ? ranges.join(", ") : copy.hours.closedToday}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-xs text-ink-500">
                Al aprobar, este horario se carga tal cual. El cierre por Shabat y jaguim se
                calcula aparte y no hace falta cargarlo.
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          {decided ? (
            <Card>
              <CardContent className="space-y-2 pt-5 text-sm">
                <p className="font-medium text-ink-900">Decisión tomada</p>
                <p className="text-ink-600">
                  {application.status} el{" "}
                  {application.reviewedAt?.toISOString().slice(0, 10) ?? "—"}
                  {application.reviewedBy ? ` por ${application.reviewedBy.email}` : ""}
                </p>
                {application.rejectionReason ? (
                  <p className="text-ink-600">Motivo: {application.rejectionReason}</p>
                ) : null}
                {application.reviewNotes ? (
                  <p className="text-ink-500">Notas: {application.reviewNotes}</p>
                ) : null}
                {application.merchant ? (
                  <Link
                    href={`/admin/comercios/${application.merchant.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Ir al comercio
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <ApplicationDecisionForm
              applicationId={application.id}
              canApprove={Boolean(category && neighborhood)}
              defaultNotes={application.reviewNotes ?? ""}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm break-words text-ink-900">{value}</p>
    </div>
  );
}
