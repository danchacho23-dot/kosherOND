# Llevar el directorio al celular

KosherOnDemand se construyó como **web app mobile-first**. Este documento explica qué hay hoy,
y los pasos concretos para publicarla en Play Store y en App Store.

> **Lo que no se pudo hacer desde acá.** Los proyectos nativos no se compilaron ni se firmaron:
> el entorno donde se desarrolló esto es Linux sin Android SDK y sin Xcode. iOS **solo** se puede
> compilar en una Mac. Todo lo de este documento a partir de "Play Store" son pasos verificados
> contra la documentación oficial, no ejecutados.

---

## Qué hay hoy

### Instalable sin tienda (PWA)

Se instala en Android y en iOS desde el navegador: ícono en la pantalla de inicio, ventana
propia sin barra de direcciones.

- **Android (Chrome):** aparece el aviso “Instalar app”, o menú ⋮ → *Instalar aplicación*.
- **iOS (Safari):** Compartir → *Agregar a pantalla de inicio*. iOS no avisa solo.

Incluye ícono adaptable, accesos directos (“Abiertos ahora”, “Directorio”), color de barra de
estado y pantalla de sin conexión.

### Avisos de cierre por Shabat

Es la pieza que convierte esto en algo que una web sola no puede hacer, y **la que destraba el
review de Apple** (ver más abajo).

- El usuario activa los avisos desde la home. Sin cuenta.
- Un cron horario mira el próximo encendido de velas con el mismo calendario que calcula el
  estado abierto/cerrado, y avisa con el anticipo que cada uno eligió (2 horas por defecto).
- La ventana **se cierra en el encendido**: un aviso que llega tarde es peor que ninguno,
  porque el comercio ya cerró y el cliente pierde el viaje.
- Cada cierre se avisa una sola vez. Las suscripciones muertas se borran solas.

Configuración: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Generá el par con
`npx web-push generate-vapid-keys`. Sin esas variables, el bloque de avisos no aparece y el
resto del producto funciona igual.

> En iPhone los avisos funcionan **solo con la app instalada** en la pantalla de inicio
> (iOS 16.4+). La interfaz lo detecta y lo explica en vez de ofrecer un botón que no haría nada.

### Qué NO cachea, a propósito

El service worker **nunca** guarda una navegación en caché. Todo el producto se apoya en decir
la verdad sobre quién está abierto, y ese estado lo calcula el servidor en cada request. Un HTML
servido desde caché podría decir “abierto” un sábado. Sin red se muestra una pantalla que lo
dice, en vez de contenido viejo. Solo se cachean los assets con hash inmutable.

---

## El problema de fondo con envolver esto en una app

Next.js con render en servidor **no se puede empaquetar como archivos estáticos** dentro de la
app: cada página se arma en el servidor en el momento del request, justo para que el estado
abierto/cerrado sea verdadero. Eso significa que la app de tienda va a ser un contenedor que
carga el sitio desplegado (`server.url` en Capacitor).

Y eso es exactamente el patrón que apunta la **guía 4.2 de Apple (Minimum Functionality)**: una
app que es un sitio web reempaquetado se rechaza.

Lo que lo vuelve defendible es que la app haga algo que la web no puede. Por eso los avisos de
Shabat se construyeron primero: no son un extra, son el argumento del review. Cuando presentes
la app, mostrá esa función en el video de revisión y explicala en las notas.

Google Play es bastante más permisivo. Una **TWA** publica la PWA tal cual y suele pasar sin
problema.

---

## Orden recomendado

**El paso 0 es desplegar el sitio.** Las dos tiendas lo necesitan: la app carga contenido desde
tu dominio, y sin HTTPS propio no arranca ninguna de las dos rutas. Ver `DEPLOYMENT.md`.

### 1. Play Store (TWA) — bajo riesgo, primero

Una TWA es Chrome sin barra corriendo tu PWA a pantalla completa. No hay código propio.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://TU-DOMINIO/manifest.webmanifest
bubblewrap build            # genera el .aab firmado
```

Bubblewrap toma el nombre, los íconos y los colores del manifiesto que ya existe.

**Falta un paso que no se puede saltear:** para que la app abra sin barra de navegador, el
dominio tiene que declarar que confía en la app. Publicá en
`https://TU-DOMINIO/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.kosherondemand.app",
    "sha256_cert_fingerprints": ["EL:SHA:256:DE:TU:KEYSTORE"]
  }
}]
```

El fingerprint sale de tu keystore de firma (`bubblewrap` lo imprime, o
`keytool -list -v -keystore ...`). **Ese keystore es un secreto y no se puede perder**: sin él
no se puede volver a publicar una actualización de la app, nunca. Guardalo fuera del repo.

En Next.js, serví ese archivo poniéndolo en `public/.well-known/assetlinks.json`.

Costo: US$25 una vez.

### 2. App Store (Capacitor) — después, y con los avisos ya andando

Necesita una Mac con Xcode. Costo: US$99 al año, y la verificación de cuenta de organización de
Apple pide documentación de la sociedad y tarda.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/push-notifications
npx cap init KosherOnDemand com.kosherondemand.app
```

`capacitor.config.ts`, apuntando al sitio desplegado:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kosherondemand.app",
  appName: "KosherOnDemand",
  webDir: "public",              // no se usa: el contenido viene de server.url
  server: {
    url: "https://TU-DOMINIO",
    cleartext: false,
  },
  ios: { contentInset: "always" },
};

export default config;
```

```bash
npx cap add ios
npx cap open ios               # compila y firma desde Xcode
```

**Antes de mandarlo a review:**

- Los avisos de Shabat tienen que estar funcionando. En iOS nativo no alcanza Web Push: hay que
  registrar el dispositivo con APNs a través de `@capacitor/push-notifications` y guardar ese
  token igual que hoy se guarda la suscripción web. El modelo `PushSubscription` y el cron ya
  existen; falta el adaptador de APNs y sumar una columna para distinguir el tipo de token.
- Grabá un video de revisión mostrando el aviso llegando. Es lo que responde a la 4.2.
- En las notas del review, explicá que la app avisa antes del cierre por Shabat y jaguim usando
  el calendario hebreo y las coordenadas de Panamá — una función que depende del dispositivo.

**Universal Links** (que un link a un comercio abra la app y no Safari) necesita publicar
`https://TU-DOMINIO/.well-known/apple-app-site-association`, sin extensión y servido como
`application/json`.

---

## Qué falta construir para la app de iOS

Lo único que no está hecho es el puente a APNs, y es acotado:

1. Columna en `PushSubscription` para el tipo (`web` | `apns`) y para el token nativo.
2. Un envío alternativo en `src/lib/push/send.ts` que hable con APNs cuando el token es nativo.
3. En el cliente Capacitor, registrar el dispositivo y mandar el token al mismo endpoint
   `/api/push/suscribir`.

Toda la lógica de *cuándo* avisar —la parte difícil, la que toca el calendario hebreo— ya está
resuelta y testeada en `src/lib/push/reminders.ts`, y no cambia.

---

## Costos y tiempos, sin vueltas

| | Play Store | App Store |
|---|---|---|
| Cuenta | US$25 una vez | US$99 al año |
| Hace falta Mac | No | **Sí** |
| Trabajo pendiente | Deploy + assetlinks | Deploy + APNs + build en Xcode |
| Riesgo de rechazo | Bajo | Medio, incluso con los avisos |
| Revisión inicial | Horas a días | Días, más la verificación de cuenta |

Recordá que la tienda es un canal de distribución, no una mejora del producto: envolver la web
no la hace más rápida ni más confiable. Y el SEO —que para este directorio es el canal
principal, porque la gente googlea “carnicería kosher Panamá” antes de conocer la marca— vive en
la web, no en la app.
