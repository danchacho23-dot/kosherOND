import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { DietTag } from "@prisma/client";
import { MerchantCardGrid } from "@/components/merchant-card";
import { DirectoryFilters } from "@/components/directory-filters";
import { SearchForm } from "@/components/search-form";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { recordEventAsync } from "@/lib/analytics";
import {
  listCategories,
  listNeighborhoods,
  listPublishedMerchants,
  type DirectoryFilters as Filters,
} from "@/lib/merchants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: copy.directory.title,
  description: copy.brand.description,
  alternates: { canonical: "/directorio" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const DIET_VALUES: DietTag[] = ["MEAT", "DAIRY", "PAREVE", "MIXED"];

function parseFilters(params: SearchParams): Filters {
  const rawDiet = first(params.tipo);
  return {
    q: first(params.q),
    category: first(params.categoria),
    neighborhood: first(params.barrio),
    openNow: Boolean(first(params.abierto)),
    delivery: Boolean(first(params.delivery)),
    pickup: Boolean(first(params.retiro)),
    diet: DIET_VALUES.find((value) => value === rawDiet),
  };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [merchants, categories, neighborhoods] = await Promise.all([
    listPublishedMerchants(filters),
    listCategories(),
    listNeighborhoods(),
  ]);

  recordEventAsync({
    type: "DIRECTORY_VIEW",
    path: "/directorio",
    searchTerm: filters.q ?? null,
  });

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {copy.directory.title}
        </h1>
        <p className="mt-1 text-sm text-ink-600">{copy.directory.subtitle}</p>
      </header>

      <div className="mb-5 max-w-xl">
        <SearchForm defaultValue={filters.q ?? ""} />
      </div>

      <Suspense fallback={<Skeleton className="h-28" />}>
        <DirectoryFilters
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          neighborhoods={neighborhoods.map((n) => ({ slug: n.slug, name: n.name }))}
        />
      </Suspense>

      <p className="mt-6 mb-4 text-sm text-ink-500" aria-live="polite">
        {copy.directory.resultsCount(merchants.length)}
        {filters.q ? ` para “${filters.q}”` : ""}
      </p>

      {merchants.length > 0 ? (
        <MerchantCardGrid merchants={merchants} />
      ) : (
        <EmptyState
          title={copy.directory.empty}
          body={copy.directory.emptyHint}
          action={
            <Link href="/directorio" className={buttonVariants({ variant: "outline" })}>
              {copy.directory.clearFilters}
            </Link>
          }
        />
      )}
    </div>
  );
}
