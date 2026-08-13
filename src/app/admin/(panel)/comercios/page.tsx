import Link from "next/link";
import type { MerchantStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { Badge, EmptyState, Input } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn, normalizeText } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: copy.admin.nav.merchants };

const TABS = [
  { value: "todos", label: "Todos" },
  { value: "APPROVED", label: "Publicados" },
  { value: "DRAFT", label: "Borradores" },
  { value: "SUSPENDED", label: "Suspendidos" },
  { value: "eliminados", label: "Eliminados" },
];

const STATUS_VARIANT: Record<MerchantStatus, "success" | "neutral" | "warning"> = {
  APPROVED: "success",
  DRAFT: "neutral",
  SUSPENDED: "warning",
};

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter = typeof params.estado === "string" ? params.estado : "todos";
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const where: Prisma.MerchantWhereInput =
    filter === "eliminados"
      ? { deletedAt: { not: null } }
      : filter === "todos"
        ? { deletedAt: null }
        : { deletedAt: null, status: filter as MerchantStatus };

  if (query) {
    where.searchText = { contains: normalizeText(query) };
  }

  const merchants = await prisma.merchant.findMany({
    where,
    include: {
      category: { select: { name: true } },
      neighborhood: { select: { name: true } },
      supervision: { select: { isActive: true, expiresAt: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  const now = new Date().getTime();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">{copy.admin.nav.merchants}</h1>
        <Link href="/admin/comercios/nuevo" className={buttonVariants()}>
          Nuevo comercio
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Filtrar comercios">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/comercios?estado=${tab.value}`}
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

        <form method="get" action="/admin/comercios" className="ml-auto flex gap-2" role="search">
          <input type="hidden" name="estado" value={filter} />
          <Input
            name="q"
            type="search"
            defaultValue={query}
            placeholder={copy.admin.common.search}
            aria-label="Buscar comercios"
            className="w-48"
          />
        </form>
      </div>

      {merchants.length === 0 ? (
        <EmptyState title="No hay comercios con ese filtro." />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
          {merchants.map((merchant) => {
            const supervisionExpired =
              merchant.supervision?.expiresAt &&
              merchant.supervision.expiresAt.getTime() < now;
            return (
              <li key={merchant.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {merchant.name}
                    {merchant.isSeedData ? (
                      <Badge variant="danger" className="ml-2">
                        seed
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {merchant.category.name} · {merchant.neighborhood.name} · /
                    {merchant.slug}
                  </p>
                </div>

                {merchant.supervision?.isActive && !supervisionExpired ? (
                  <Badge variant="brand">Supervisión</Badge>
                ) : null}
                {supervisionExpired ? <Badge variant="warning">Supervisión vencida</Badge> : null}
                {merchant.isFeatured ? <Badge variant="neutral">Destacado</Badge> : null}
                <Badge variant={STATUS_VARIANT[merchant.status]}>{merchant.status}</Badge>

                <Link
                  href={`/admin/comercios/${merchant.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {copy.admin.common.edit}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
