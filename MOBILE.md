# Llevar el directorio al celular

KosherOnDemand se construyó como **web app mobile-first**, no como app nativa. Este documento
explica qué hay hoy, qué opciones existen para estar en las tiendas, y cuál conviene.

---

## Qué hay hoy: instalable, sin tienda

El directorio es una **PWA**: se instala en Android y en iOS directamente desde el navegador.
Queda con ícono en la pantalla de inicio y abre en ventana propia, sin barra de direcciones.
Para el usuario se ve y se usa como una app.

- **Android (Chrome):** aparece solo el aviso “Instalar app”, o menú ⋮ → *Instalar aplicación*.
- **iOS (Safari):** botón Compartir → *Agregar a pantalla de inicio*. iOS no muestra aviso
  automático: hay que decirle a la gente que se puede.

Incluye ícono adaptable, accesos directos (“Abiertos ahora”, “Directorio”), color de barra de
estado y una pantalla de *sin conexión*.

### Qué NO cachea, a propósito

El service worker **nunca** guarda una navegación en caché. Todo el producto se apoya en decir
la verdad sobre quién está abierto, y ese estado lo calcula el servidor en cada request. Un HTML
servido desde caché podría decir “abierto” un sábado — justo el error que no se puede cometer.

Sin red, en vez de contenido viejo se muestra una pantalla que dice que no hay conexión. Lo
único que se cachea son los assets con hash inmutable de `/_next/static/`.

---

## Las tres formas de llegar a las tiendas

| | PWA (hoy) | Envoltorio (Capacitor / TWA) | Nativa (React Native) |
|---|---|---|---|
| En App Store / Play Store | No | Sí | Sí |
| Trabajo desde hoy | Hecho | ~1 semana + trámites | 2–4 meses |
| Costo de cuentas | — | US$99/año Apple + US$25 Google | igual |
| Reescribir la UI | No | No | **Sí, entera** |
| SEO (Google) | Intacto | Intacto | Se pierde salvo mantener la web aparte |
| Push notifications | Android sí; iOS 16.4+ solo si está instalada | Sí | Sí |
| Riesgo de rechazo en review | — | **Alto en Apple** (ver abajo) | Bajo |

### El riesgo que hay que mirar antes de gastar

La guía **4.2 de Apple (Minimum Functionality)** rechaza apps que son básicamente un sitio web
reempaquetado. Un directorio que lista comercios y abre WhatsApp es exactamente el caso que esa
regla apunta: no hay funcionalidad que justifique una app instalada en vez de una web.

No es una barrera insalvable, pero para pasar review normalmente hay que sumar algo que solo una
app puede dar. Lo natural para este producto:

- **Notificaciones push** — “tu carnicería abre en una hora”, “cierre por jag este jueves”.
- **Favoritos sincronizados** — hoy los favoritos son `localStorage`, sin cuenta.
- **Recordatorios de Shabat** — el motor de horarios ya sabe cuándo cierra cada comercio; avisar
  antes del encendido de velas es una función genuinamente útil, y muy difícil de dar en web en
  iOS.

Google Play es bastante más permisivo: una **TWA** (Trusted Web Activity) publica la PWA tal cual
y suele pasar sin problema.

---

## La recomendación

**Ahora:** quedarse con la PWA y decirle a la gente cómo instalarla. No cuesta nada, funciona en
los dos sistemas hoy, y mantiene intacto el SEO — que para este producto es el canal principal:
alguien va a googlear “carnicería kosher Panamá” mucho antes de conocer la marca. Una app en la
tienda no aparece en esa búsqueda.

**Cuando haya tracción:** si la comunidad pide app de tienda, el camino barato es
**Play Store con TWA** primero (bajo riesgo, misma base de código), y recién después iOS con
Capacitor — sumando push de Shabat, que además de destrabar el review es la función que más se
va a usar.

**Nativa completa:** solo si el producto cambia de naturaleza — pedidos adentro de la
plataforma, pagos, seguimiento en vivo. Es la Fase 3 del plan original, y nada de eso está
decidido todavía (ver `OPEN_DECISIONS.md`).

> Ojo con el orden: envolver la web en una app **no** la hace más rápida ni más confiable. Si el
> objetivo es que se sienta como app, la PWA ya lo da. Si el objetivo es estar en la tienda,
> conviene tener claro qué se gana — y que la tienda es un canal de distribución, no una mejora
> del producto.

---

## Si se decide ir a las tiendas

Nada de esto pide reescribir la app. El orden que menos plata quema:

1. **Desplegar la web en un dominio propio con HTTPS.** Es requisito de las dos rutas.
2. **Play Store (TWA).** Bubblewrap o PWABuilder generan el proyecto Android desde el manifiesto
   que ya existe. Hace falta `assetlinks.json` en el dominio para que la app abra sin barra de
   navegador.
3. **App Store (Capacitor).** Requiere una Mac con Xcode — no se puede compilar ni firmar iOS
   desde Linux. Antes de mandarlo a review, sumar push de Shabat.
4. **Cuentas de desarrollador.** Apple US$99/año, Google US$25 una vez. La verificación de Apple
   para cuentas de organización pide documentación de la sociedad y tarda.

El ícono, el nombre corto, los colores y los accesos directos que piden las dos rutas ya están
resueltos en `src/app/manifest.ts` y en `public/`.
