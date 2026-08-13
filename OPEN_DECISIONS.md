# Decisiones abiertas

Ninguna de estas se resuelve escribiendo código. Están acá para que no se resuelvan por
omisión.

Las decisiones ya tomadas están en [`DECISIONS.md`](./DECISIONS.md).

---

## 1. Autoridad de supervisión kosher 🔴 bloquea funcionalidad

**Qué hay que decidir.** Qué autoridad valida la supervisión kosher de un comercio, cómo se
verifica una certificación, cada cuánto se revalida, y **quién asume el riesgo** si el badge
queda mal puesto.

**Por qué no lo resuelve el código.** El código ya está: un admin carga autoridad, fecha,
vencimiento y documento; sin eso la página no dice nada. Lo que falta es la política. Un badge
de supervisión es una afirmación religiosa con consecuencias reales para quien la lee, y no la
puede emitir un formulario.

**Qué bloquea.** El lanzamiento de la funcionalidad de supervisión. **No** bloquea el
lanzamiento del directorio: si nadie carga supervisiones, ninguna página muestra nada al
respecto y el producto funciona igual.

**Qué hay que dejar cerrado antes de encender esto:**

- La o las autoridades aceptadas, por nombre.
- Qué documento se considera prueba suficiente (¿certificado firmado? ¿carta? ¿listado
  público?).
- Quién verifica: una persona nombrada, no "el equipo".
- Cada cuánto se revalida. Hoy el aviso automático sale 30 días antes del vencimiento.
- Qué se hace ante una impugnación, y en cuánto tiempo.
- Qué dicen los términos sobre el alcance de la verificación. El borrador actual ya aclara que
  es administrativa y no un aval rabínico — hay que confirmarlo con quien corresponda.

**Estado.** Abierta.

---

## 2. Alta de comercios: opt-in u opt-out

**Qué hay que decidir.** ¿Se lista un comercio antes de que aplique, usando sus datos públicos?

**Las dos posturas.**

- *Opt-in* (solo quien aplica): más lento, catálogo pobre al arranque, cero fricción de
  relación. Un directorio con seis comercios no le sirve a nadie, y sin utilidad no hay tráfico
  que convenza al séptimo de sumarse.
- *Opt-out* (listar y avisar): el catálogo queda completo desde el día uno, que es lo que hace
  útil a un directorio. Pero un comercio puede sentir que se usó su nombre sin permiso, y en
  una comunidad chica ese costo se paga en persona.

**Por qué no lo resuelve el código.** Los dos caminos ya están soportados: el admin puede crear
un comercio en estado borrador sin que nadie haya aplicado, y publicarlo cuando corresponda.
Elegir es una decisión de comunidad.

**Si se elige opt-out, hace falta además.** Un aviso previo a cada comercio, una vía de baja
inmediata y visible, y no mostrar nada más que datos ya públicos. La baja lógica de comercios
ya está implementada para que sacar uno sea instantáneo.

**Qué bloquea.** Nada técnico. Define la velocidad a la que se llena el catálogo.

**Estado.** Abierta. Es la decisión con más impacto sobre si el producto arranca o no.

---

## 3. Modelo de ingresos

**Qué hay que decidir.** Suscripción de comercio, listados destacados pagos, comisión sobre
pedidos, o nada por ahora.

**Por qué no urge.** No cambia una línea del MVP: no hay tráfico que monetizar todavía. Pero sí
cambia qué se construye en la Fase 2 — una comisión obliga a ver el pedido (y por lo tanto a
construir pedido nativo y pagos), mientras que una suscripción o los destacados no.

**Lo que ya existe y no hay que confundir con monetización.** El campo `isFeatured` ordena la
home por criterio editorial, no comercial. Si algún día se vende, hay que separarlo en dos
conceptos y etiquetar el contenido pago como tal.

**Estado.** Abierta. Conviene decidirla antes de arrancar la Fase 2, no antes de lanzar.

---

## 4. Términos y privacidad

**Qué hay que decidir.** La redacción final, con un abogado panameño.

**Qué hay hoy.** Borradores en `/legal/terminos` y `/legal/privacidad`, marcados como borrador
en la propia página y excluidos de indexación. Cubren lo que el producto realmente hace: que no
vendemos, no cobramos, no entregamos, no garantizamos disponibilidad, y qué medimos.

**Qué falta revisar sí o sí.**

- El alcance de la verificación de supervisión kosher (atado a la decisión #1).
- El tratamiento de datos personales de los comercios bajo la ley panameña.
- Qué pasa con los datos de una solicitud rechazada: cuánto se guardan y con qué fin.
- Si se elige opt-out en la decisión #2, la base legal para publicar datos de un comercio que
  no aplicó.

**Qué bloquea.** El lanzamiento público. Es requisito de los gates de lanzamiento.

**Estado.** Abierta.

---

## 5. Convenio Yappy Comercial

**Qué hay que decidir.** Si se inicia el trámite ahora.

**Por qué está acá aunque no haya pagos en el MVP.** El tiempo de aprobación del convenio es el
camino crítico de la Fase 3, no el código. Si los pagos van en serio, conviene arrancar el
trámite mucho antes de escribir la primera línea.

**Qué no hay que hacer mientras tanto.** Ninguna línea de código de pagos. Ni un adaptador
"por las dudas", ni un modo manual, ni un campo de precio pensado para cobrar. Ver
`DECISIONS.md` #2.

**Qué hay que tener resuelto además del convenio.** Quién es el merchant of record, cómo se
liquida a cada comercio, y quién responde por una disputa.

**Estado.** Abierta. Es una decisión de calendario comercial, no de producto.
