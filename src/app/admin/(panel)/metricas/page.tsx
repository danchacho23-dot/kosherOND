import Link from "next/link";
import type { AnalyticsEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: copy.admin.nav.analytics };

const RANGES = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
];

const EVENT_LABEL: Record<AnalyticsEventType, string> = {
  HOME_VIEW: "Vistas de home",
  DIRECTORY_VIEW: "Vistas de directorio",
  SEARCH: "Búsquedas",
  FILTER_USE: "Uso de filtros",
  MERCHANT_VIEW: "Vistas de comercio",
  WHATSAPP_CLICK: "Clicks a WhatsApp",
  WEBSITE_CLICK: "Clicks a sitio externo",
  PHONE_CLICK: "Clicks a teléfono",
  DIRECTIONS_CLICK: "Clicks a cómo llegar",
  APPLICATION_SUBMITTED: "Solicitudes enviadas",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const days = Number(typeof params.dias === "string" ? params.dias : "30") || 30;
  const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);

  const [byType, topMerchants, topSearches, topFilters] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["merchantId"],
      where: {
        createdAt: { gte: since },
        type: { in: ["WHATSAPP_CLICK", "WEBSITE_CLICK", "PHONE_CLICK", "DIRECTIONS_CLICK"] },
        merchantId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { merchantId: "desc" } },
      take: 15,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["searchTerm"],
      where: { createdAt: { gte: since }, type: "SEARCH", searchTerm: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { searchTerm: "desc" } },
      take: 15,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["filterKey", "filterValue"],
      where: { createdAt: { gte: since }, type: "FILTER_USE" },
      _count: { _all: true },
      orderBy: { _count: { filterKey: "desc" } },
      take: 15,
    }),
  ]);

  const merchantIds = topMerchants
    .map((row) => row.merchantId)
    .filter((id): id is string => Boolean(id));
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true, name: true },
  });
  const merchantName = new Map(merchants.map((m) => [m.id, m.name]));

  const counts = new Map(byType.map((row) => [row.type, row._count._all]));
  const totalEvents = byType.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{copy.admin.nav.analytics}</h1>
          <p className="mt-1 text-sm text-ink-500">
            Eventos agregados, sin datos personales. Estos números son los que deciden la
            Fase 2.
          </p>
        </div>
        <nav className="flex gap-2" aria-label="Rango de fechas">
          {RANGES.map((range) => (
            <Link
              key={range.value}
              href={`/admin/metricas?dias=${range.value}`}
              aria-current={String(days) === range.value ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                String(days) === range.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-300 bg-white text-ink-700 hover:bg-ink-100",
              )}
            >
              {range.label}
            </Link>
          ))}
        </nav>
      </div>

      {totalEvents === 0 ? (
        <EmptyState
          title="Todavía no hay eventos en este rango."
          body="Los eventos se registran a medida que la gente navega el directorio."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(EVENT_LABEL) as AnalyticsEventType[]).map((type) => (
              <Card key={type}>
                <CardContent className="pt-5">
                  <p className="text-xs font-medium text-ink-500">{EVENT_LABEL[type]}</p>
                  <p className="mt-1 text-2xl font-semibold text-ink-900">
                    {counts.get(type) ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Comercios con más salidas</CardTitle>
              </CardHeader>
              <CardContent>
                {topMerchants.length === 0 ? (
                  <p className="text-sm text-ink-500">Sin datos.</p>
                ) : (
                  <ol className="space-y-2">
                    {topMerchants.map((row) => (
                      <li
                        key={row.merchantId}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <Link
                          href={`/admin/comercios/${row.merchantId}`}
                          className="truncate text-brand-700 hover:underline"
                        >
                          {merchantName.get(row.merchantId!) ?? "—"}
                        </Link>
                        <span className="font-medium text-ink-900">{row._count._all}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-4 text-xs text-ink-500">
                  Volumen sostenido acá, más tres comercios pidiéndolo, es la señal para
                  construir pedido nativo. Antes de eso, no.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Búsquedas más frecuentes</CardTitle>
              </CardHeader>
              <CardContent>
                {topSearches.length === 0 ? (
                  <p className="text-sm text-ink-500">Sin datos.</p>
                ) : (
                  <ol className="space-y-2">
                    {topSearches.map((row) => (
                      <li
                        key={row.searchTerm}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-ink-700">{row.searchTerm}</span>
                        <span className="font-medium text-ink-900">{row._count._all}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Filtros más usados</CardTitle>
              </CardHeader>
              <CardContent>
                {topFilters.length === 0 ? (
                  <p className="text-sm text-ink-500">Sin datos.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {topFilters.map((row, index) => (
                      <li
                        key={`${row.filterKey}-${row.filterValue}-${index}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-ink-700">
                          {row.filterKey}
                          {row.filterValue ? `: ${row.filterValue}` : ""}
                        </span>
                        <span className="font-medium text-ink-900">{row._count._all}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
