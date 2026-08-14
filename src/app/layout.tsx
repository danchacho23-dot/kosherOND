import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker";
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: copy.brand.name,
    // La barra de estado se pinta sobre el fondo del header.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f7f68",
  width: "device-width",
  initialScale: 1,
  // Instalada, la app tiene que cubrir el notch como cualquier app nativa.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PA">
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only-focusable">
          {copy.nav.skipToContent}
        </a>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
