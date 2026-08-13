import type { Metadata } from "next";
import { ApplicationFormShell } from "@/components/application-form-shell";
import { copy } from "@/lib/copy";
import { listCategories, listNeighborhoods } from "@/lib/merchants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: copy.apply.title,
  description: copy.apply.subtitle,
  alternates: { canonical: "/aplicar" },
};

export default async function ApplyPage() {
  const [categories, neighborhoods] = await Promise.all([
    listCategories(),
    listNeighborhoods(),
  ]);

  return (
    <div className="container-page max-w-2xl py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {copy.apply.title}
        </h1>
        <p className="mt-2 leading-relaxed text-ink-600">{copy.apply.subtitle}</p>
      </header>

      <ApplicationFormShell
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        neighborhoods={neighborhoods.map((n) => ({ slug: n.slug, name: n.name }))}
      />
    </div>
  );
}
