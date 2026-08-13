import Link from "next/link";
import { copy } from "@/lib/copy";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink-50/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-900"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white"
          >
            K
          </span>
          <span>
            Kosher<span className="text-brand-700">OnDemand</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/directorio"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            {copy.nav.directory}
          </Link>
          <Link
            href="/aplicar"
            className="rounded-lg bg-ink-900 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800"
          >
            <span className="sm:hidden">Sumate</span>
            <span className="hidden sm:inline">{copy.nav.apply}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
