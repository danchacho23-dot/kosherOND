import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: { default: copy.admin.title, template: `%s · ${copy.admin.title}` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Frontera de acceso del panel. Cada server action y route handler la vuelve
  // a chequear por su cuenta: este layout protege el render, no las mutaciones.
  const session = await requireAdmin();

  async function endSession() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <span className="text-sm font-semibold text-ink-900">
            Kosher<span className="text-brand-700">OnDemand</span>
            <span className="ml-2 font-normal text-ink-400">{copy.admin.title}</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-500 sm:inline">
              {session.user.email}
            </span>
            <form action={endSession}>
              <Button type="submit" variant="ghost" size="sm">
                {copy.admin.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <AdminNav />

      <main id="contenido" className="container-page py-8">
        {children}
      </main>
    </div>
  );
}
