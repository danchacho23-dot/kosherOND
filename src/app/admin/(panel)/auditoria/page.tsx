import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";
export const metadata = { title: copy.admin.nav.log };

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina ?? 1) || 1);
  const pageSize = 50;

  const [entries, total] = await Promise.all([
    prisma.adminActionLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminActionLog.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{copy.admin.nav.log}</h1>
        <p className="mt-1 text-sm text-ink-500">
          Toda acción de admin queda registrada: quién, cuándo, sobre qué, y qué cambió.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState title={copy.admin.common.empty} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-ink-200 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th scope="col" className="p-3 font-medium">Fecha</th>
                <th scope="col" className="p-3 font-medium">Actor</th>
                <th scope="col" className="p-3 font-medium">Acción</th>
                <th scope="col" className="p-3 font-medium">Objeto</th>
                <th scope="col" className="p-3 font-medium">Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="p-3 align-top whitespace-nowrap text-ink-500">
                    {entry.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="p-3 align-top text-ink-700">{entry.actorEmail}</td>
                  <td className="p-3 align-top font-medium text-ink-900">{entry.action}</td>
                  <td className="p-3 align-top text-xs text-ink-500">
                    {entry.entityType}
                    <br />
                    <span className="font-mono">{entry.entityId.slice(0, 10)}</span>
                  </td>
                  <td className="p-3 align-top">
                    {entry.previousValue || entry.newValue ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-brand-700">
                          Ver diff
                        </summary>
                        <pre className="mt-2 max-w-md overflow-x-auto rounded bg-ink-100 p-2 text-[11px] leading-relaxed">
{JSON.stringify({ antes: entry.previousValue, despues: entry.newValue }, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Paginación">
          <a
            href={`/admin/auditoria?pagina=${Math.max(1, page - 1)}`}
            aria-disabled={page === 1}
            className={page === 1 ? "pointer-events-none text-ink-300" : "text-brand-700"}
          >
            Anterior
          </a>
          <span className="text-ink-500">
            Página {page} de {Math.ceil(total / pageSize)}
          </span>
          <a
            href={`/admin/auditoria?pagina=${page + 1}`}
            aria-disabled={page * pageSize >= total}
            className={
              page * pageSize >= total ? "pointer-events-none text-ink-300" : "text-brand-700"
            }
          >
            Siguiente
          </a>
        </nav>
      ) : null}
    </div>
  );
}
