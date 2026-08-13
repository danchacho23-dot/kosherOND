import { Skeleton } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export default function MerchantLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{copy.states.loading}</span>
      <Skeleton className="aspect-[16/7] w-full rounded-none sm:aspect-[21/7]" />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full max-w-sm" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
