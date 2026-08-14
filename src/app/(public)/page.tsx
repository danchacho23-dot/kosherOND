import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { MerchantCardGrid } from "@/components/merchant-card";
import { SearchForm } from "@/components/search-form";
import { ShabbatReminder } from "@/components/shabbat-reminder";
import { CategoryIcon } from "@/components/category-icon";
import { copy } from "@/lib/copy";
import { recordEventAsync } from "@/lib/analytics";
import { listCategoriesWithCounts, listPublishedMerchants } from "@/lib/merchants";

// El estado abierto/cerrado cambia con el reloj: nada de esta página se cachea.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [merchants, categories] = await Promise.all([
    listPublishedMerchants({}, { now }),
    listCategoriesWithCounts(),
  ]);

  recordEventAsync({ type: "HOME_VIEW", path: "/" });

  const openNow = merchants.filter((merchant) => merchant.openState.isOpen).slice(0, 6);
  const featured = merchants.filter((merchant) => merchant.isFeatured).slice(0, 3);

  return (
    <>
      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-10 sm:py-14">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            {copy.home.heroTitle}
          </h1>
          <p className="mt-3 max-w-xl text-[0.975rem] leading-relaxed text-ink-600">
            {copy.home.heroSubtitle}
          </p>
          <div className="mt-6 max-w-xl">
            <SearchForm />
          </div>
        </div>
      </section>

      <div className="container-page space-y-12 py-10">
        {categories.length > 0 ? (
          <section aria-labelledby="categorias-titulo">
            <h2 id="categorias-titulo" className="text-lg font-semibold text-ink-900">
              {copy.home.categoriesTitle}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/directorio?categoria=${category.slug}`}
                    className="flex h-full items-center gap-3 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                      <CategoryIcon name={category.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {category.name}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {copy.directory.resultsCount(category.merchantCount)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="abiertos-titulo">
          <div className="flex items-end justify-between gap-4">
            <h2 id="abiertos-titulo" className="text-lg font-semibold text-ink-900">
              {copy.home.openNowTitle}
            </h2>
            <Link
              href="/directorio?abierto=1"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {copy.home.seeAll}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4">
            {openNow.length > 0 ? (
              <MerchantCardGrid merchants={openNow} />
            ) : (
              <EmptyState
                title={copy.home.openNowEmpty}
                action={
                  <Link href="/directorio" className={buttonVariants({ variant: "outline" })}>
                    {copy.home.seeDirectory}
                  </Link>
                }
              />
            )}
          </div>
        </section>

        {featured.length > 0 ? (
          <section aria-labelledby="destacados-titulo">
            <h2 id="destacados-titulo" className="text-lg font-semibold text-ink-900">
              {copy.home.featuredTitle}
            </h2>
            <div className="mt-4">
              <MerchantCardGrid merchants={featured} />
            </div>
          </section>
        ) : null}

        {merchants.length === 0 ? (
          <EmptyState
            title="Todavía no hay comercios publicados"
            body="Estamos armando el directorio. Si tenés un comercio kosher en Panamá, sumalo."
            action={
              <Link href="/aplicar" className={buttonVariants()}>
                {copy.nav.apply}
              </Link>
            }
          />
        ) : null}

        {/* Los avisos son la única función que exige app instalada; por eso el
            bloque solo aparece si el servidor tiene Web Push configurado. */}
        {process.env.VAPID_PUBLIC_KEY ? (
          <ShabbatReminder publicKey={process.env.VAPID_PUBLIC_KEY} />
        ) : null}

        <Alert>{copy.home.disclaimer}</Alert>
      </div>
    </>
  );
}
