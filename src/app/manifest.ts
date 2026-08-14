import type { MetadataRoute } from "next";
import { copy } from "@/lib/copy";

/**
 * Manifiesto para instalar el directorio como app en el celular.
 *
 * Android e iOS lo instalan desde el navegador: ícono en la pantalla de inicio,
 * ventana sin barra de direcciones. No es una app de las tiendas — para eso hay
 * que envolverla, ver DEPLOYMENT.md.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${copy.brand.name} — ${copy.brand.tagline}`,
    short_name: copy.brand.name,
    description: copy.brand.description,
    lang: "es-PA",
    dir: "ltr",
    start_url: "/",
    // El directorio es el destino real: si alguien instala esto, es para buscar
    // un comercio, no para leer la home.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f7",
    theme_color: "#0f7f68",
    categories: ["food", "shopping", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Abiertos ahora",
        short_name: "Abiertos",
        url: "/directorio?abierto=1",
      },
      {
        name: "Directorio completo",
        short_name: "Directorio",
        url: "/directorio",
      },
    ],
  };
}
