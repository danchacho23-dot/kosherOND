import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { deleteNeighborhood, saveNeighborhood } from "@/lib/admin/actions/taxonomy";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";
export const metadata = { title: copy.admin.nav.neighborhoods };

export default async function NeighborhoodsPage() {
  await requireAdmin();
  const neighborhoods = await prisma.neighborhood.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { merchants: true } } },
  });

  return (
    <TaxonomyManager
      title={copy.admin.nav.neighborhoods}
      saveAction={saveNeighborhood}
      deleteAction={deleteNeighborhood}
      rows={neighborhoods.map((neighborhood) => ({
        id: neighborhood.id,
        name: neighborhood.name,
        slug: neighborhood.slug,
        sortOrder: neighborhood.sortOrder,
        isActive: neighborhood.isActive,
        merchantCount: neighborhood._count.merchants,
      }))}
    />
  );
}
