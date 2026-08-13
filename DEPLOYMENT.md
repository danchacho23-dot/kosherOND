# Deploy

Next.js en Vercel, Postgres gestionado (Neon o Supabase), bucket privado S3-compatible
(Cloudflare R2) para los documentos de certificación.

---

## 1. Base de datos

Creá una base en Neon o Supabase y guardá la cadena de conexión.

- **Neon:** usá la connection string *pooled* y agregá `?sslmode=require`.
- **Supabase:** usá el *connection pooler* en modo transaction (puerto 6543) y agregá
  `?pgbouncer=true&connection_limit=1`.

Las migraciones se aplican con:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Corré esto **antes** del primer deploy y después de cada cambio de esquema. `npm run build`
ejecuta `prisma generate`, no `migrate deploy`: aplicar migraciones automáticamente en el build
es una forma conocida de romper producción con un deploy a medias.

Hay dos migraciones:

1. `init_mvp_fase_1` — todo el esquema.
2. `search_indexes` — índice GIN de full-text, extensión `pg_trgm` e índice trigram. Si el
   proveedor no permite `CREATE EXTENSION`, activá `pg_trgm` desde su panel y volvé a correr la
   migración; la búsqueda funciona igual sin el índice trigram, solo más lenta.

---

## 2. Almacenamiento de documentos (Cloudflare R2)

Solo hace falta para los documentos de supervisión kosher. El panel avisa si no está
configurado y el resto del producto funciona sin esto.

1. Creá un bucket en R2. **No** le habilites acceso público ni dominio público.
2. Creá un API token con permiso de lectura y escritura sobre ese bucket.
3. Cargá `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.

> El bucket tiene que ser privado. La única forma de leer un documento es
> `/admin/documentos/[id]`, que exige sesión de admin y deja registro de la descarga. Si el
> bucket queda público, ese control no sirve para nada.

---

## 3. Email (Resend)

1. Verificá tu dominio en Resend.
2. Cargá `RESEND_API_KEY` y `EMAIL_FROM` con una dirección de ese dominio.
3. Cargá `ADMIN_NOTIFICATION_EMAIL` para los avisos internos.

Sin `RESEND_API_KEY` en producción, los emails **no se envían** y queda un error en los logs.
El enlace de acceso al panel es uno de esos emails: sin esto, nadie entra.

---

## 4. Vercel

Importá el repo y cargá las variables de entorno de `.env.example`. Mínimo indispensable:

| Variable | Obligatoria | Nota |
|---|---|---|
| `DATABASE_URL` | Sí | |
| `AUTH_SECRET` | Sí | `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Sí | Separados por coma. Es el control de acceso completo |
| `NEXT_PUBLIC_SITE_URL` | Sí en producción | URL canónica, sin barra final |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sí para operar | Sin esto no hay login |
| `ADMIN_NOTIFICATION_EMAIL` | Recomendada | Avisos de solicitudes y vencimientos |
| `S3_*` | Solo para documentos | |
| `CRON_SECRET` | Recomendada | Protege el cron de vencimientos |

`AUTH_URL` no hace falta en Vercel: el host se detecta solo.

### Cron de vencimientos de supervisión

Ya está declarado en `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/supervisiones", "schedule": "0 13 * * *" }]
}
```

`0 13 * * *` UTC son las 8 de la mañana en Panamá. Vercel manda `Authorization: Bearer
$CRON_SECRET`, que el endpoint verifica. Cada supervisión se avisa una sola vez por
vencimiento.

---

## 5. Después del primer deploy

Antes de nada, verificá que el entorno esté completo:

```bash
npm run check:env
```

Sale con código 1 si falta algo que impide operar, y avisa de lo que está incompleto pero no
bloquea.

```bash
# 1. Migraciones
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# 2. Entrar al panel: /admin/login con un email de ADMIN_EMAILS.

# 3. Cargar categorías y barrios ANTES que comercios.
#    Un comercio no se puede crear sin ambas cosas.
```

No corras el seed en producción. Es de desarrollo y crea comercios que no existen.

---

## Gates de lanzamiento

No lances sin haber marcado todo esto.

### Contenido

- [ ] `npm run db:seed:clear` corrió contra producción y no queda ningún dato ficticio. El
      resumen del panel muestra una alerta roja mientras quede uno. El script borra los
      comercios inventados y la taxonomía que quedó sin usar; una categoría o un barrio que
      ya tenga comercios reales se conserva y deja de figurar como dato de demostración.
- [ ] Cada comercio publicado dio su consentimiento — o se resolvió la decisión abierta #2
      (opt-in vs opt-out) y se siguió el procedimiento acordado.
- [ ] Ninguna afirmación de certificación sin verificación de admin respaldada por documento.

### Horarios

- [ ] `npm test` en verde. Los tests del motor están verificados contra el calendario real.
- [ ] Verificado **a mano** contra el calendario: un viernes por la tarde antes del encendido de
      velas, un sábado a las 11 de la mañana, y un jag de dos días. La app tiene que decir
      "cerrado" y mostrar la hora de reapertura correcta.
- [ ] Cada comercio tiene cargado su `shabbatCloseOffsetMinutes` real. El default de 90 minutos
      es una suposición, no un dato.

### Enlaces

- [ ] Cada deep link de WhatsApp probado **en un celular real**, no en el simulador: que abra
      la conversación correcta con el mensaje prellenado.
- [ ] Cada URL externa probada, con `utm_source=kosherondemand` llegando al destino.
- [ ] Los botones de llamar abren el discador con el número correcto.

### Legal

- [ ] Términos y privacidad revisados por un abogado panameño, y sin el cartel de borrador.
- [ ] El descargo de que no vendemos, no entregamos y no garantizamos disponibilidad ni
      supervisión está visible en la home y en cada ficha de comercio.

### Seguridad

- [ ] `/admin` redirige al login sin sesión. Probalo con `curl -I`.
- [ ] `/admin/documentos/<id>` devuelve 401 sin sesión.
- [ ] El bucket de certificaciones es privado: una URL directa al objeto no se abre.
- [ ] `ADMIN_EMAILS` tiene solo las personas que corresponden, hoy.
- [ ] `AUTH_SECRET` es único de producción y no se comparte con desarrollo.
- [ ] No hay secretos en el repo: `git log -p | grep -iE "(api[_-]?key|secret|password)"` limpio.
- [ ] El formulario público tiene rate limiting activo (3 solicitudes por hora por origen, en
      memoria y en base).

### Verificación post-deploy

```bash
SITE=https://tu-dominio.com

curl -s -o /dev/null -w "%{http_code}\n" $SITE/                      # 200
curl -s -o /dev/null -w "%{http_code}\n" $SITE/directorio            # 200
curl -s -o /dev/null -w "%{http_code}\n" $SITE/admin/documentos/x    # 401
curl -s -I $SITE/admin | grep -i location                            # /admin/login
curl -s $SITE/robots.txt                                             # Disallow: /admin
curl -s $SITE/sitemap.xml | head                                     # incluye los comercios
```

---

## Correr los tests

```bash
npm test            # unitarios: motor de horarios y control de acceso. No necesita base.
npm run typecheck

# e2e: necesita una base Postgres REAL y la BORRA en cada corrida.
DATABASE_URL="postgresql://.../kosherond_test" npm run build
DATABASE_URL="postgresql://.../kosherond_test" \
AUTH_SECRET="lo-que-sea-de-16-o-mas" \
ADMIN_EMAILS="admin.e2e@kosherondemand.test" \
npm run test:e2e
```

Nunca apuntes los e2e a la base de producción: el `globalSetup` borra todas las tablas antes de
sembrar.

Si ya tenés un Chromium instalado, evitá que Playwright se baje el suyo con
`PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chromium`.

---

## Operación diaria

- **Solicitudes nuevas.** Llegan por email a `ADMIN_NOTIFICATION_EMAIL` y quedan en
  `/admin/solicitudes`. Aprobar crea y publica el comercio, y le manda el email de aprobación.
- **Cambios de un comercio.** Llegan por WhatsApp; los carga el admin en
  `/admin/comercios/[id]`. No hay portal de comercio a propósito (ver `DECISIONS.md` #3).
- **Supervisión por vencer.** Aviso automático 30 días antes. Una supervisión vencida deja de
  mostrarse sola.
- **Cerrar un comercio temporalmente.** Cargá un cierre puntual en su ficha. No borres el
  horario semanal.
- **Bajar un comercio.** "Suspender" lo saca del directorio y se puede revertir. "Eliminar" es
  baja lógica: también reversible, y las métricas quedan.

---

## Rollback

Vercel: promové el deploy anterior desde el dashboard.

Base de datos: **no** hay rollback automático de migraciones. Ante un cambio de esquema
riesgoso, tomá un backup antes (Neon tiene branching; Supabase, point-in-time recovery).
