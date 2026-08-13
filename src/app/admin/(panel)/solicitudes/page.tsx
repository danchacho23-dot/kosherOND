import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: copy.admin.nav.applications };

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_VARIANT: Record<ApplicationStatus, "brand" | "warning" | "success" | "neutral"> = {
  SUBMITTED: "brand",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "neutral",
};

const TABS: Array<{ value: string; label: string }> = [
  { value: "pendientes", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "todas", label: "Todas" },
];

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter = typeof params.estado === "string" ? params.estado : "pendientes";

  const where =
    filter === "pendientes"
      ? { status: { in: ["SUBMITTED", "UNDER_REVIEW"] as ApplicationStatus[] } }
      : filter === "todas"
        ? {}
        : { status: filter as ApplicationStatus };

  const applications = await prisma.merchantApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink-900">{copy.admin.nav.applications}</h1>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar solicitudes">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/solicitudes?estado=${tab.value}`}
            aria-current={filter === tab.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              filter === tab.value
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-300 bg-white text-ink-700 hover:bg-ink-100",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <EmptyState title="No hay solicitudes con ese filtro." />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
          {applications.map((application) => (
            <li key={application.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{application.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {application.contactName} · {application.email} ·{" "}
                  {application.createdAt.toISOString().slice(0, 10)} ·{" "}
                  <span className="font-mono">{application.publicId}</span>
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[application.status]}>
                {STATUS_LABEL[application.status]}
              </Badge>
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
  );
}
