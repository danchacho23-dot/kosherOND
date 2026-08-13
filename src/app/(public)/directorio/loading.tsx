import { Skeleton } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export default function DirectoryLoading() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">{copy.directory.loading}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <Skeleton className="mt-5 h-12 max-w-xl" />
      <Skeleton className="mt-4 h-10 w-full max-w-md rounded-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
