"use client";

import { useEffect } from "react";

/**
 * Registra el service worker, que es lo que hace instalable el directorio en
 * Android. En iOS "Agregar a inicio" funciona igual sin esto.
 *
 * Solo en producción: en desarrollo un service worker sirviendo assets viejos
 * confunde más de lo que ayuda.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("[sw] no se pudo registrar", error);
      });
    };

    // Después del load: registrar el SW no debe competir por ancho de banda
    // con la primera pintura.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
