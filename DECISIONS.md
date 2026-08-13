# Decisiones de arquitectura

Decisiones ya tomadas y por qué. Las que siguen abiertas están en
[`OPEN_DECISIONS.md`](./OPEN_DECISIONS.md).

---

## 1. Directorio, no marketplace

**Decisión.** El MVP lista comercios y manda al cliente a WhatsApp. No hay carrito, ni
checkout, ni máquina de estados de pedido, ni pagos.

**Por qué.** El problema difícil de este mercado no es el checkout: es la oferta. Sin comercios
listados no hay producto, y para listarlos hace falta un formulario y una pantalla de
aprobación — no una infraestructura transaccional. Los comercios ya tienen un canal de pedidos
que funciona y que sus clientes ya saben usar.

**Costo aceptado.** No vemos el pedido, así que no sabemos qué se vendió ni por cuánto. Lo que
sí medimos es el click de salida, y eso alcanza para decidir cuándo vale la pena construir el
pedido nativo.

**Cuándo se revisa.** Volumen sostenido de clicks a WhatsApp *y* tres comercios pidiendo
explícitamente recibir pedidos adentro de la plataforma.

---

## 2. Sin pagos, ni siquiera en modo manual

**Decisión.** Cero código de pagos. Ni tarjeta, ni Yappy, ni transferencia, ni "modo manual".

**Por qué.** Tocar dinero convierte al producto en merchant of record: liquidación, obligación
fiscal, disputas, PCI. Yappy además necesita convenio comercial con el banco, y ese trámite es
el camino crítico, no el código. Un adaptador de pagos "por las dudas" es todo el costo sin
ninguno de los beneficios.

**Cuándo se revisa.** Cuando exista un comercio dispuesto a cobrar en línea y estén resueltos
el convenio, el merchant of record y el modelo de liquidación. En ese orden.

---

## 3. Sin portal de comercio

**Decisión.** No hay login de comercio, ni staff, ni permisos por comercio. El admin edita
cualquier campo de cualquier comercio.

**Por qué.** A esta escala —decenas de comercios— los cambios llegan por WhatsApp y cargarlos
lleva minutos. Un portal implica un segundo sistema de auth, un modelo de permisos, una UI
paralela y un flujo de invitaciones: semanas de trabajo para ahorrar minutos por semana.

**Costo aceptado.** El admin es un cuello de botella conocido. Se nota solo cuando duele.

**Cuándo se revisa.** Cuando editar comercios a mano consuma más de un par de horas por semana.

---

## 4. Clientes sin cuentas

**Decisión.** Navegación como invitado. No hay registro, ni login, ni perfil.

**Por qué.** Una cuenta se justifica cuando guarda algo que el usuario quiere recuperar:
pedidos, direcciones, medios de pago. Nada de eso existe acá. Una cuenta sin contenido es
fricción pura, más una base de datos de personas que hay que proteger sin necesidad.

---

## 5. El motor de horarios no se recorta

**Decisión.** Es la única pieza técnicamente exigente que se construyó completa, con tests
propios verificados contra el calendario real.

**Por qué.** Si la app dice "abierto" un sábado a las 11 de la mañana, la comunidad deja de
confiar y no vuelve. No hay forma de recuperar eso con un parche. Es el único lugar donde un
bug cuesta la reputación del producto entero.

**Cómo.** `@hebcal/core` con las coordenadas de Ciudad de Panamá. Cada intervalo de cierre va
del encendido de velas a la havdalá siguiente, de modo que un jag de dos días o un jag pegado a
Shabat salen como un único intervalo continuo. Los offsets de cierre y reapertura son por
comercio.

**Implicancia.** El estado abierto/cerrado se calcula siempre en el servidor y ninguna página
que lo muestre se cachea (`dynamic = "force-dynamic"`).

---

## 6. Supervisión kosher: conservador por defecto

**Decisión.** El campo lo edita **solo** un administrador, con autoridad certificante, fecha de
verificación, vencimiento y documento adjunto. Si no hay verificación activa y vigente, la
página pública no muestra absolutamente nada sobre supervisión.

**Por qué.** Las tres alternativas son peores:

- *"Informado por el comercio"* traslada al usuario una decisión que no puede tomar, y en la
  práctica se lee como una afirmación.
- *Un badge negativo* ("sin supervisión verificada") acusa a comercios que quizás sí la tienen
  y todavía no la presentaron.
- *Inferirla de la categoría* es inventar.

El silencio es la única postura defendible: no afirma nada que no podamos respaldar.

**Implicancia.** Una supervisión vencida deja de mostrarse sola —`visibleSupervision()` compara
contra el vencimiento en cada render— y el admin recibe un aviso 30 días antes.

> ⚠️ Esta funcionalidad **no se lanza** hasta resolver la decisión abierta #1: qué autoridad
> valida y quién asume el riesgo de un badge equivocado. El directorio sí puede lanzarse antes.

---

## 7. Autenticación: magic link, un solo rol, sin middleware

**Decisión.** Auth.js con magic link, lista blanca de emails en `ADMIN_EMAILS`, un único rol.
El control de acceso vive en `requireAdmin()` y no en un middleware.

**Por qué el magic link.** No hay contraseñas que rotar, filtrar o resetear, y para dos o tres
administradores el flujo es más simple que cualquier alternativa.

**Por qué la lista blanca.** Es el control más chico que funciona. Un usuario fuera de la lista
no recibe enlace *y* no puede canjear uno, así que sacar a alguien es editar una variable de
entorno. El formulario de login responde lo mismo para un email autorizado que para uno que no
lo está: no sirve para descubrir quién es admin.

**Por qué no hay middleware.** La sesión vive en la base de datos y el runtime edge no puede
consultarla sin arrastrar Prisma. Un middleware que solo mirara la existencia de la cookie
daría una falsa sensación de seguridad. La frontera real es `requireAdmin()`, y la llama el
layout del panel, **cada** server action y **cada** route handler — nunca solo el layout.

---

## 8. Búsqueda: Postgres, con el texto normalizado en la escritura

**Decisión.** Full-text de Postgres sobre una columna `searchText` que se recalcula en cada
escritura, con el texto ya en minúsculas y sin acentos. Configuración `simple`, no `spanish`.

**Por qué no un motor externo.** Decenas de comercios. Un Algolia o un Elastic serían más
infraestructura que datos.

**Por qué normalizar al escribir.** Deja la búsqueda insensible a acentos sin depender de la
extensión `unaccent`, que no está garantizada en todos los Postgres gestionados. El mismo
`normalizeText()` se aplica a la consulta, así que las dos puntas hablan el mismo idioma.

**Por qué `simple` y no `spanish`.** El stemming en español agrupa mal los nombres propios, que
es justo lo que más se busca en un directorio de comercios. Se suma un `tsquery` con prefijo
por término para que "panad" encuentre "Panadería", y un `LIKE` de respaldo para coincidencias
en el medio de una palabra (con índice trigram).

---

## 9. Salidas externas por `/ir`, del lado del servidor

**Decisión.** Los clicks a WhatsApp, sitio del comercio y mapa pasan por `/ir`, que arma el
destino, registra el evento y redirige.

**Por qué.** Si el destino se armara en el cliente y el evento fuera un beacon, perderíamos
atribución con cada bloqueador y cada red lenta — y la atribución es la única señal que tenemos
para decidir la Fase 2. Del lado del servidor el registro es exacto, no hay doble conteo, y el
enlace funciona sin JavaScript.

**Excepción.** El botón de llamar enlaza directo al `tel:` y avisa por beacon: un 302 hacia
`tel:` no es confiable fuera del celular.

**Además.** `/ir` valida que el canal esté habilitado para ese comercio, así que una URL armada
a mano no abre un canal que el comercio no eligió.

---

## 10. Imágenes por URL, documentos por bucket privado

**Decisión.** Logos y portadas se cargan como URL. Los documentos de certificación se suben a
un bucket privado compatible con S3 y se sirven por una ruta que exige sesión de admin.

**Por qué la asimetría.** Un logo es público por definición: si el comercio ya lo tiene en su
sitio o su Instagram, pedirle un upload agrega un widget, un límite de tamaño y una superficie
de ataque para nada. Un certificado kosher puede llevar el nombre y la firma de un rabino, y no
va a un bucket público ni con una URL difícil de adivinar.

**Implicancia.** `/admin/documentos/[id]` verifica sesión antes de tocar el almacenamiento y
registra cada descarga en la auditoría: quién miró qué certificado y cuándo.

---

## 11. Emails: un proveedor, sin cola, sin reintentos

**Decisión.** Resend, tres emails (enlace de acceso, solicitud recibida, comercio aprobado) más
dos avisos internos. Sin outbox, sin reintentos, sin dead-letter.

**Por qué.** Un envío fallido acá significa que un comercio no se enteró de que fue aprobado, y
eso se resuelve con un WhatsApp. Toda la infraestructura de entrega garantizada existe para
casos donde el email *es* la transacción. Acá no lo es.

**Implicancia.** Ningún flujo de usuario se bloquea por un email: se envían fuera del camino
crítico y los fallos se loguean. En desarrollo, sin API key, el contenido se imprime en la
consola del servidor.

---

## 12. Zona de entrega en texto libre

**Decisión.** Un campo de texto. Sin radios, sin polígonos, sin geocodificación.

**Por qué.** "Punta Pacífica, Costa del Este y San Francisco" es más útil para una persona que
un polígono, y es lo que el comercio ya sabe decir. Los polígonos son ingeniería sin cliente
todavía: no hay ruteo, ni cálculo de tarifa, ni proveedor logístico que los consuma.

---

## 13. Sin reseñas, sin promociones, sin feature flags

**Reseñas.** Con pocos comercios, un rating de tres reseñas se ve peor que no tener rating, y
trae moderación, disputas y un vector de abuso entre competidores.

**Promociones y listados patrocinados.** No hay tráfico que monetizar todavía. Cuando lo haya,
el modelo de ingresos es una decisión de negocio abierta, no una feature.

**Feature flags y modo mantenimiento.** Complejidad operativa para un producto sin operación.
Un deploy tarda dos minutos.

---

## 14. Español solamente, en un módulo

**Decisión.** Sin capa de i18n. Todo el texto visible vive en `src/lib/copy.ts`.

**Por qué.** Una capa de i18n para un solo idioma es andamiaje. Pero ningún componente tiene
texto literal adentro, así que agregar inglés después es sumar un módulo hermano y un selector
— no un refactor.

---

## 15. Analítica propia, sin datos personales

**Decisión.** Eventos en nuestra propia tabla. Sin Google Analytics, sin cookies de
seguimiento, sin proveedor externo.

**Por qué.** Las preguntas que tenemos son pocas y concretas: qué se busca, qué se filtra, qué
comercios reciben clicks. Eso es un `groupBy`. Un proveedor externo traería un banner de
cookies, una política de privacidad más larga y datos de la comunidad en manos de un tercero, a
cambio de gráficos que no necesitamos.

**Implicancia.** Los eventos no guardan IP, ni user agent, ni identificador de usuario. Los
términos de búsqueda se guardan normalizados, para agrupar. Lo único que se hashea con sal es
el origen de una solicitud de alta, y solo para rate limiting.

---

## 16. Baja lógica en comercios

**Decisión.** `Merchant.deletedAt`. El resto de las tablas borra de verdad.

**Por qué.** Un comercio borrado por error se restaura; y sus métricas históricas siguen siendo
válidas para entender el tráfico pasado. Una categoría o un barrio, en cambio, no tienen
historia propia — y el panel se niega a borrarlos si algún comercio los usa.
