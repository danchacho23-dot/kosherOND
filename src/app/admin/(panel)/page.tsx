import Link from "next/link";
import { AlertTriangle, Inbox, ShieldAlert, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { Alert, Badge, Card, CardContent, EmptyState } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  await requireAdmin();
  const now = new Date();

  const [
    pendingApplications,
    publishedMerchants,
    draftMerchants,
    suspendedMerchants,
    expiringSupervisions,
    seedCount,
    recentApplications,
    clicksLastWeek,
  ] = await Promise.all([
    prisma.merchantApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.merchant.count({ where: { status: "APPROVED", deletedAt: null } }),
    prisma.merchant.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.merchant.count({ where: { status: "SUSPENDED", deletedAt: null } }),
    prisma.kosherSupervision.findMany({
      where: {
        isActive: true,
        expiresAt: { not: null, lte: new Date(now.getTime() + THIRTY_DAYS_MS) },
      },
      include: { merchant: { select: { id: true, name: true } } },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.merchant.count({ where: { isSeedData: true, deletedAt: null } }),
    prisma.merchantApplication.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.analyticsEvent.count({
      where: {
        type: { in: ["WHATSAPP_CLICK", "WEBSITE_CLICK"] },
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-ink-900">Resumen</h1>

      {seedCount > 0 ? (
        <Alert variant="warning" title="Hay datos ficticios publicados">
          {seedCount} comercio(s) vienen del seed de desarrollo. Ninguno puede quedar
          publicado en el lanzamiento: corré <code>npm run db:seed:clear</code>.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Solicitudes pendientes"
          value={pendingApplications}
          href="/admin/solicitudes"
          icon={<Inbox className="size-4" aria-hidden="true" />}
          highlight={pendingApplications > 0}
        />
        <StatCard
          label="Comercios publicados"
          value={publishedMerchants}
          href="/admin/comercios?estado=APPROVED"
          icon={<Store className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Borradores y suspendidos"
          value={draftMerchants + suspendedMerchants}
          href="/admin/comercios?estado=DRAFT"
          icon={<AlertTriangle className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Clicks externos (7 días)"
          value={clicksLastWeek}
          href="/admin/metricas"
          icon={<Store className="size-4" aria-hidden="true" />}
        />
      </div>

      {expiringSupervisions.length > 0 ? (
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
            <ShieldAlert className="size-4 text-accent-500" aria-hidden="true" />
            Supervisiones por vencer
          </h2>
          <ul className="mt-3 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
            {expiringSupervisions.map((supervision) => (
              <li key={supervision.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <Link
                    href={`/admin/comercios/${supervision.merchant.id}`}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    {supervision.merchant.name}
                  </Link>
                  <p className="text-xs text-ink-500">
                    {supervision.authority} · vence{" "}
                    {supervision.expiresAt?.toISOString().slice(0, 10)}
                  </p>
                </div>
                <Badge variant="warning">Renovar</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-base font-semibold text-ink-900">Últimas solicitudes</h2>
        <div className="mt-3">
          {recentApplications.length === 0 ? (
            <EmptyState title="No hay solicitudes pendientes." />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
              {recentApplications.map((application) => (
                <li
                  key={application.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {application.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {application.email} · {application.createdAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/solicitudes/${application.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Revisar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
  highlight = false,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-brand-300 bg-brand-50" : undefined}>
      <CardContent className="pt-5">
        <Link href={href} className="block">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
            {icon}
            {label}
          </span>
          <span className="mt-1 block text-2xl font-semibold text-ink-900">{value}</span>
        </Link>
      </CardContent>
    </Card>
  );
}
