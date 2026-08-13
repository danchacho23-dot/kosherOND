import type { Metadata, Viewport } from "next";
import { copy } from "@/lib/copy";
import { siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${copy.brand.name} — ${copy.brand.tagline}`,
    template: `%s · ${copy.brand.name}`,
  },
  description: copy.brand.description,
  applicationName: copy.brand.name,
  openGraph: {
    type: "website",
    locale: "es_PA",
    siteName: copy.brand.name,
    title: `${copy.brand.name} — ${copy.brand.tagline}`,
    description: copy.brand.description,
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${copy.brand.name} — ${copy.brand.tagline}`,
    description: copy.brand.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#0f7f68",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PA">
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only-focusable">
          {copy.nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
