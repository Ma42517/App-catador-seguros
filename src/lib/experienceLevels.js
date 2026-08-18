/**
 * src/lib/experienceLevels.js
 *
 * Las tres etapas profesionales que ofrece el Paso 2 del Onboarding
 * (`OnboardingFlow.jsx`). Vive en su propio módulo, sin JSX, por la misma
 * razón que `homeMessage.js` o `smartMessage.js`: se puede ajustar el texto,
 * o añadir una cuarta opción, sin tocar el componente que las dibuja.
 *
 * `value` es lo que se guarda en la columna `experience_level` de
 * `profiles` — no cambia aunque el título en pantalla se reformule, para no
 * dejar fichas antiguas con un valor que ya no corresponde a nada visible.
 */
export const EXPERIENCE_LEVELS = [
  {
    value: 'new_advisor',
    title: 'Nuevo Asesor',
    subtitle: 'Estoy arrancando y construyendo mi cartera.',
  },
  {
    value: 'new_professional',
    title: 'Nuevo Profesional',
    subtitle: 'Ya tengo clientes, busco estructura y constancia.',
  },
  {
    value: 'established',
    title: 'Consolidado',
    subtitle: 'Tengo una cartera madura, busco optimizar mi tiempo.',
  },
];
