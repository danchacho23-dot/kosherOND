import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Store, Truck } from "lucide-react";
import { Alert, Badge, Card, CardContent } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { OpenBadge } from "@/components/open-badge";
import { OrderActions } from "@/components/order-actions";
import { copy } from "@/lib/copy";
import { siteUrl } from "@/lib/env";
import { formatPrice, formatPhoneDisplay, toInternationalPhone } from "@/lib/utils";
import { buildWeeklySchedule } from "@/lib/hours/engine";
import { recordEventAsync } from "@/lib/analytics";
import { getPublishedMerchantBySlug, visibleSupervision } from "@/lib/merchants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await getPublishedMerchantBySlug(slug);
  if (!merchant) return { title: copy.merchant.notFoundTitle };

  const description =
    merchant.tagline ??
    merchant.description?.slice(0, 155) ??
    `${merchant.category.name} kosher en ${merchant.neighborhood.name}, Ciudad de Panamá.`;

  return {
    title: merchant.name,
    description,
    alternates: { canonical: `/comercio/${merchant.slug}` },
    openGraph: {
      type: "website",
      title: `${merchant.name} — ${merchant.category.name} kosher en Panamá`,
      description,
      url: `${siteUrl()}/comercio/${merchant.slug}`,
      images: merchant.coverUrl ? [{ url: merchant.coverUrl }] : undefined,
      locale: "es_PA",
    },
    twitter: {
      card: merchant.coverUrl ? "summary_large_image" : "summary",
      title: merchant.name,
      description,
    },
  };
}

export default async function MerchantPage({ params }: PageProps) {
  const { slug } = await params;
  const now = new Date();
  const merchant = await getPublishedMerchantBySlug(slug, now);
  if (!merchant) notFound();

  recordEventAsync({
    type: "MERCHANT_VIEW",
    merchantId: merchant.id,
    path: `/comercio/${merchant.slug}`,
  });

  const supervision = visibleSupervision(merchant.supervision, now);
  const schedule = buildWeeklySchedule(merchant.hours, now, merchant.timezone);
  const phoneHref = merchant.orderChannels.includes("PHONE")
    ? `tel:+${toInternationalPhone(merchant.phone)}`
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD generado desde datos ya validados; no incluye supervisión
        // salvo que un admin la haya verificado.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(merchant, supervision)) }}
      />

      <div className="relative aspect-[16/7] w-full bg-ink-200 sm:aspect-[21/7]">
        {merchant.coverUrl ? (
          <Image
            src={merchant.coverUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-400" aria-hidden="true">
            <Store className="size-10" />
          </div>
        )}
      </div>

      <div className="container-page pb-12">
        <div className="-mt-8 flex items-end gap-4">
          {merchant.logoUrl ? (
            <Image
              src={merchant.logoUrl}
              alt=""
              width={80}
              height={80}
              className="size-20 rounded-xl border-4 border-ink-50 bg-white object-cover"
            />
          ) : null}
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-8">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">{merchant.category.name}</Badge>
                {merchant.dietTag ? (
                  <Badge variant="outline">{copy.diet[merchant.dietTag]}</Badge>
                ) : null}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
                {merchant.name}
              </h1>
              {merchant.tagline ? (
                <p className="mt-1 text-ink-600">{merchant.tagline}</p>
              ) : null}
              <div className="mt-3">
                <OpenBadge state={merchant.openState} withDetail />
              </div>
            </header>

            {merchant.description ? (
              <section aria-labelledby="sobre-titulo">
                <h2 id="sobre-titulo" className="text-lg font-semibold text-ink-900">
                  {copy.merchant.aboutTitle}
                </h2>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-700">
                  {merchant.description}
                </p>
              </section>
            ) : null}

            {/*
              Supervisión kosher: se muestra SOLO si un admin la verificó y está
              vigente. Sin eso, esta sección no existe — ni badge negativo, ni
              "informado por el comercio". El silencio es la única postura
              defendible.
            */}
            {supervision ? (
              <section aria-labelledby="supervision-titulo">
                <h2 id="supervision-titulo" className="text-lg font-semibold text-ink-900">
                  {copy.merchant.supervisionTitle}
                </h2>
                <Card className="mt-2 border-brand-200 bg-brand-50">
                  <CardContent className="flex gap-3 pt-5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                    <div className="text-sm">
                      <p className="font-medium text-ink-900">
                        {copy.merchant.supervisionAuthority}: {supervision.authority}
                      </p>
                      <p className="mt-1 text-ink-600">
                        {copy.merchant.supervisionVerified}{" "}
                        <time dateTime={supervision.verifiedAt.toISOString()}>
                          {formatDate(supervision.verifiedAt)}
                        </time>
                        {supervision.expiresAt ? (
                          <>
                            {" · "}
                            {copy.merchant.supervisionExpires}{" "}
                            <time dateTime={supervision.expiresAt.toISOString()}>
                              {formatDate(supervision.expiresAt)}
                            </time>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : null}

            <section aria-labelledby="horarios-titulo">
              <h2 id="horarios-titulo" className="text-lg font-semibold text-ink-900">
                {copy.merchant.hoursTitle}
              </h2>
              {merchant.hours.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">{copy.hours.noSchedule}</p>
              ) : (
                <>
                  <table className="mt-2 w-full max-w-sm text-sm">
                    <caption className="sr-only">
                      Horario semanal de {merchant.name}
                    </caption>
                    <tbody>
                      {schedule.map((day) => (
                        <tr key={day.dayOfWeek} className="border-b border-ink-100 last:border-0">
                          <th
                            scope="row"
                            className={`py-2 text-left font-normal ${
                              day.isToday ? "font-semibold text-ink-900" : "text-ink-600"
                            }`}
                          >
                            {day.dayLabel}
                            {day.isToday ? (
                              <span className="ml-1.5 text-xs text-brand-700">
                                ({copy.hours.today.toLowerCase()})
                              </span>
                            ) : null}
                          </th>
                          <td className="py-2 text-right text-ink-700">
                            {day.isClosed
                              ? copy.hours.closedToday
                              : day.ranges
                                  .map((range) => `${range.opensAt}–${range.closesAt}`)
                                  .join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {merchant.observesShabbat ? (
                    <p className="mt-3 text-xs leading-relaxed text-ink-500">
                      Este comercio cierra por Shabat y jaguim. El horario de arriba ya
                      contempla esos cierres en el estado de “abierto ahora”.
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section aria-labelledby="ubicacion-titulo">
              <h2 id="ubicacion-titulo" className="text-lg font-semibold text-ink-900">
                {copy.merchant.locationTitle}
              </h2>
              <p className="mt-2 flex items-start gap-2 text-ink-700">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  {merchant.addressLine}
                  <span className="block text-sm text-ink-500">
                    {merchant.neighborhood.name}, Ciudad de Panamá
                  </span>
                  {merchant.addressNote ? (
                    <span className="block text-sm text-ink-500">{merchant.addressNote}</span>
                  ) : null}
                </span>
              </p>

              <h3 className="mt-5 text-sm font-semibold text-ink-900">
                {copy.merchant.deliveryTitle}
              </h3>
              <p className="mt-1 flex items-start gap-2 text-sm text-ink-700">
                <Truck className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  {merchant.offersDelivery
                    ? (merchant.deliveryAreaText ?? copy.merchant.deliveryNone)
                    : copy.merchant.pickupOnly}
                </span>
              </p>
            </section>

            {merchant.products.length > 0 ? (
              <section aria-labelledby="catalogo-titulo">
                <h2 id="catalogo-titulo" className="text-lg font-semibold text-ink-900">
                  {copy.merchant.catalogTitle}
                </h2>
                <p className="mt-1 text-xs text-ink-500">{copy.merchant.catalogNote}</p>
                <ul className="mt-3 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
                  {merchant.products.map((product) => (
                    <li key={product.id} className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{product.name}</p>
                        {product.description ? (
                          <p className="mt-0.5 text-sm text-ink-500">{product.description}</p>
                        ) : null}
                        {product.dietTag ? (
                          <Badge variant="outline" className="mt-1.5">
                            {copy.diet[product.dietTag]}
                          </Badge>
                        ) : null}
                      </div>
                      {product.priceCents !== null ? (
                        <span className="shrink-0 text-sm font-medium text-ink-900">
                          {formatPrice(product.priceCents)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="pt-5">
                <h2 className="text-base font-semibold text-ink-900">
                  {copy.order.sectionTitle}
                </h2>
                <p className="mt-1 mb-4 text-sm text-ink-600">{copy.order.leavingTitle}.</p>
                <OrderActions
                  merchantId={merchant.id}
                  merchantPublicId={merchant.publicId}
                  merchantSlug={merchant.slug}
                  channels={merchant.orderChannels}
                  phoneHref={phoneHref}
                />
                {merchant.orderChannels.includes("PHONE") ? (
                  <p className="mt-3 text-xs text-ink-500">
                    {formatPhoneDisplay(merchant.phone)}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <div className="mt-4">
              <Link
                href="/directorio"
                className={buttonVariants({ variant: "ghost", size: "sm", block: true })}
              >
                {copy.merchant.backToDirectory}
              </Link>
            </div>
          </aside>
        </div>

        <div className="mt-10">
          <Alert>{copy.legal.disclaimerBody}</Alert>
        </div>
      </div>
    </>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Panama",
  }).format(date);
}

type MerchantForJsonLd = NonNullable<Awaited<ReturnType<typeof getPublishedMerchantBySlug>>>;

function buildJsonLd(
  merchant: MerchantForJsonLd,
  supervision: ReturnType<typeof visibleSupervision>,
) {
  const openingHours = merchant.hours.map((range) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][range.dayOfWeek],
    opens: minutesToIso(range.opensAt),
    closes: minutesToIso(range.closesAt),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: merchant.name,
    description: merchant.description ?? merchant.tagline ?? undefined,
    url: `${siteUrl()}/comercio/${merchant.slug}`,
    telephone: `+${toInternationalPhone(merchant.phone)}`,
    image: merchant.coverUrl ?? merchant.logoUrl ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: merchant.addressLine,
      addressLocality: merchant.neighborhood.name,
      addressRegion: "Panamá",
      addressCountry: "PA",
    },
    geo:
      merchant.latitude !== null && merchant.longitude !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: merchant.latitude,
            longitude: merchant.longitude,
          }
        : undefined,
    openingHoursSpecification: openingHours,
    // Solo se declara "kosher" cuando hay verificación de admin respaldada.
    servesCuisine: supervision ? "Kosher" : undefined,
  };
}

function minutesToIso(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(normalized / 60)).padStart(2, "0");
  const m = String(normalized % 60).padStart(2, "0");
  return `${h}:${m}`;
}
