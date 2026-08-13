import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { deleteCategory, saveCategory } from "@/lib/admin/actions/taxonomy";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";
export const metadata = { title: copy.admin.nav.categories };

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { merchants: true } } },
  });

  return (
    <TaxonomyManager
      title={copy.admin.nav.categories}
      withIcon
      saveAction={saveCategory}
      deleteAction={deleteCategory}
      rows={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        merchantCount: category._count.merchants,
      }))}
    />
  );
}
