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

/** Paso 3 — Fortaleza declarada al arrancar el negocio. */
export const STRENGTH_OPTIONS = [
  { value: 'people', label: 'Facilidad para conectar con la gente' },
  { value: 'discipline', label: 'Disciplina y constancia' },
  { value: 'analytics', label: 'Habilidad para analizar datos complejos' },
];

/** Paso 4 — Lo que más inquieta o impone en la etapa inicial. */
export const CONCERN_OPTIONS = [
  { value: 'rejection', label: 'El miedo al rechazo o a contactar conocidos' },
  { value: 'technical', label: 'Falta de dominio técnico o qué decir' },
  { value: 'organization', label: 'La falta de organización en mi día a día' },
  { value: 'none', label: 'Por el momento, ninguna' },
];

/** Paso 5 — Termómetro de mercado natural. */
export const MARKET_OPTIONS = [
  { value: 'under_20', label: 'A menos de 20' },
  { value: 'between_20_50', label: 'Entre 20 y 50' },
  { value: 'over_50', label: 'A más de 50' },
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
 * bloque de seis horas — un freelance con la mañana libre salvo la hora de
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
export const HOUR_BLOCKS = [
  { key: 'dawn', label: 'Madrugada', hours: [0, 1, 2, 3, 4, 5] },
  { key: 'morning', label: 'Mañana', hours: [6, 7, 8, 9, 10, 11] },
  { key: 'afternoon', label: 'Tarde', hours: [12, 13, 14, 15, 16, 17] },
  { key: 'evening', label: 'Noche', hours: [18, 19, 20, 21, 22, 23] },
];

/** Las 24 horas en orden, para el atajo "Todo el día libre". */
export const ALL_DAY_HOURS = HOUR_BLOCKS.flatMap((block) => block.hours);

/**
 * Una hora en formato corto de 12 —"6a", "12p", "11p"— para que quepa en
 * una celda pequeña del mapa sin ambigüedad entre las 6 de la mañana y las
 * 6 de la tarde, que un simple "6" no distinguiría.
 */
export function formatHour(hour) {
  const period = hour < 12 ? 'a' : 'p';
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}${period}`;
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
