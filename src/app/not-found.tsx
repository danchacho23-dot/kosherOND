import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="contenido" className="container-page flex-1 py-16">
        <EmptyState
          title={copy.states.notFoundTitle}
          body={copy.states.notFoundBody}
          action={
            <Link href="/" className={buttonVariants()}>
              {copy.states.goHome}
            </Link>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
