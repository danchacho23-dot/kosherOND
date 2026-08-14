# KosherOnDemand

El directorio kosher de Panamá. Funciona bien en el celular, dice la verdad sobre quién está
abierto, y manda al cliente al comercio por WhatsApp.

**Todo el dinero se mueve fuera de la plataforma.** KosherOnDemand no es vendedor, no cobra y
no entrega.

---

## Qué es esto, exactamente

Un directorio, no un marketplace. Tres decisiones lo definen:

1. **No hay carrito ni checkout.** Los comercios ya venden por WhatsApp y eso funciona. El
   producto los lista y manda el cliente para allá con un mensaje prellenado.
2. **No hay portal de comercio.** Con decenas de comercios, los cambios llegan por WhatsApp y
   los carga un admin. El portal se construye cuando esa carga manual sea el cuello de botella.
3. **La supervisión kosher solo la carga un admin, con documento.** Sin verificación, la página
   pública no dice *nada* sobre supervisión — ni un badge negativo, ni "informado por el
   comercio". El silencio es la única postura defendible.

**Es una web app, no una app nativa.** Se instala en el celular desde el navegador y se ve como
una app, pero no está en App Store ni en Play Store. Las opciones para llegar ahí, con costos y
riesgos, están en [`MOBILE.md`](./MOBILE.md).

Lo que queda afuera del MVP y por qué está en [`DECISIONS.md`](./DECISIONS.md). Lo que todavía
no se decidió está en [`OPEN_DECISIONS.md`](./OPEN_DECISIONS.md) — y hay una decisión abierta
que **bloquea el lanzamiento de la funcionalidad de supervisión**.

---

## Stack

| Pieza | Elección |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4, componentes propios estilo shadcn |
| Base de datos | PostgreSQL (Neon o Supabase) + Prisma con migraciones |
| Auth | Auth.js v5, magic link, **solo administradores** |
| Calendario hebreo | `@hebcal/core` |
| Email | Resend (proveedor único, sin cola) |
| Documentos privados | Bucket S3-compatible (Cloudflare R2) vía `aws4fetch` |
| Validación | Zod en todo borde de entrada externa |
| Tests | Vitest (unitarios) + Playwright (3 e2e) |
| Deploy | Vercel |
| Móvil | PWA instalable + avisos de Shabat por Web Push — ver [`MOBILE.md`](./MOBILE.md) |

Sin adaptadores de pago. Sin colas. Sin capa de proveedores para WhatsApp: un deep link no
necesita adaptador.

---

## Arranque local

```bash
# 1. Dependencias
npm install

# 2. Entorno
cp .env.example .env.local     # completá DATABASE_URL, AUTH_SECRET y ADMIN_EMAILS

# 3. Base de datos
npm run db:migrate             # aplica migraciones y genera el cliente
npm run db:seed                # datos de demostración, todos marcados como seed

# 4. A andar
npm run dev
```

- Público: http://localhost:3000
- Panel: http://localhost:3000/admin

**Entrar al panel en desarrollo:** poné tu email en `ADMIN_EMAILS`, pedí el enlace en
`/admin/login`, y copiá de la consola del servidor el link que se imprime (sin
`RESEND_API_KEY` los emails no se envían, se loguean).

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (corre `prisma generate` antes) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run check:env` | Revisa que el entorno esté completo y coherente |
| `npm test` | Unitarios (motor de horarios y control de acceso) |
| `npm run test:e2e` | Los tres e2e. **Borra la base de `DATABASE_URL`** |
| `npm run db:migrate` | Migraciones en desarrollo |
| `npm run db:deploy` | Migraciones en producción |
| `npm run db:seed` | Datos de demostración |
| `npm run db:seed:clear` | **Borra los datos ficticios.** Gate de lanzamiento |
| `npx web-push generate-vapid-keys` | Claves para los avisos de Shabat |

---

## Cómo está armado

```
prisma/
  schema.prisma            12 tablas de dominio + 4 de Auth.js
  migrations/              init + índices de búsqueda full-text
  seed.ts / clear-seed.ts  datos de demo, todos con isSeedData
src/
  app/
    (public)/              home, directorio, ficha de comercio, alta, legales
    admin/
      login/               fuera del layout protegido, obviamente
      (panel)/             todo lo demás, detrás de requireAdmin()
      documentos/[id]/     descarga de certificados con sesión
    ir/                    salida atribuida hacia el comercio
    api/                   auth, eventos de cliente, cron de vencimientos
  components/              UI pública y del panel
  lib/
    hours/                 motor de horarios — timezone, hebcal, engine
    admin/                 guard, auditoría, server actions
    email/                 mailer + plantillas
    copy.ts                TODO el texto visible, en un solo módulo
    merchants.ts           consultas del directorio y búsqueda full-text
tests/
  unit/                    37 tests: horarios y control de acceso
  e2e/                     3 flujos
```

### El motor de horarios

Es la única pieza técnicamente exigente que no se recortó. Vive en `src/lib/hours/`.

- El horario semanal se guarda en minutos desde medianoche, con varias filas por día para
  turnos partidos. Un cierre menor o igual a la apertura significa que cruza la medianoche.
- Los cierres por Shabat y jaguim se calculan con `@hebcal/core` sobre las coordenadas de
  Ciudad de Panamá (8.98 N, 79.52 O). Cada intervalo va del encendido de velas a la havdalá
  siguiente, así que **un jag de dos días, o un jag pegado a Shabat, sale como un solo
  intervalo continuo** — que es cómo lo vive el comercio.
- Cada comercio ajusta `shabbatCloseOffsetMinutes` (minutos antes de las velas) y
  `havdalahReopenOffsetMinutes`.
- El estado abierto/cerrado se calcula **siempre en el servidor**: el reloj y la zona horaria
  del visitante no entran en la cuenta.
- Panamá no tiene horario de verano, pero las conversiones usan `Intl` igual, para que un
  comercio en otra zona no rompa el cálculo.

Los tests en `tests/unit/hours-engine.test.ts` están verificados contra el calendario real de
2026: Shabat, Rosh Hashaná (viernes a domingo), Sucot cayendo en Shabat, jol hamoed y Janucá.
Si tocás este módulo, esos tests son el contrato.

### Búsqueda

Postgres full-text, sin motor externo. `Merchant.searchText` guarda nombre, razón social,
descripción, categoría, barrio y tags, todo normalizado a minúsculas y sin acentos — así
"carniceria" encuentra "Carnicería" sin depender de la extensión `unaccent`. La consulta arma
un `tsquery` con prefijo por término (`carn:* & pana:*`) y suma un `LIKE` de respaldo para
coincidencias en el medio de una palabra.

### Salidas hacia el comercio

Todo click externo pasa por `/ir?m=<publicId>&c=<canal>`, que arma el destino en el servidor,
registra el evento y redirige. Eso hace que la atribución no dependa de que el JS haya cargado
y evita el doble conteo. El deep link de WhatsApp incluye el nombre del comercio y un
identificador corto de origen; las URLs externas llevan `utm_source=kosherondemand`.

La única excepción es el botón de llamar: un 302 hacia `tel:` no es confiable fuera del
celular, así que enlaza directo y avisa por beacon.

---

## Antes de lanzar

Los gates están en [`DEPLOYMENT.md`](./DEPLOYMENT.md#gates-de-lanzamiento). El más fácil de
olvidar:

```bash
npm run db:seed:clear
```

El panel muestra una alerta roja mientras quede un solo comercio de seed publicado.

---

## Cuándo construir la Fase 2

No por calendario, por evidencia. Los números están en `/admin/metricas`.

- **Portal de comercio** — cuando editar comercios a mano consuma más de un par de horas por
  semana.
- **Pedido nativo** — cuando haya volumen sostenido de clicks a WhatsApp *y* al menos tres
  comercios pidiendo explícitamente recibir pedidos adentro. Empezá con esos tres.
- **Pagos** — cuando exista un comercio dispuesto a cobrar en línea *y* estén resueltos el
  convenio de Yappy, el merchant of record y el modelo de liquidación. Ninguna línea de código
  de pagos antes de eso.
