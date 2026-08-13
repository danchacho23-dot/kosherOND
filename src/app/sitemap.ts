import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/directorio`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/aplicar`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const merchants = await prisma.merchant.findMany({
      where: { status: "APPROVED", deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return [
      ...staticRoutes,
      ...merchants.map((merchant) => ({
        url: `${base}/comercio/${merchant.slug}`,
        lastModified: merchant.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // Sin base de datos disponible el sitemap sigue sirviendo las rutas fijas.
    return staticRoutes;
  }
}
