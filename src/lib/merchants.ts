import { Prisma, type DietTag, type OrderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/utils";
import { computeOpenState, type OpenState, type WeeklyRange } from "@/lib/hours/engine";

export interface DirectoryFilters {
  q?: string;
  category?: string;
  neighborhood?: string;
  openNow?: boolean;
  delivery?: boolean;
  pickup?: boolean;
  diet?: DietTag;
}

const merchantInclude = {
  category: { select: { id: true, slug: true, name: true, icon: true } },
  neighborhood: { select: { id: true, slug: true, name: true } },
  hours: { select: { dayOfWeek: true, opensAt: true, closesAt: true } },
  closures: {
    select: { startsAt: true, endsAt: true, reason: true },
  },
} satisfies Prisma.MerchantInclude;

export type MerchantWithRelations = Prisma.MerchantGetPayload<{
  include: typeof merchantInclude;
}>;

export type MerchantListItem = MerchantWithRelations & { openState: OpenState };

/**
 * Texto indexado para búsqueda. Se recalcula en cada escritura del comercio,
 * normalizado (minúsculas, sin acentos) para no depender de la extensión
 * `unaccent` de Postgres.
 */
export function buildSearchText(input: {
  name: string;
  legalName?: string | null;
  description?: string | null;
  tagline?: string | null;
  categoryName?: string | null;
  neighborhoodName?: string | null;
  tags?: string[];
}): string {
  return normalizeText(
    [
      input.name,
      input.legalName,
      input.tagline,
      input.description,
      input.categoryName,
      input.neighborhoodName,
      ...(input.tags ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Construye un `tsquery` con prefijo por término: "carn pana" → "carn:* & pana:*".
 * Los términos se reducen a alfanuméricos, así que no hay forma de inyectar
 * sintaxis de tsquery aunque el parámetro venga del querystring.
 */
function toPrefixTsQuery(raw: string): string | null {
  const terms = normalizeText(raw)
    .split(" ")
    .map((term) => term.replace(/[^a-z0-9]/g, ""))
    .filter((term) => term.length > 0)
    .slice(0, 6);
  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}

async function searchMerchantIds(query: string): Promise<string[] | null> {
  const tsQuery = toPrefixTsQuery(query);
  if (!tsQuery) return null;
  const like = `%${normalizeText(query)}%`;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Merchant"
    WHERE "status" = 'APPROVED'
      AND "deletedAt" IS NULL
      AND (
        to_tsvector('simple', "searchText") @@ to_tsquery('simple', ${tsQuery})
        OR "searchText" LIKE ${like}
      )
  `;
  return rows.map((row) => row.id);
}

function publishedWhere(filters: DirectoryFilters): Prisma.MerchantWhereInput {
  const where: Prisma.MerchantWhereInput = {
    status: "APPROVED",
    deletedAt: null,
  };
  if (filters.category) where.category = { slug: filters.category };
  if (filters.neighborhood) where.neighborhood = { slug: filters.neighborhood };
  if (filters.delivery) where.offersDelivery = true;
  if (filters.pickup) where.offersPickup = true;
  if (filters.diet) where.dietTag = filters.diet;
  return where;
}

/** Adjunta el estado abierto/cerrado, calculado en el servidor. */
export function attachOpenState(
  merchants: MerchantWithRelations[],
  now: Date = new Date(),
): MerchantListItem[] {
  return merchants.map((merchant) => ({
    ...merchant,
    openState: computeOpenState(
      {
        timezone: merchant.timezone,
        weeklyHours: merchant.hours as WeeklyRange[],
        closures: merchant.closures,
        observesShabbat: merchant.observesShabbat,
        shabbatCloseOffsetMinutes: merchant.shabbatCloseOffsetMinutes,
        havdalahReopenOffsetMinutes: merchant.havdalahReopenOffsetMinutes,
      },
      now,
    ),
  }));
}

export async function listPublishedMerchants(
  filters: DirectoryFilters = {},
  options: { limit?: number; now?: Date } = {},
): Promise<MerchantListItem[]> {
  const now = options.now ?? new Date();
  const where = publishedWhere(filters);

  if (filters.q?.trim()) {
    const ids = await searchMerchantIds(filters.q);
    if (ids === null) {
      // La consulta se quedó sin términos utilizables: se ignora el filtro.
    } else if (ids.length === 0) {
      return [];
    } else {
      where.id = { in: ids };
    }
  }

  const merchants = await prisma.merchant.findMany({
    where,
    include: {
      ...merchantInclude,
      // Solo los cierres que todavía pueden afectar el cálculo.
      closures: {
        select: { startsAt: true, endsAt: true, reason: true },
        where: { endsAt: { gte: now } },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { sortWeight: "desc" }, { name: "asc" }],
    take: options.limit,
  });

  const withState = attachOpenState(merchants, now);
  return filters.openNow ? withState.filter((m) => m.openState.isOpen) : withState;
}

const merchantDetailInclude = {
  ...merchantInclude,
  supervision: {
    include: {
      documents: { select: { id: true, fileName: true } },
    },
  },
  products: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
} satisfies Prisma.MerchantInclude;

export type MerchantDetail = Prisma.MerchantGetPayload<{
  include: typeof merchantDetailInclude;
}> & { openState: OpenState };

export async function getPublishedMerchantBySlug(
  slug: string,
  now: Date = new Date(),
): Promise<MerchantDetail | null> {
  const merchant = await prisma.merchant.findFirst({
    where: { slug, status: "APPROVED", deletedAt: null },
    include: merchantDetailInclude,
  });
  if (!merchant) return null;

  const openState = computeOpenState(
    {
      timezone: merchant.timezone,
      weeklyHours: merchant.hours as WeeklyRange[],
      closures: merchant.closures,
      observesShabbat: merchant.observesShabbat,
      shabbatCloseOffsetMinutes: merchant.shabbatCloseOffsetMinutes,
      havdalahReopenOffsetMinutes: merchant.havdalahReopenOffsetMinutes,
    },
    now,
  );

  return { ...merchant, openState };
}

/**
 * Supervisión visible: solo si un admin la verificó y no está vencida.
 * Sin fila activa y vigente, la página no dice absolutamente nada — ni un
 * badge negativo, ni "informado por el comercio". El silencio es la única
 * postura defendible.
 */
export function visibleSupervision(
  supervision: MerchantDetail["supervision"],
  now: Date = new Date(),
): NonNullable<MerchantDetail["supervision"]> | null {
  if (!supervision) return null;
  if (!supervision.isActive) return null;
  if (supervision.expiresAt && supervision.expiresAt.getTime() < now.getTime()) return null;
  return supervision;
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listNeighborhoods() {
  return prisma.neighborhood.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Categorías con cuántos comercios publicados tienen, para la home. */
export async function listCategoriesWithCounts() {
  const [categories, counts] = await Promise.all([
    listCategories(),
    prisma.merchant.groupBy({
      by: ["categoryId"],
      where: { status: "APPROVED", deletedAt: null },
      _count: { _all: true },
    }),
  ]);
  const countByCategory = new Map(counts.map((row) => [row.categoryId, row._count._all]));
  return categories
    .map((category) => ({ ...category, merchantCount: countByCategory.get(category.id) ?? 0 }))
    .filter((category) => category.merchantCount > 0);
}

export function hasChannel(merchant: { orderChannels: OrderChannel[] }, channel: OrderChannel) {
  return merchant.orderChannels.includes(channel);
}
