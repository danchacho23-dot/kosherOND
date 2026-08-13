import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/guard";
import { MerchantForm, EMPTY_MERCHANT } from "@/components/admin/merchant-form";
import { createMerchant } from "@/lib/admin/actions/merchants";
import { Alert } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo comercio" };

export default async function NewMerchantPage() {
  await requireAdmin();

  const [categories, neighborhoods] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.neighborhood.findMany({ orderBy: { name: "asc" } }),
  ]);

  const missingTaxonomy = categories.length === 0 || neighborhoods.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/comercios" className="text-sm text-brand-700 hover:underline">
          ← Comercios
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink-900">Nuevo comercio</h1>
        <p className="mt-1 text-sm text-ink-500">
          Se crea como borrador. Los horarios y la supervisión se cargan después de guardar.
        </p>
      </div>

      {missingTaxonomy ? (
        <Alert variant="warning" title="Faltan categorías o barrios">
          Cargá al menos una categoría y un barrio antes de crear comercios.
        </Alert>
      ) : (
        <MerchantForm
          action={createMerchant}
          values={EMPTY_MERCHANT}
          submitLabel="Crear comercio"
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          neighborhoods={neighborhoods.map((n) => ({ id: n.id, name: n.name }))}
        />
      )}
    </div>
  );
}
