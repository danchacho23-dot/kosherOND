"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: copy.admin.nav.dashboard, exact: true },
  { href: "/admin/solicitudes", label: copy.admin.nav.applications },
  { href: "/admin/comercios", label: copy.admin.nav.merchants },
  { href: "/admin/categorias", label: copy.admin.nav.categories },
  { href: "/admin/barrios", label: copy.admin.nav.neighborhoods },
  { href: "/admin/metricas", label: copy.admin.nav.analytics },
  { href: "/admin/auditoria", label: copy.admin.nav.log },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del panel" className="border-b border-ink-200 bg-white">
      <div className="container-page flex gap-1 overflow-x-auto py-2">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium",
                active ? "bg-brand-100 text-brand-800" : "text-ink-600 hover:bg-ink-100",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
