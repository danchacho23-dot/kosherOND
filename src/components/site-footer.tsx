import Link from "next/link";
import { copy } from "@/lib/copy";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container-page py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-ink-900">{copy.brand.name}</p>
            <p className="mt-2 text-sm text-ink-500">{copy.legal.disclaimerBody}</p>
          </div>
          <nav aria-label="Pie de página" className="flex flex-col gap-2 text-sm">
            <Link href="/directorio" className="text-ink-600 hover:text-ink-900">
              {copy.nav.directory}
            </Link>
            <Link href="/aplicar" className="text-ink-600 hover:text-ink-900">
              {copy.footer.apply}
            </Link>
            <Link href="/legal/terminos" className="text-ink-600 hover:text-ink-900">
              {copy.footer.terms}
            </Link>
            <Link href="/legal/privacidad" className="text-ink-600 hover:text-ink-900">
              {copy.footer.privacy}
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-ink-400">
          © {new Date().getFullYear()} {copy.brand.name}. {copy.footer.rights}
        </p>
      </div>
    </footer>
  );
}
