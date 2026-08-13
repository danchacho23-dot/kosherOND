import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/ir` son salidas atribuidas, no contenido. `/admin` y `/api` no
        // tienen nada que indexar.
        disallow: ["/admin", "/api/", "/ir"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
