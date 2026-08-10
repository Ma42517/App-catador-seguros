/**
 * Las preguntas que rotan en el reverso de la tarjeta.
 *
 * Todas están escritas en segunda persona y apuntan a un momento de la vida, no
 * a un producto: "¿acabas de ser papá?" encuentra a alguien; "seguro de vida con
 * cobertura ampliada" no encuentra a nadie. El prospecto reconoce su situación
 * antes de saber que existe una póliza para ella, y ese reconocimiento es lo que
 * hace que pulse el botón de agendar.
 *
 * Viven fuera del componente para poder cambiarse sin tocarlo: es el texto que
 * más se va a retocar de toda la tarjeta —cada promotoría tiene su discurso— y
 * ninguna de esas ediciones debería obligar a leer código de React.
 */
export const PROSPECTING_QUESTIONS = [
  '¿Acabas de ser papá o mamá? Asegura su futuro.',
  '¿Eres profesional independiente? Planea tu retiro.',
  '¿Tienes una empresa? Conoce nuestras estrategias fiscales.',
  '¿Tu salud está blindada? Revisa tu cobertura médica.',
];

/** Cada cuánto se releva la pregunta, en milisegundos. */
export const QUESTION_INTERVAL_MS = 3000;
