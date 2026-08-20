/**
 * src/lib/advisorOnboarding.js
 *
 * Preguntas y opciones de los pasos 3 a 8 del Onboarding
 * (`OnboardingFlow.jsx`): la radiografía del asesor que arranca. Viven en su
 * propio módulo, sin JSX, por la misma razón que `experienceLevels.js`: se
 * puede ajustar el texto de una pregunta, reordenar una opción o añadir una
 * cuarta, sin tocar el componente que las dibuja.
 *
 * El Paso 2 (etapa profesional) no está aquí: sigue viviendo en
 * `experienceLevels.js` porque además de alimentar `advisorProfileData`
 * escribe la columna `experience_level`, la señal que ya usan `Gate`
 * (`App.jsx`) y `SessionContext.jsx` para decidir si a alguien sin aprobar
 * le toca el Onboarding o la sala de espera directa. Un archivo separado
 * para ese paso evita que tocar el resto del cuestionario arrastre, sin
 * querer, ese contrato.
 *
 * Cada `value` es lo que viaja dentro de `advisorProfileData` — el objeto
 * estructurado que se guarda al terminar el Paso 8, pensado para calibrar en
 * el futuro las notificaciones y tareas diarias (por ejemplo, dosificar
 * prospección según el tamaño de mercado declarado aquí, o respetar las
 * horas exactas marcadas en el Paso 7). No cambia aunque el texto del botón
 * se reformule, para no dejar radiografías antiguas con un valor que ya no
 * corresponde a nada visible en pantalla.
 */

/** Paso 3 — Fortaleza declarada al arrancar el negocio (perfil "Nuevo Asesor" o "Consolidado"). */
export const STRENGTH_OPTIONS = [
  { value: 'people', label: 'Facilidad para conectar con la gente' },
  { value: 'discipline', label: 'Disciplina y constancia' },
  { value: 'analytics', label: 'Habilidad para analizar datos complejos' },
];

/** Paso 4 — Lo que más inquieta o impone en la etapa inicial (perfil "Nuevo Asesor" o "Consolidado"). */
export const CONCERN_OPTIONS = [
  { value: 'rejection', label: 'El miedo al rechazo o a contactar conocidos' },
  { value: 'technical', label: 'Falta de dominio técnico o qué decir' },
  { value: 'organization', label: 'La falta de organización en mi día a día' },
  { value: 'none', label: 'Por el momento, ninguna' },
];

/** Paso 5 — Termómetro de mercado natural (perfil "Nuevo Asesor" o "Consolidado"). */
export const MARKET_OPTIONS = [
  { value: 'under_20', label: 'A menos de 20' },
  { value: 'between_20_50', label: 'Entre 20 y 50' },
  { value: 'over_50', label: 'A más de 50' },
];

/*
  Ramificación por perfil (Paso 2, `EXPERIENCE_LEVELS`): quien ya eligió
  "Nuevo Profesional" (`value === 'new_professional'`) contesta los mismos
  tres pasos —fortaleza, inquietud, mercado— pero con preguntas y opciones
  distintas, adaptadas a alguien que ya superó el arranque y busca
  estructurar lo que ya tiene, no construirlo desde cero. La respuesta se
  guarda en los mismos campos de `advisorData` (`fortaleza`, `inquietud`,
  `mercado`): no hay columnas nuevas ni una segunda forma del dato, sólo un
  segundo cuestionario que escribe en el mismo sitio. `OnboardingFlow.jsx`
  es quien decide cuál de los dos mostrar, comparando `advisorData.perfil`
  — este módulo sólo declara las preguntas y opciones de cada rama.
*/

/** Paso 3 (perfil "Nuevo Profesional") — área donde necesita construir más estructura hoy. */
export const PROFESSIONAL_FOCUS_OPTIONS = [
  { value: 'prospecting', label: 'Generación constante de prospectos.' },
  { value: 'systematize_followup', label: 'Sistematizar mi seguimiento y cierres.' },
  { value: 'time_shield', label: 'Organización y blindaje de mi tiempo.' },
];

/** Paso 4 (perfil "Nuevo Profesional") — el "cuello de botella" que impide duplicar productividad. */
export const PROFESSIONAL_BOTTLENECK_OPTIONS = [
  { value: 'admin_overload', label: 'Me consume la carga administrativa y el servicio.' },
  {
    value: 'low_ticket_market',
    label: 'Trabajo con un mercado de bajo perfil o primas pequeñas.',
  },
  { value: 'referral_dependent', label: 'Dependo de referidos; no prospecto activamente.' },
  { value: 'none_scale', label: 'Por el momento, ninguno. Solo busco escalar.' },
];

/** Paso 5 (perfil "Nuevo Profesional") — tamaño de la cartera activa. */
export const PORTFOLIO_SIZE_OPTIONS = [
  { value: 'under_50', label: 'Menos de 50 clientes.' },
  { value: 'between_50_150', label: 'Entre 50 y 150 clientes.' },
  { value: 'over_150', label: 'Más de 150 clientes.' },
];

/*
  Ramificación por perfil "Consolidado" (`value === 'established'` en
  `EXPERIENCE_LEVELS`, `experienceLevels.js`): quien ya tiene una cartera
  madura no contesta ni el cuestionario de arranque ("Nuevo Asesor") ni el
  de estructuración ("Nuevo Profesional") — sus Pasos 4 a 9 hablan de
  proteger lo que ya construyó, no de construirlo. Igual criterio que la
  rama "Nuevo Profesional": mismas claves de `advisorData` (`fortaleza`,
  `inquietud`, `mercado`, `disponibilidad`, `motor`), preguntas y opciones
  propias. `OnboardingFlow.jsx` decide cuál de las tres ramas mostrar
  comparando `advisorData.perfil` — este módulo sólo declara las
  preguntas y opciones.
*/

/** Paso 4 (perfil "Consolidado") — la ventaja competitiva que distingue a un asesor veterano. */
export const CONSOLIDATED_STRENGTH_OPTIONS = [
  { value: 'deep_relationships', label: 'Relaciones profundas y alta retención de clientes.' },
  { value: 'high_level_closing', label: 'Efectividad en cierres de alto nivel.' },
  { value: 'referral_reputation', label: 'Generación constante de referidos por reputación.' },
];

/** Paso 5 (perfil "Consolidado") — el área que más consume tiempo o energía hoy, candidata a automatizarse. */
export const CONSOLIDATED_BOTTLENECK_OPTIONS = [
  { value: 'admin_claims', label: 'La carga administrativa, trámites y siniestros.' },
  { value: 'collection_renewals', label: 'El control de cobranza y renovaciones.' },
  { value: 'prospect_followup', label: 'El seguimiento de prospectos y agendamiento.' },
  { value: 'none_scale_tools', label: 'Por ahora ninguna, solo busco herramientas de escala.' },
];

/** Paso 6 (perfil "Consolidado") — tamaño de la cartera activa, en un rango mayor que las otras dos ramas. */
export const CONSOLIDATED_PORTFOLIO_OPTIONS = [
  { value: 'between_100_300', label: 'Entre 100 y 300 clientes.' },
  { value: 'between_300_500', label: 'Entre 300 y 500 clientes.' },
  { value: 'over_500', label: 'Más de 500 clientes.' },
];

/** Paso 7 (perfil "Consolidado") — cómo distribuye su enfoque operativo, distinto de "tiempo completo/medio tiempo" del resto. */
export const CONSOLIDATED_FOCUS_SPLIT_OPTIONS = [
  { value: 'full_sales', label: '100% enfocado en ventas y crecimiento.' },
  {
    value: 'split_team',
    label: 'Divido mi tiempo entre ventas y administrar mi equipo/despacho.',
  },
];

/** Paso 9 (perfil "Consolidado") — meta principal al integrar la inteligencia de la app a su proceso. */
export const CONSOLIDATED_MOTIVATION_OPTIONS = [
  { value: 'scale_summits', label: 'Escalar mis ventas y calificar a cumbres (MDRT, Convenciones).' },
  {
    value: 'optimize_time',
    label: 'Optimizar mi tiempo (mantener o subir ingresos, trabajando menos).',
  },
  {
    value: 'maximize_portfolio',
    label: 'Maximizar la rentabilidad de mi cartera (retención y venta cruzada).',
  },
];

/** Paso 6 — Disponibilidad de tiempo para el negocio. */
export const AVAILABILITY_OPTIONS = [
  { value: 'full_time', label: 'Tiempo completo. Mi enfoque principal está aquí.' },
  { value: 'part_time', label: 'Medio tiempo. Lo combinaré con otra actividad.' },
];

/**
 * Paso 7 — Horario operativo: EXACTAMENTE qué horas del día la persona
 * marca como disponibles para el negocio, tocadas una por una en un mapa
 * de 24 horas y no elegidas de una lista de cuatro franjas.
 *
 * Es distinto de `disponibilidad` (Paso 6, tiempo completo/medio tiempo):
 * ese paso dice CUÁNTO tiempo tiene, éste dice CUÁNDO exactamente. Cuatro
 * botones ("Por las mañanas"...) obligaban a todo o nada dentro de un
 * bloque de varias horas — un freelance con la mañana libre salvo la hora de
 * la comida no podía decirlo sin, o bien marcar la mañana entera (y que la
 * app le sugiera prospectar mientras come), o bien no marcar nada (y
 * perder las otras cinco horas libres). El mapa hora por hora deja hueca
 * justo esa hora, sin sacrificar el resto.
 *
 * `HOUR_BLOCKS` sólo AGRUPA visualmente esas 24 horas bajo un título —
 * Madrugada, Mañana, Tarde, Noche— para que el mapa se lea como jornada y
 * no como una fila plana de 24 botones idénticos; no es una opción
 * seleccionable en sí misma, así que no tiene `value` propio.
 */
/*
  Los límites entre bloques siguen la definición estándar de las cuatro
  partes del día, no una división mecánica de 24 horas en cuatro sextos:

    Madrugada  00:00–05:59  las horas más oscuras, antes del amanecer.
    Mañana     06:00–11:59  desde el amanecer hasta el mediodía.
    Tarde      12:00–18:59  desde el mediodía hasta el ocaso — incluye la
                             hora 18 a propósito, porque a esa hora todavía
                             hay luz de tarde, no es noche cerrada.
    Noche      19:00–23:59  desde el ocaso hasta la medianoche.

  Por eso Tarde tiene siete horas y Noche cinco, en vez de seis y seis: la
  hora que "sobra" respecto a una partición pareja es la que de verdad
  describe cuándo empieza a oscurecer.
*/
export const HOUR_BLOCKS = [
  { key: 'dawn', label: 'Madrugada', hours: [0, 1, 2, 3, 4, 5] },
  { key: 'morning', label: 'Mañana', hours: [6, 7, 8, 9, 10, 11] },
  { key: 'afternoon', label: 'Tarde', hours: [12, 13, 14, 15, 16, 17, 18] },
  { key: 'evening', label: 'Noche', hours: [19, 20, 21, 22, 23] },
];

/** Las 24 horas en orden, para el atajo "Todo el día libre". */
export const ALL_DAY_HOURS = HOUR_BLOCKS.flatMap((block) => block.hours);

/**
 * El número de la hora en formato de 12, sin la "a"/"p" de antes ("7", "8",
 * "9"...): con las celdas ya agrupadas bajo un título por bloque
 * (Madrugada, Mañana...) la letra de más era ruido, no información — nadie
 * confunde las 9 de "MAÑANA" con las 9 de "NOCHE" cuando el bloque ya lo
 * dice arriba.
 */
export function formatHour(hour) {
  return String(hour % 12 === 0 ? 12 : hour % 12);
}

/**
 * La hora completa, para quien no ve el mapa: "7:00 a. m.". Sólo la usan
 * los lectores de pantalla (`aria-label` de cada celda) — sin el bloque
 * visual como contexto, un lector que anuncia sólo "7" sí sería ambiguo.
 */
export function formatHourLabel(hour) {
  const period = hour < 12 ? 'a. m.' : 'p. m.';
  return `${formatHour(hour)}:00 ${period}`;
}

/**
 * ¿La hora de `now` cae dentro del `horario` que el asesor marcó en el
 * Onboarding?
 *
 * `horario` vacío o ausente (cuenta vieja, columna sin migrar, o Onboarding
 * todavía no completado) se trata como "sin restricción" — devuelve
 * `true`— y no como "nunca disponible": un dato que no existe no debe
 * silenciar sugerencias para nadie, sólo quien de verdad marcó sus horas
 * debe verlas respetadas.
 *
 * @param {number[]} horario - Horas (0-23) marcadas libres. Ver `EMPTY_ADVISOR_DATA`.
 * @param {Date} [now] - Reloj a usar; se inyecta para poder probarlo.
 */
export function isHourWithinSchedule(horario, now = new Date()) {
  if (!Array.isArray(horario) || horario.length === 0) return true;
  return horario.includes(now.getHours());
}

/** Paso 8 — Motor: el objetivo principal detrás de la carrera. */
export const MOTIVATION_OPTIONS = [
  { value: 'independence', label: 'Independencia y libertad financiera' },
  { value: 'extra_income', label: 'Generar un ingreso extra o diversificar' },
  { value: 'growth', label: 'Crecimiento profesional y ayudar a otros' },
];

/**
 * Radiografía en blanco: la forma exacta de lo que se guarda en
 * `advisorProfileData`. Ninguna respuesta llega con un valor por
 * omisión —a diferencia del perfil financiero (ver `defaults.js`)— porque
 * aquí no hay un dato razonable que inventar por alguien que todavía no
 * contestó: un mercado o un horario puestos por el sistema calibrarían el
 * algoritmo de tareas con una respuesta que nadie dio.
 *
 * `horario` es un arreglo de horas (0 a 23, ver `HOUR_BLOCKS`) y no un
 * texto único: puede tener una hora, doce o las veinticuatro, según lo que
 * la persona marque en el mapa del Paso 7.
 */
export const EMPTY_ADVISOR_DATA = {
  nombre: '',
  perfil: '',
  fortaleza: '',
  inquietud: '',
  mercado: '',
  disponibilidad: '',
  horario: [],
  motor: '',
};
