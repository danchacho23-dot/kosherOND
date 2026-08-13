import Link from "next/link";
import Image from "next/image";
import { MapPin, Truck, Store } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { OpenBadge } from "@/components/open-badge";
import { copy } from "@/lib/copy";
import type { MerchantListItem } from "@/lib/merchants";

export function MerchantCard({ merchant }: { merchant: MerchantListItem }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white transition-shadow hover:shadow-[0_4px_16px_rgba(26,23,19,0.08)]">
      <div className="relative aspect-[16/9] w-full bg-ink-100">
        {merchant.coverUrl ? (
          <Image
            src={merchant.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-300" aria-hidden="true">
            <Store className="size-8" />
          </div>
        )}
        {merchant.logoUrl ? (
          <Image
            src={merchant.logoUrl}
            alt=""
            width={48}
            height={48}
            className="absolute bottom-2 left-3 size-12 rounded-lg border-2 border-white bg-white object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-ink-900">
            <Link href={`/comercio/${merchant.slug}`} className="after:absolute after:inset-0">
              {merchant.name}
            </Link>
          </h3>
        </div>

        <OpenBadge state={merchant.openState} />

        {merchant.tagline ? (
          <p className="line-clamp-2 text-sm text-ink-600">{merchant.tagline}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {merchant.neighborhood.name}
          </span>
          <span>{merchant.category.name}</span>
          {merchant.offersDelivery ? (
            <span className="inline-flex items-center gap-1">
              <Truck className="size-3.5" aria-hidden="true" />
              Delivery
            </span>
          ) : null}
        </div>

        {merchant.dietTag ? (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{copy.diet[merchant.dietTag]}</Badge>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function MerchantCardGrid({ merchants }: { merchants: MerchantListItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {merchants.map((merchant) => (
        <MerchantCard key={merchant.id} merchant={merchant} />
      ))}
    </div>
  );
}
