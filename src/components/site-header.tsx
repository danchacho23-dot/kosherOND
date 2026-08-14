import Link from "next/link";
import { copy } from "@/lib/copy";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink-50/95 backdrop-blur">
      {/*
        `min-w-0` + `truncate` en la marca y `shrink-0` en la navegación:
        garantiza que el header nunca fuerce scroll horizontal, por angosto que
        sea el teléfono. Si algo tiene que ceder, cede el nombre de marca —
        nunca la página entera.
      */}
      <div className="container-page flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-ink-900"
        >
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white sm:size-8 sm:text-sm"
          >
            K
          </span>
          <span className="truncate text-[0.9375rem] sm:text-lg">
            Kosher<span className="text-brand-700">OnDemand</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/directorio"
            className="rounded-lg px-2 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 sm:px-3"
          >
            {copy.nav.directory}
          </Link>
          <Link
            href="/aplicar"
            className="rounded-lg bg-ink-900 px-2.5 py-2 text-sm font-medium text-white hover:bg-ink-800 sm:px-3"
          >
            <span className="sm:hidden">Sumate</span>
            <span className="hidden sm:inline">{copy.nav.apply}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
