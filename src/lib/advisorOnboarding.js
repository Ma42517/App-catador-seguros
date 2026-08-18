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
 * prospección según el tamaño de mercado declarado aquí, o respetar el
 * horario elegido en el Paso 7). No cambia aunque el texto del botón se
 * reformule, para no dejar radiografías antiguas con un valor que ya no
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
 * Paso 7 — Horario operativo: en qué bloques del día la persona piensa
 * dedicarle tiempo al negocio.
 *
 * Es distinto de `disponibilidad` (Paso 6, tiempo completo/medio tiempo):
 * ese paso dice CUÁNTO tiempo tiene, éste dice CUÁNDO. Un asesor de medio
 * tiempo que sólo puede "por las noches" necesita que las tareas y
 * notificaciones respeten justo esa ventana; sin este dato, el algoritmo de
 * tareas sólo sabría que tiene poco tiempo, no cuál es.
 */
export const SCHEDULE_OPTIONS = [
  { value: 'mornings', label: 'Por las mañanas' },
  { value: 'afternoons', label: 'Por las tardes' },
  { value: 'evenings', label: 'Por las noches' },
  { value: 'weekends', label: 'Fines de semana' },
];

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
 */
export const EMPTY_ADVISOR_DATA = {
  nombre: '',
  perfil: '',
  fortaleza: '',
  inquietud: '',
  mercado: '',
  disponibilidad: '',
  horario: '',
  motor: '',
};
