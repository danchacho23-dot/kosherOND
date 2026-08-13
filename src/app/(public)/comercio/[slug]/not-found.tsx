import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function MerchantNotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        title={copy.merchant.notFoundTitle}
        body={copy.merchant.notFoundBody}
        action={
          <Link href="/directorio" className={buttonVariants()}>
            {copy.merchant.backToDirectory}
          </Link>
        }
      />
    </div>
  );
}
