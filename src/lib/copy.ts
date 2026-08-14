/**
 * Todo el copy visible vive acá. Español solamente en el MVP.
 * Cuando entre el inglés se agrega un módulo hermano y un selector — sin refactor
 * de componentes, porque ninguno tiene texto literal adentro.
 */

export const copy = {
  brand: {
    name: "KosherOnDemand",
    tagline: "El directorio kosher de Panamá",
    description:
      "Encontrá comercios kosher en Ciudad de Panamá: carnicerías, panaderías, restaurantes y más. Horarios reales, con cierre por Shabat y jaguim.",
  },

  nav: {
    home: "Inicio",
    directory: "Directorio",
    apply: "Sumá tu comercio",
    about: "Qué es esto",
    admin: "Panel",
    skipToContent: "Saltar al contenido",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
  },

  home: {
    heroTitle: "Comercios kosher en Panamá",
    heroSubtitle:
      "Buscá por categoría o barrio, mirá quién está abierto ahora y seguí tu pedido directamente con el comercio.",
    searchPlaceholder: "Buscar carnicería, panadería, barrio…",
    searchAction: "Buscar",
    openNowTitle: "Abiertos ahora",
    openNowEmpty:
      "Ningún comercio está abierto en este momento. Mirá el directorio completo para ver los horarios.",
    featuredTitle: "Destacados",
    categoriesTitle: "Categorías",
    seeAll: "Ver todos",
    seeDirectory: "Ver el directorio completo",
    disclaimer:
      "KosherOnDemand es un directorio. No vendemos, no entregamos y no cobramos: el pedido y el pago se hacen directamente con cada comercio.",
  },

  directory: {
    title: "Directorio",
    subtitle: "Todos los comercios kosher publicados.",
    resultsCount: (n: number) =>
      n === 1 ? "1 comercio" : `${n} comercios`,
    empty: "No encontramos comercios con esos filtros.",
    emptyHint: "Probá quitar algún filtro o buscar con otra palabra.",
    clearFilters: "Limpiar filtros",
    filters: "Filtros",
    applyFilters: "Aplicar",
    filterCategory: "Categoría",
    filterNeighborhood: "Barrio",
    filterOpenNow: "Abierto ahora",
    filterDelivery: "Con delivery",
    filterPickup: "Con retiro",
    filterDiet: "Tipo",
    allCategories: "Todas las categorías",
    allNeighborhoods: "Todos los barrios",
    allDiets: "Todos",
    searchLabel: "Buscar comercios",
    loading: "Cargando comercios…",
    error: "No pudimos cargar el directorio.",
    retry: "Reintentar",
  },

  merchant: {
    aboutTitle: "Sobre el comercio",
    catalogTitle: "Catálogo",
    catalogNote:
      "Catálogo informativo. Confirmá precios y disponibilidad con el comercio.",
    hoursTitle: "Horarios",
    locationTitle: "Ubicación",
    deliveryTitle: "Entrega",
    deliveryNone: "Este comercio no informó zona de entrega.",
    pickupOnly: "Solo retiro en local",
    supervisionTitle: "Supervisión kosher",
    supervisionAuthority: "Autoridad",
    supervisionVerified: "Verificado por KosherOnDemand el",
    supervisionExpires: "Vigente hasta",
    notFoundTitle: "No encontramos este comercio",
    notFoundBody:
      "Puede que haya cambiado de dirección web o que ya no esté publicado.",
    backToDirectory: "Volver al directorio",
    shareLabel: "Compartir",
    seeProducts: (n: number) => `Ver ${n} productos`,
  },

  hours: {
    openNow: "Abierto ahora",
    closedNow: "Cerrado",
    closesAt: (time: string) => `Cierra a las ${time}`,
    opensAt: (label: string) => `Abre ${label}`,
    closedForShabbat: "Cerrado por Shabat",
    closedForHoliday: (name: string) => `Cerrado por ${name}`,
    closedTemporarily: "Cerrado temporalmente",
    closedToday: "Cerrado hoy",
    noSchedule: "Este comercio no informó horarios.",
    reopens: (label: string) => `Reabre ${label}`,
    days: [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ] as const,
    daysShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const,
    today: "Hoy",
    tomorrow: "Mañana",
  },

  order: {
    sectionTitle: "Continuar el pedido",
    whatsapp: "Pedir por WhatsApp",
    website: "Ir al sitio del comercio",
    phone: "Llamar",
    pickup: "Cómo llegar",
    leavingTitle: "Vas a continuar tu pedido directamente con el comercio",
    leavingBody:
      "KosherOnDemand no procesa el pedido ni el pago. Precios, disponibilidad y entrega los define y los cumple el comercio.",
    leavingConfirm: "Continuar",
    leavingCancel: "Volver",
    whatsappGreeting: (merchantName: string) =>
      `Hola ${merchantName}, los encontré en KosherOnDemand. Quisiera hacer un pedido.`,
    noChannels: "Este comercio no informó cómo recibir pedidos.",
  },

  diet: {
    MEAT: "Carne",
    DAIRY: "Lácteo",
    PAREVE: "Pareve",
    MIXED: "Carne y lácteo",
  } as const,

  channel: {
    WHATSAPP: "WhatsApp",
    WEBSITE: "Sitio web",
    PHONE: "Teléfono",
    PICKUP: "Retiro en local",
  } as const,

  /**
   * Etiquetas de los canales cuando se eligen en un formulario. Son distintas
   * a `channel` a propósito: ahí conviven con los campos "Teléfono" y
   * "WhatsApp", y dos controles con el mismo nombre accesible dentro del mismo
   * formulario son ambiguos para un lector de pantalla.
   */
  channelChoice: {
    WHATSAPP: "Recibo pedidos por WhatsApp",
    WEBSITE: "Recibo pedidos por mi sitio web",
    PHONE: "Recibo pedidos por llamada",
    PICKUP: "El cliente retira en el local",
  } as const,

  apply: {
    title: "Sumá tu comercio al directorio",
    subtitle:
      "Completá el formulario y lo revisamos a mano. No cobramos por estar listado y no tocamos tus ventas: el cliente te escribe directo.",
    sectionBusiness: "El comercio",
    sectionContact: "Contacto",
    sectionLocation: "Ubicación y entrega",
    sectionOrders: "Cómo recibís pedidos",
    sectionHours: "Horarios",
    submit: "Enviar solicitud",
    submitting: "Enviando…",
    successTitle: "Recibimos tu solicitud",
    successBody:
      "Te escribimos al email que dejaste cuando la revisemos. Si necesitamos algo más, te contactamos por WhatsApp.",
    successCode: "Código de seguimiento",
    backHome: "Volver al inicio",
    errorGeneric:
      "No pudimos enviar tu solicitud. Revisá los campos marcados e intentá de nuevo.",
    errorRateLimit:
      "Recibimos varias solicitudes desde esta conexión. Esperá unos minutos e intentá de nuevo.",
    consent:
      "Confirmo que represento a este comercio y autorizo a KosherOnDemand a publicar estos datos.",
    consentRequired: "Necesitamos tu confirmación para publicar el comercio.",
    supervisionNote:
      "La supervisión kosher no se carga acá. La verificamos aparte, con la documentación correspondiente.",
    fields: {
      legalName: "Razón social",
      legalNameHint: "El nombre con el que está inscrito el comercio.",
      name: "Nombre público",
      nameHint: "Como querés que aparezca en el directorio.",
      contactName: "Responsable",
      phone: "Teléfono",
      whatsappPhone: "WhatsApp",
      whatsappHint: "Si es el mismo que el teléfono, repetilo.",
      email: "Email",
      category: "Categoría",
      neighborhood: "Barrio",
      addressLine: "Dirección",
      description: "Descripción",
      descriptionHint: "Dos o tres líneas sobre qué vendés.",
      dietTag: "Tipo de comercio",
      offersDelivery: "Hago delivery",
      offersPickup: "Se puede retirar en el local",
      deliveryAreaText: "Zona de entrega",
      deliveryAreaHint: "En tus palabras. Ej: “Punta Pacífica, Costa del Este y San Francisco”.",
      orderChannels: "Canales de pedido",
      websiteUrl: "Sitio web",
      logoUrl: "Logo (URL)",
      coverUrl: "Foto de portada (URL)",
      hours: "Horario semanal",
      hoursHint:
        "Dejá el día vacío si no abrís. El cierre por Shabat y jaguim lo calculamos nosotros.",
      opensAt: "Abre",
      closesAt: "Cierra",
      addRange: "Agregar turno",
      removeRange: "Quitar",
    },
  },

  reminders: {
    title: "Avisos antes de Shabat",
    body: "Te avisamos un par de horas antes del encendido de velas, así llegás a comprar. Nada más: no mandamos promociones.",
    onTitle: "Avisos activados",
    onBody: "Te vamos a avisar antes de cada Shabat y de cada jag.",
    turnOn: "Activar avisos",
    turningOn: "Activando…",
    turnOff: "Desactivar",
    blocked:
      "Bloqueaste las notificaciones para este sitio. Se activan de nuevo desde la configuración del navegador.",
    iosInstall:
      "En iPhone los avisos funcionan solo con la app instalada: tocá Compartir y después “Agregar a pantalla de inicio”.",
  },

  legal: {
    termsTitle: "Términos de uso",
    privacyTitle: "Política de privacidad",
    disclaimerTitle: "Aviso importante",
    disclaimerBody:
      "KosherOnDemand es un directorio informativo. No vendemos productos, no procesamos pagos, no entregamos pedidos y no garantizamos disponibilidad, precios ni supervisión kosher. Cada comercio es responsable de la información que publica y de lo que vende.",
    draftNotice:
      "Documento en borrador, pendiente de revisión legal antes del lanzamiento.",
  },

  footer: {
    rights: "Directorio comunitario sin fines comerciales.",
    terms: "Términos",
    privacy: "Privacidad",
    contact: "Contacto",
    apply: "Sumá tu comercio",
  },

  states: {
    loading: "Cargando…",
    errorTitle: "Algo salió mal",
    errorBody: "Intentá de nuevo en un momento.",
    retry: "Reintentar",
    notFoundTitle: "Página no encontrada",
    notFoundBody: "El enlace puede estar viejo o mal escrito.",
    goHome: "Ir al inicio",
  },

  admin: {
    title: "Panel",
    signInTitle: "Entrar al panel",
    signInBody:
      "Te mandamos un enlace de acceso al email. Solo funciona para cuentas autorizadas.",
    signInAction: "Enviar enlace",
    signInSent:
      "Si el email está autorizado, va a llegar un enlace de acceso en menos de un minuto.",
    signInDenied: "Esta cuenta no tiene acceso al panel.",
    signOut: "Salir",
    nav: {
      dashboard: "Resumen",
      applications: "Solicitudes",
      merchants: "Comercios",
      categories: "Categorías",
      neighborhoods: "Barrios",
      supervision: "Supervisión",
      analytics: "Métricas",
      log: "Auditoría",
    },
    common: {
      save: "Guardar",
      saving: "Guardando…",
      saved: "Guardado",
      cancel: "Cancelar",
      create: "Crear",
      edit: "Editar",
      delete: "Eliminar",
      confirm: "Confirmar",
      search: "Buscar",
      none: "—",
      required: "Obligatorio",
      empty: "No hay nada acá todavía.",
    },
  },
} as const;

export type Copy = typeof copy;
