import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, User, BookUser, Users, Loader2, CheckCircle2, AlertTriangle, ArrowRight, ListChecks,
  Plus, ChevronRight, Phone, Briefcase, Share2, TrendingUp, Crown, ShieldCheck, Zap, BarChart3,
} from 'lucide-react';
import useTypewriter, { TypewriterSpeedContext } from '../../lib/useTypewriter';
import { writeSafeZone } from '../../data/safeZone';
import { useSession } from '../../context/SessionContext';
import { useEvents, todayKey } from '../../context/EventContext';
import { joinPromotoriaByCode, describeError } from '../../data/promotoriaRepo';
import { normalizeCode, isValidCode, explainCode } from '../../data/promotoriaCode';
import BottomSheet from '../Layout/BottomSheet';

/** Cuánto tarda cada fundido de esta pantalla (el de la recompensa hacia "Iniciar", y el del overlay completo al presionarlo), en ms — usado tanto en las clases de Tailwind como en los temporizadores que esperan a que termine antes de avanzar. */
const FADE_OUT_MS = 700;
/*
  Cuánto se queda el logro en pantalla antes de desvanecerse solo y dejar
  el botón "Iniciar". El valor conserva la pausa visual de la experiencia.
*/
const REWARD_AUTO_MS = 4500;
/*
  Tamaño de la meta que anuncia el logro tipo consola ("N / 200 · Proyecto
  200"). Es un número fijo del propio logro —el nombre de la campaña de
  arranque, no una medición— y por eso vive separado del conteo real de
  prospectos capturados: el numerador sí es honesto (`capturedCount` en
  `RewardStep`, nunca inventado), el denominador es la meta declarada de
  este logro en particular.
*/
const PROJECT_GOAL = 200;

const STEP1_TEXT_TEMPLATE = (name) => `Hola, ${name}. Todo está configurado y listo para que inicies tu camino.`;

/*
  Mensaje del Paso 2, uno por cada inquietud declarada en el Onboarding
  (`CONCERN_OPTIONS`, `advisorOnboarding.js`) — cada tono responde a la
  preocupación exacta que esa persona nombró, sin repetirla de frente
  (ninguno dice "tienes miedo al rechazo" ni "no sabes organizarte"), igual
  criterio que ya se aplicó al mensaje de "rejection". `DEFAULT` es el
  respaldo si `inquietud` llega vacía o con un valor que no está en el
  mapa (cuenta vieja, sin `advisor_profile_data` migrado) — nunca se deja
  a alguien sin Paso 2 por un dato ausente.
*/
const STEP2_TEXT_BY_CONCERN = {
  rejection: 'El secreto del éxito es el sistema. Te guiaremos paso a paso para que '
    + 'conectar con tu entorno sea una experiencia fluida y natural.',
  technical: 'El secreto de los grandes asesores no es saberlo todo de memoria, es tener '
    + 'las herramientas correctas. Tu asistente está equipado con los guiones, cálculos y '
    + 'estrategias que necesitas. Tú pon la empatía, nosotros ponemos la técnica.',
  organization: 'A partir de hoy, olvídate de pensar qué hacer a continuación. Tu asistente '
    + 'estructurará tu día de forma automática. Te diremos a quién contactar, cuándo darle '
    + 'seguimiento y qué paso sigue. Solo tienes que ejecutar.',
  none: 'Excelente actitud. Sabemos que vienes listo para romperla. Este espacio está '
    + 'diseñado para acelerar tus resultados y escalar tus ventas sin burocracia. Vamos '
    + 'directo a la acción.',
};
/*
  El perfil "Nuevo Profesional" tiene su propio cuestionario de inquietudes
  (`PROFESSIONAL_BOTTLENECK_OPTIONS`, `advisorOnboarding.js`), con claves
  que nunca chocan con las de `CONCERN_OPTIONS` arriba — por eso su mensaje
  del Paso 2 puede vivir en el mismo mapa, sin arriesgar que una clave de un
  perfil pise por accidente la del otro. Sólo `low_ticket_market` (mercado
  de bajo perfil o primas pequeñas) tiene mensaje propio hoy: es la única
  rama de este perfil con un Paso 3 distinto al genérico (ver
  `isLowTicketMarketBranch` más abajo) — el resto de las inquietudes de
  "Nuevo Profesional" (`admin_overload` aparte, que tiene su propio Paso 3
  de tareas) todavía usa el respaldo genérico de "rejection".
*/
STEP2_TEXT_BY_CONCERN.low_ticket_market = 'Para elevar tu nivel de ingresos, no necesitas '
  + 'trabajar el doble, necesitas la llave correcta. No puedes llegar a un mercado de alto '
  + 'perfil vendiendo; tienes que llegar aportando valor.';
/*
  Dos claves más del mismo cuestionario de "Nuevo Profesional",
  correspondientes a las ramas de agendamiento secuencial (ver
  `isReferralDependentBranch`/`isScaleOnlyBranch` más abajo). A diferencia
  de `low_ticket_market`, ninguna de las dos trae un subtexto resaltado
  aparte — el mensaje completo de la especificación es un solo bloque, así
  que `step2HighlightFor` sigue devolviendo `null` para ambas.
*/
STEP2_TEXT_BY_CONCERN.referral_dependent = 'Vivir de referidos espontáneos es dejar tu '
  + 'negocio a la suerte. Vamos a sistematizarlo. Hemos depositado 3 Diagnósticos '
  + 'Financieros de cortesía en tu cuenta. Tu misión no es usarlos tú, es regalárselos a tus '
  + 'mejores clientes para que ellos los compartan con la gente que más quieren.';
STEP2_TEXT_BY_CONCERN.none_scale = 'Excelente actitud. Si vienes a romper récords, te '
  + 'daremos la tecnología para lograrlo. Hemos habilitado el Diagnóstico Financiero 360 en '
  + 'tu arsenal. Úsalo como diferenciador premium en tus reuniones para fulminar objeciones y '
  + 'acelerar el cierre.';
const DEFAULT_STEP2_TEXT = STEP2_TEXT_BY_CONCERN.rejection;

/**
 * Texto del Paso 2 según la inquietud declarada — nunca `undefined`: cae al
 * mensaje de "rejection" (el más neutro de los cuatro) si `inquietud` no
 * coincide con ninguna clave conocida.
 */
function step2TextFor(inquietud) {
  return STEP2_TEXT_BY_CONCERN[inquietud] ?? DEFAULT_STEP2_TEXT;
}

/*
  Subtexto resaltado del Paso 2, sólo para quien lo tiene: a diferencia del
  texto principal (`STEP2_TEXT_BY_CONCERN`, siempre presente con un
  respaldo), este segundo bloque es la excepción, no la regla — hoy sólo
  existe para `low_ticket_market`, el anuncio de que ya tiene 3 Diagnósticos
  Financieros 360 de cortesía desbloqueados, la herramienta que va a usar
  para acercarse a los prospectos de alto perfil del Paso 3. El resto de
  las inquietudes no tienen nada que resaltar aquí, así que
  `step2HighlightFor` devuelve `null` para ellas y `EmpowermentStep` no
  dibuja el bloque en absoluto.
*/
const STEP2_HIGHLIGHT_BY_CONCERN = {
  low_ticket_market: 'Por eso, hemos desbloqueado 3 Diagnósticos Financieros 360 de cortesía '
    + 'en tu cuenta. Esta herramienta será tu excusa perfecta para acercarte a prospectos de '
    + 'alto nivel regalándoles una consultoría.',
};

/** Subtexto resaltado del Paso 2 para esta inquietud, o `null` si no tiene uno declarado. */
function step2HighlightFor(inquietud) {
  return STEP2_HIGHLIGHT_BY_CONCERN[inquietud] ?? null;
}

/*
  Cuántos slots pide el Paso 3, según el tamaño de mercado declarado
  (`MARKET_OPTIONS`, `advisorOnboarding.js`): a quien apenas tiene un
  mercado cálido pequeño no se le exige la misma lista que a quien ya
  declaró más de 50 contactos — pedirle 5 nombres a alguien con menos de
  20 sería fricción sin sentido, y pedirle sólo 3 a alguien con más de 50
  desaprovecharía la ventaja que esa persona ya tiene. El respaldo
  (`DEFAULT_SLOT_COUNT`) es el mínimo de los tres, no el máximo: un dato
  ausente no debe exigir más de lo que se exigiría con la opción más
  conservadora.
*/
const SLOT_COUNT_BY_MARKET = {
  under_20: 3,
  between_20_50: 4,
  over_50: 5,
};
const DEFAULT_SLOT_COUNT = SLOT_COUNT_BY_MARKET.under_20;

/** Cuántos slots pide el Paso 3 según el mercado declarado — 3 por defecto si `mercado` no coincide con ninguna opción conocida. */
function slotCountFor(mercado) {
  return SLOT_COUNT_BY_MARKET[mercado] ?? DEFAULT_SLOT_COUNT;
}

const step3Text = (slotCount) => 'Comencemos por tus primeros apoyos. Para desbloquear tu '
  + `agenda, ingresa a ${slotCount} personas cercanas a ti.`;

/*
  ── Rama "Nuevo Profesional" con carga administrativa ──

  Quien en el Onboarding marcó el perfil "Nuevo Profesional"
  (`advisorProfileData.perfil === 'new_professional'`) y, como su cuello de
  botella, "Me consume la carga administrativa y el servicio"
  (`advisorProfileData.inquietud === 'admin_overload'`, ver
  `PROFESSIONAL_BOTTLENECK_OPTIONS` en `advisorOnboarding.js`) no necesita
  otros tres prospectos: ya tiene cartera. Lo que le falta es vaciar la
  libreta de pendientes que trae encima, así que el Paso 3 cambia entero de
  propósito — de "consigue tus primeros apoyos" a "descarga tu mente" — sin
  tocar la posición del paso ni el resto del recorrido (Recompensa, Unirse
  a un equipo, Iniciar siguen en el mismo orden para las dos ramas).

  Reutiliza las mismas claves de `advisorData` que ya usa el resto de esta
  pantalla (`inquietud`, `mercado`) en vez de columnas nuevas — mismo
  criterio que ya se aplicó en la ramificación del Onboarding
  (`OnboardingFlow.jsx`): para el perfil profesional, `mercado` no guarda
  un tamaño de mercado sino el tamaño de cartera declarado en el Paso 5
  (`PORTFOLIO_SIZE_OPTIONS`), con sus propias claves (`under_50`,
  `between_50_150`, `over_150`) — no confundir con `SLOT_COUNT_BY_MARKET`
  de arriba, que usa las claves del mercado del "Nuevo Asesor"
  (`under_20`...). Son dos mapas separados a propósito, aunque ambos
  respondan "cuántos slots" a partir de una misma prop (`mercado`): las
  claves de un perfil nunca coinciden con las del otro, así que no hay
  riesgo real de choque, pero conviene un nombre y un mapa distintos para
  que quede claro de un vistazo cuál pertenece a cuál rama.
*/
function isAdminOverloadBranch(perfil, inquietud) {
  return perfil === 'new_professional' && inquietud === 'admin_overload';
}

/*
  ── Rama "Nuevo Profesional" con mercado de bajo perfil ──

  Quien marcó "Trabajo con un mercado de bajo perfil o primas pequeñas"
  (`advisorProfileData.inquietud === 'low_ticket_market'`, ver
  `PROFESSIONAL_BOTTLENECK_OPTIONS`) no necesita vaciar pendientes ni
  juntar apoyos cercanos: ya tiene cartera, pero de tickets pequeños — lo
  que le falta es la llave para llegar a un mercado de mayor nivel. El
  Paso 3 se vuelve híbrido: 2 prospectos de alto perfil (para la lista de
  Prospectos/Zona Segura, mismo destino que `ProspectCaptureStep`) y 3
  acciones concretas para agendar (para la Agenda real, mismo destino que
  `TaskCaptureStep`) — un único paso que alimenta los dos lugares a la
  vez, en vez de elegir entre uno u otro como las dos ramas anteriores.

  Esta rama es exclusiva de "Nuevo Profesional" + "mercado de bajo perfil
  o primas pequeñas": ningún otro perfil ni ninguna otra inquietud debe
  activarla, por eso compara ambos valores exactos y no sólo la
  inquietud — la misma clave `low_ticket_market` no existe en el
  cuestionario de "Nuevo Asesor" (`CONCERN_OPTIONS`), pero la comparación
  explícita del perfil deja la regla a prueba de futuros cuestionarios que
  reciclen nombres de clave.
*/
function isLowTicketMarketBranch(perfil, inquietud) {
  return perfil === 'new_professional' && inquietud === 'low_ticket_market';
}

/** Cuántos prospectos de alto perfil pide la Sección A del Paso 3 híbrido — fijo, no depende de `mercado`. */
const HYBRID_PROSPECT_SLOT_COUNT = 2;
/** Cuántas acciones concretas pide la Sección B del Paso 3 híbrido — fijo, no depende de `mercado`. */
const HYBRID_TASK_SLOT_COUNT = 3;

const HYBRID_STEP3_TEXT = 'Comencemos. Para desbloquear tu herramienta, selecciona a 2 '
  + 'prospectos de alto perfil.';
/*
  Aviso de privacidad, no aclaración menor: la especificación lo pide en
  `text-slate-500` (más visible que el subtexto tenue del resto de la
  pantalla, ver `STEP3_SUBTEXT`) porque aquí se está pidiendo el contacto
  de gente ajena a la cuenta, no apoyos cercanos de quien se está
  registrando — la promesa de "no los contactaremos" necesita leerse con
  claridad, no perderse como una nota al pie.
*/
const HYBRID_PRIVACY_NOTICE = 'Tranquilo, tu información es estrictamente confidencial y se '
  + 'guarda de forma local para tu agenda. Nosotros no los contactaremos.';
const HYBRID_BRIDGE_TEXT = 'Ahora, agenda 3 acciones concretas:';

/*
  Logro de esta rama: "Armería Desbloqueada" con el ícono `Briefcase`, una
  de las dos combinaciones que ofrecía la especificación ("Armería
  Desbloqueada"/"Mercado Elevado", `Diamond`/`Briefcase`). Se elige
  `Briefcase` porque ya es el ícono de "trabajo/cartera" en el resto de la
  app (coherente con "elevar tu mercado"), y no `Diamond`, que no se usa en
  ningún otro logro — mantener un solo vocabulario de íconos entre los tres
  logros de esta pantalla (`Trophy`, `ListChecks`, `Briefcase`) evita que
  cada rama nueva introduzca una familia visual distinta sin motivo.
*/
const HYBRID_ACHIEVEMENT = {
  icon: Briefcase,
  label: () => 'Armería Desbloqueada',
};

/*
  ── Rama "Consolidado" — Alfombra Roja ──

  El asesor veterano con cartera madura no necesita que le pidamos nombres,
  teléfonos, acciones ni fechas — ya tiene un negocio andando. Pedirle
  cualquier formulario en este punto es fricción innecesaria que comunica
  "no sabemos quién eres". Para este perfil el onboarding es puramente
  informativo e inspiracional: un solo paso con typing, beneficios con
  efecto stagger (framer-motion) y un CTA que lo lleva directo a la
  recompensa (confeti + logro "Modo Director Activado"). Sin Paso 3 de
  captura, sin Paso 5 de equipo — ingresa y trabaja.
*/
function isConsolidatedBranch(perfil) {
  return perfil === 'established';
}

const CONSOLIDATED_MAIN_TEXT = (name) => `${name}, has construido un negocio sólido. En este `
  + 'nivel, el objetivo ya no es trabajar más horas, es multiplicar tu tiempo y blindar tu '
  + 'cartera.';

const CONSOLIDATED_SUBTEXT = 'Tu entorno ejecutivo está listo. Tu nuevo asistente impulsado '
  + 'por IA se encargará de automatizar tu seguimiento, organizar tu servicio y filtrar el '
  + 'ruido para que tú te enfoques exclusivamente en la estrategia y las relaciones de alto '
  + 'valor.';

const CONSOLIDATED_BENEFITS = [
  { icon: ShieldCheck, text: 'Protección de cartera y control de renovaciones.' },
  { icon: Zap, text: 'Automatización de seguimiento y servicio a clientes.' },
  { icon: BarChart3, text: 'Métricas de crecimiento y oportunidades de venta cruzada.' },
];

const CONSOLIDATED_CTA_TEXT = 'ACCEDER A MI ENTORNO EJECUTIVO';

const CONSOLIDATED_ACHIEVEMENT = {
  icon: Crown,
  label: () => 'Modo Director Activado',
};

/** Glow ámbar premium para el CTA de la rama Consolidado — diferente al índigo de las otras ramas, aquí el botón ES la recompensa visual. */
const CONSOLIDATED_GLOW = 'shadow-[0_0_20px_rgba(245,158,11,0.6)] '
  + 'hover:shadow-[0_0_30px_rgba(245,158,11,0.9)] transition-shadow duration-300';

/*
  ── Ramas "Nuevo Profesional" con agendamiento secuencial ──

  Dos cuellos de botella más del mismo cuestionario
  (`PROFESSIONAL_BOTTLENECK_OPTIONS`): "Dependo de referidos; no prospecto
  activamente" (`referral_dependent`) y "Por el momento, ninguno. Solo
  busco escalar" (`none_scale`). A diferencia de la rama de mercado de
  bajo perfil (`isLowTicketMarketBranch`, Paso 3 híbrido con dos secciones
  visibles a la vez), estas dos usan un Paso 3 en **dos fases
  secuenciales**: primero se capturan los contactos (Fase A) y sólo al
  tocar "Continuar" aparece la Fase B, que pide acción y fecha/hora para
  *esos mismos contactos* — nunca dos listas independientes en pantalla al
  mismo tiempo.

  Comparten un mismo componente (`SequentialCaptureStep`) porque la
  mecánica es idéntica entre las dos; sólo cambian los textos, la cantidad
  de contactos y las opciones de acción — por eso viven en un único mapa
  de configuración (`SEQUENTIAL_BRANCH_CONFIG`) en vez de duplicar el
  componente.
*/
function isSequentialBranch(perfil, inquietud) {
  return perfil === 'new_professional'
    && (inquietud === 'referral_dependent' || inquietud === 'none_scale');
}

/** Configuración de cada rama secuencial: cuántos contactos pide, los textos de cada fase y el logro que otorga. */
const SEQUENTIAL_BRANCH_CONFIG = {
  referral_dependent: {
    slotCount: 3,
    phaseAMain: 'Selecciona a 3 de tus clientes más leales para darles este regalo.',
    phaseAPrivacy: 'Tranquilo, esta información es estrictamente confidencial y se guarda '
      + 'solo en tu dispositivo.',
    phaseBMain: 'Excelente. Ahora, ¿cuándo les entregarás este obsequio?',
    actionOptions: [
      { value: 'call', label: 'Llamada' },
      { value: 'message', label: 'Mensaje' },
      { value: 'visit_event', label: 'Visita/Evento' },
    ],
    achievement: { icon: Share2, label: () => 'Motor de Referidos' },
  },
  none_scale: {
    slotCount: 2,
    phaseAMain: 'Para desbloquear tu herramienta, selecciona a quién quieres regalárselo.',
    phaseAPrivacy: 'Tu información está blindada y es exclusiva para tu agenda.',
    phaseBMain: 'Aseguremos esas firmas. Programa el contacto para utilizar tu nuevo '
      + 'diagnóstico:',
    actionOptions: [
      { value: 'call', label: 'Llamada' },
      { value: 'message', label: 'Mensaje' },
      { value: 'visit', label: 'Visitar' },
    ],
    achievement: { icon: TrendingUp, label: () => 'Modo Escala' },
  },
};

/** Configuración de la rama secuencial activa, o `undefined` si `inquietud` no es una de las dos. */
function sequentialConfigFor(inquietud) {
  return SEQUENTIAL_BRANCH_CONFIG[inquietud];
}

/*
  Fecha y hora sugeridas de la fila de agendamiento número `index`
  (0-indexado), en el formato exacto que espera un `<input
  type="datetime-local">`: hoy (`todayKey`), a la misma hora escalonada que
  ya usa `defaultTaskTime` — mismo criterio de "nunca dejar un pendiente
  sin horario", ahora también con fecha explícita porque esta rama sí la
  pide (a diferencia de las otras dos, que no preguntan fecha).
*/
function defaultDateTime(index) {
  return `${todayKey()}T${defaultTaskTime(index)}`;
}

/** Cuántos slots de tareas pide el Paso 3, según la cartera declarada (Paso 5, perfil profesional). */
const SLOT_COUNT_BY_PORTFOLIO = {
  under_50: 5,
  between_50_150: 8,
  over_150: 10,
};
const DEFAULT_TASK_SLOT_COUNT = SLOT_COUNT_BY_PORTFOLIO.under_50;

/** Cuántos slots de tareas pide el Paso 3 según la cartera declarada — 5 por defecto si `mercado` no coincide con ninguna opción conocida. */
function taskSlotCountFor(mercado) {
  return SLOT_COUNT_BY_PORTFOLIO[mercado] ?? DEFAULT_TASK_SLOT_COUNT;
}

/*
  Regla anti-fricción: aunque se dibujen 5, 8 o 10 slots según la cartera,
  no hace falta llenarlos todos para avanzar — sólo los primeros que la
  persona recuerde de memoria en el momento. Pedir la lista completa
  convertiría un paso pensado para "vaciar la mente rápido" en un
  formulario largo, justo lo que este perfil ya dijo que le sobra.
*/
const MIN_FILLED_TASKS = 3;

const TASK_STEP_TITLE = 'Descarga tu mente';
const TASK_STEP_TEXT = 'Vacía esos pendientes que tienes en tu libreta y pásalos a tu nuevo '
  + 'asistente.';
const TASK_STEP_SUBTEXT = 'Agilicemos tu horario. Escribe tus próximas acciones y nosotros '
  + 'nos encargamos de acomodarlas en tu agenda.';

/**
 * Tarea vacía: la forma exacta de cada slot del Paso 3 en la rama de carga
 * administrativa: categoría, nombre, teléfono y hora.
 *
 * `hora` no arranca vacía en la práctica: `TaskCaptureStep` la llena con
 * `defaultTaskTime(index)` al crear cada slot —una sugerencia editable, no
 * una casilla en blanco—, así la persona siempre ve a qué hora quedaría su
 * pendiente en el calendario sin tener que pensarlo, y puede corregirla si
 * ya sabe cuándo es de verdad. `telefono` es opcional: no todas las
 * actividades tienen a alguien a quien llamar (por ejemplo, un trámite
 * interno), así que no bloquea el guardado.
 */
const EMPTY_TASK = { tipo: 'call', descripcion: '', telefono: '', hora: '' };

/** Hora de respaldo si `hora` llega vacía al guardar (no debería pasar: cada slot nace con `defaultTaskTime`). */
const DEFAULT_TASK_HOUR = '09:00';

/*
  Catálogo de acciones agendables — lista corta y cerrada, sin puntos: cada
  entrada es una acción que se agenda, nunca un resultado (por eso ya no
  aparecen "Referido obtenido", "Póliza emitida", "Prospecto nuevo"...,
  esos son resultados de una acción, no la acción en sí — se reportan en
  el flujo posterior, cuando la actividad ya sucedió, no aquí al crearla).

  El orden es el exacto pedido: no es alfabético ni por frecuencia de uso,
  así que no hay que "arreglarlo" ordenándolo de otra forma.
*/
const TASK_TYPE_OPTIONS = [
  { value: 'call', label: 'Llamada' },
  { value: 'message_followup', label: 'Seguimiento' },
  { value: 'appointment', label: 'Cita' },
  { value: 'initial_meeting', label: 'Cita Inicial' },
  { value: 'closing_meeting', label: 'Cita de Cierre' },
  { value: 'policy_paperwork', label: 'Trámite de Póliza' },
  { value: 'collection', label: 'Cobro' },
  { value: 'other', label: 'Otro' },
];

/** Etiqueta legible de una categoría de tarea; respaldo al valor crudo si alguna vez llega uno fuera de la lista (dato viejo o corrupto). */
function taskTypeLabel(value) {
  return TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Etiqueta legible de una acción de las ramas secuenciales, según el catálogo corto propio de esa rama (`config.actionOptions`). */
function sequentialActionLabel(config, value) {
  return config.actionOptions.find((option) => option.value === value)?.label ?? value;
}

/*
  Cero puntos por crear la tarea: agendar una acción no es el logro, es
  sólo la promesa de hacerla. El punto de verdad se otorga más adelante,
  en el flujo de resultados, cuando la persona marca qué pasó de verdad
  con esa llamada, cita o trámite — es ahí, y no aquí, donde debería vivir
  el cálculo por resultado el día que exista. `continueTaskCapture`
  (`FirstLoginIntro`) no suma nada por tarea capturada: el único punto que
  otorga esta pantalla es el fijo de bienvenida por terminar el
  Onboarding, igual en las dos ramas.
*/

/**
 * Hora sugerida de la tarea número `index` (0-indexado): 9:00 a. m. y
 * media hora más por cada una, para que las tareas capturadas de golpe no
 * queden todas apiladas a la misma hora en la agenda. Ya no es un campo
 * que la persona vea ni edite en este paso —el slot sólo pide categoría y
 * nombre—, así que sólo sirve para que `continueTaskCapture` reparta las
 * horas al mandarlas a la Agenda real.
 */
function defaultTaskTime(index) {
  const totalMinutes = 9 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

/*
  Aclaración secundaria, no la instrucción principal — mismo criterio que
  `SCHEDULE_HINT_TEXT` en `OnboardingFlow.jsx`: entra con fade-in aparte, sin
  máquina de escribir, para no competir por atención con el texto de arriba.
  Es también la promesa que hace posible pedir un teléfono en este paso sin
  fricción: nadie va a usarlo todavía.
*/
const STEP3_SUBTEXT = 'No haremos nada con ellos hoy ni te pediremos que les llames. Solo '
  + 'estamos preparando el terreno.';

/*
  Paso 5 — Unirse a un equipo de trabajo. Vive después de la recompensa y
  antes de "Iniciar": ya se ganó el punto, así que este paso no condiciona
  nada de eso — es una invitación aparte, con su propia salida ("Saltar por
  ahora"), para quien ya tiene el código de su promotoría a la mano.
*/
const STEP5_TEXT = '¿Ya tienes el código de tu promotoría? Únete a tu equipo de trabajo.';
const STEP5_SUBTEXT = 'Si no lo tienes a la mano, puedes hacerlo después desde tu perfil.';

/*
  Resplandor compartido por los botones de avance (Continuar, Entendido,
  Continuar del Paso 3, Iniciar): sobre el fondo `bg-slate-950`, un botón
  sólo con `shadow-lg` se pierde entre el resto del contraste oscuro de la
  pantalla — el glow es lo que le dice a la vista "aquí es donde se toca"
  sin depender de que el color del botón ya destaque por sí solo. Índigo, y
  no el ámbar de `RewardStep`: ámbar es el color de la recompensa (el punto
  que se gana), índigo es el de la acción que avanza el recorrido —
  colores duplicados confundirían cuál de los dos significa qué. El rgba es
  el mismo `indigo-600` que ya pinta el fondo del botón (`#4f46e5` →
  `rgb(79,70,229)`), sólo con más opacidad en el resplandor del `hover` para
  reforzar la respuesta al tacto.
*/
const GLOW_BUTTON_CLASS = 'shadow-[0_0_15px_rgba(79,70,229,0.6)] '
  + 'hover:shadow-[0_0_25px_rgba(79,70,229,0.8)] transition-shadow duration-300';

/** Colores del confeti — mismo set que ya usa `Celebration.jsx`, para no inventar una paleta nueva sólo para esta pantalla. */
const CONFETTI_COLORS = [
  'bg-amber-400', 'bg-emerald-400', 'bg-indigo-400',
  'bg-rose-400', 'bg-cyan-300', 'bg-violet-400',
];
const CONFETTI_PIECES = 50;

/** Prospecto vacío: la forma exacta de cada slot antes de llenarse, a mano o desde la agenda del teléfono. */
const EMPTY_PROSPECT = { nombre: '', telefono: '' };

/**
 * ¿El navegador soporta el selector nativo de contactos (Contact Picker
 * API)? Sólo Chrome/Edge en Android la implementan hoy — en cualquier otro
 * navegador `navigator.contacts` no existe, y el botón "Elegir desde mi
 * agenda" simplemente no se dibuja (ver `ProspectCaptureStep`): el Slot
 * manual sigue siendo el único camino, no una alternativa degradada.
 */
function isContactPickerSupported() {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
    && typeof window !== 'undefined' && 'ContactsManager' in window;
}

/**
 * Cursor parpadeante compartido por los pasos con máquina de escribir,
 * igual que el de `OnboardingFlow.jsx` — se repite aquí, y no se importa de
 * allá, porque son dos flujos que no comparten ciclo de vida ni deberían
 * acoplarse por un detalle visual tan pequeño.
 */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/** Paso 1 — Saludo neutral, sin ninguna referencia todavía a la inquietud declarada. */
function GreetingStep({ name, onContinue }) {
  const { typed, isTyping } = useTypewriter(STEP1_TEXT_TEMPLATE(name));

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{STEP1_TEXT_TEMPLATE(name)}</p>
      <p
        className="max-w-lg text-2xl font-light leading-relaxed text-white sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <button
        type="button"
        onClick={onContinue}
        aria-hidden={isTyping}
        tabIndex={isTyping ? -1 : 0}
        className={`mt-10 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                    transition-opacity duration-700 hover:bg-indigo-500 active:scale-95
                    ${GLOW_BUTTON_CLASS}
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Continuar
      </button>
    </div>
  );
}

/**
 * Paso 2 — Enfoque empoderador, en un solo mensaje: habla del sistema que
 * va a guiar el arranque, sin nombrar de frente la inquietud declarada.
 * `text` ya viene resuelto por `step2TextFor(inquietud)` desde
 * `FirstLoginIntro` — este componente no decide el tono, sólo lo dibuja. El
 * botón se enciende al terminar de escribirse, igual que en el Paso 1.
 */
function EmpowermentStep({ text, highlight, onContinue }) {
  const { typed, isTyping } = useTypewriter(text);
  const [showHighlight, setShowHighlight] = useState(false);

  useEffect(() => {
    if (isTyping || !highlight) return undefined;
    const timer = setTimeout(() => setShowHighlight(true), 300);
    return () => clearTimeout(timer);
  }, [isTyping, highlight]);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{highlight ? `${text} ${highlight}` : text}</p>
      <p
        className="max-w-lg text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      {/*
        Sólo existe para la inquietud que declara un `highlight`
        (ver `step2HighlightFor`) — el resto de las ramas del Paso 2 no
        dibuja nada aquí, ni siquiera un contenedor vacío.
      */}
      {highlight && (
        <p
          aria-hidden="true"
          className={`mt-4 max-w-md rounded-xl border border-amber-400/30 bg-amber-500/[0.06]
                      px-4 py-3 text-sm font-medium leading-relaxed text-amber-200
                      transition-opacity duration-700
                      ${showHighlight ? 'opacity-100' : 'opacity-0'}`}
        >
          {highlight}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        aria-hidden={isTyping}
        tabIndex={isTyping ? -1 : 0}
        className={`mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                    transition-opacity duration-700 hover:bg-indigo-500 active:scale-95
                    ${GLOW_BUTTON_CLASS}
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Entendido
      </button>
    </div>
  );
}

/**
 * Un slot del Paso 3: vacío (borde punteado, invita a tocarlo), en edición
 * (dos campos compactos, uno al lado del otro) o lleno (tarjeta sólida con
 * el nombre y, si lo trae, el teléfono debajo en gris). Los tres estados
 * son el mismo componente y no tres — nunca hay que sincronizar por
 * separado "cómo se ve vacío" y "cómo se ve editándose".
 *
 * El cierre de la edición va en el contenedor, no en cada input: un
 * `onBlur` en el campo de teléfono nada más se dispararía también al
 * tabular del nombre al teléfono *dentro del mismo slot*, cerrando la
 * edición a medio llenar. Comprobando `relatedTarget` contra el propio
 * contenedor, sólo se cierra cuando el foco de verdad sale del slot —click
 * afuera, Tab hacia el siguiente, o el botón "Continuar".
 */
function ProspectSlot({ index, value, isEditing, onEdit, onChange }) {
  const isFilled = Boolean(value.nombre.trim());

  if (isEditing) {
    return (
      <div
        className="flex h-14 items-center gap-2 rounded-xl border border-indigo-500/50
                   bg-slate-800/50 px-3"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onEdit(null);
        }}
      >
        <User size={16} className="shrink-0 text-slate-500" aria-hidden="true" />

        <label className="sr-only" htmlFor={`prospect-name-${index}`}>
          {`Nombre del prospecto ${index + 1}`}
        </label>
        <input
          id={`prospect-name-${index}`}
          autoFocus
          value={value.nombre}
          onChange={(event) => onChange(index, { ...value, nombre: event.target.value })}
          placeholder="Nombre"
          autoComplete="off"
          enterKeyHint="next"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500
                     focus:outline-none"
        />

        <label className="sr-only" htmlFor={`prospect-phone-${index}`}>
          {`Teléfono del prospecto ${index + 1}`}
        </label>
        <input
          id={`prospect-phone-${index}`}
          value={value.telefono}
          onChange={(event) => onChange(index, { ...value, telefono: event.target.value })}
          placeholder="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          enterKeyHint="done"
          className="w-24 shrink-0 border-l border-slate-700 bg-transparent pl-2 text-sm
                     text-white placeholder:text-slate-500 focus:outline-none"
        />
      </div>
    );
  }

  if (isFilled) {
    return (
      <button
        type="button"
        onClick={() => onEdit(index)}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-slate-700
                   bg-slate-800/50 px-4 text-left transition-colors hover:border-slate-600"
      >
        <User size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {value.nombre}
          </span>
          {value.telefono && (
            <span className="block truncate text-xs text-slate-500">{value.telefono}</span>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onEdit(index)}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2
                 border-dashed border-slate-700 text-sm text-slate-500 transition-colors
                 hover:border-slate-600 hover:text-slate-400"
    >
      <User size={16} aria-hidden="true" />
      Agregar contacto
    </button>
  );
}

/**
 * Paso 3 — Captura de los primeros prospectos, ahora como 3 "slots" en vez
 * de un formulario apilado: cada uno se llena tocándolo (`ProspectSlot`,
 * edición manual compacta) o de una sola vez con el selector nativo de
 * contactos del teléfono, si el navegador lo soporta.
 *
 * "CONTINUAR" exige al menos un nombre entre los slots; "Saltar paso"
 * no exige nada — es la fuga para quien prefiere no capturar a nadie en
 * este momento, y sigue otorgando el punto igual que si los hubiera
 * llenado (la recompensa es por haber cruzado el paso, no por los datos).
 *
 * `slotCount` ya viene resuelto por `slotCountFor(mercado)` desde
 * `FirstLoginIntro` — este componente no decide cuántos slots dibujar,
 * sólo los dibuja.
 */
function ProspectCaptureStep({ slotCount, onContinue, onSkip }) {
  const { typed, isTyping } = useTypewriter(step3Text(slotCount));
  const [showSubtext, setShowSubtext] = useState(false);
  const [prospects, setProspects] = useState(
    () => Array.from({ length: slotCount }, () => ({ ...EMPTY_PROSPECT })),
  );
  const [editingIndex, setEditingIndex] = useState(null);

  // Se calcula una sola vez: el soporte del navegador no cambia mientras
  // esta pantalla está montada.
  const [contactPickerSupported] = useState(isContactPickerSupported);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowSubtext(true), 300);
    return () => clearTimeout(timer);
  }, [isTyping]);

  const updateProspect = (index, next) => {
    setProspects((current) => current.map((p, i) => (i === index ? next : p)));
  };

  /**
   * Abre el selector nativo de contactos y coloca los primeros
   * `slotCount` elegidos en los slots, en el orden en que la persona
   * los seleccionó. Cada contacto puede traer varios teléfonos o ninguno
   * nombre —se toma el primero de cada arreglo, con respaldo a cadena
   * vacía— porque el slot ya sabe mostrarse "lleno" con sólo el nombre.
   *
   * Cancelar el selector, o negar el permiso, lanza `AbortError`/`NotAllowedError`
   * — se ignora en silencio, igual que cancelar cualquier diálogo nativo del
   * sistema: no es un error de la app, es la persona decidiendo no elegir a
   * nadie por ahora.
   */
  const handleOpenContacts = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked.length) return;

      setProspects((current) => {
        const next = [...current];
        picked.slice(0, slotCount).forEach((contact, index) => {
          next[index] = {
            nombre: contact.name?.[0] ?? '',
            telefono: contact.tel?.[0] ?? '',
          };
        });
        return next;
      });
      setEditingIndex(null);
    } catch {
      // Selector cancelado o permiso negado: no hay nada que capturar.
    }
  };

  const cleanEntries = prospects
    .map((p) => ({ nombre: p.nombre.trim(), telefono: p.telefono.trim() }))
    .filter((p) => p.nombre);
  const isValid = cleanEntries.length > 0;

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{`${step3Text(slotCount)} ${STEP3_SUBTEXT}`}</p>
      <p
        className="max-w-md text-lg leading-snug text-white sm:text-xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-2 max-w-sm text-[11px] leading-snug text-white/40
                    transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        {STEP3_SUBTEXT}
      </p>

      <div
        className={`mt-6 w-full max-w-md transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showSubtext}
      >
        <div className="space-y-3">
          {prospects.map((value, index) => (
            <ProspectSlot
              key={index}
              index={index}
              value={value}
              isEditing={editingIndex === index}
              onEdit={setEditingIndex}
              onChange={updateProspect}
            />
          ))}
        </div>

        {/*
          Sólo se dibuja donde el navegador de verdad puede abrir el
          selector nativo — en el resto, el slot manual sigue siendo el
          único camino, no un botón que promete algo que va a fallar.
        */}
        {contactPickerSupported && (
          <button
            type="button"
            onClick={handleOpenContacts}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full
                       border border-slate-700 py-2.5 text-xs font-semibold text-slate-300
                       transition-colors hover:border-slate-600 hover:text-white"
          >
            <BookUser size={14} aria-hidden="true" />
            Elegir desde mi agenda
          </button>
        )}

        <button
          type="button"
          onClick={() => onContinue(cleanEntries)}
          disabled={!isValid}
          className={`mt-5 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     uppercase tracking-wide text-white transition-all hover:bg-indigo-500
                     active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none
                     ${isValid ? GLOW_BUTTON_CLASS : ''}`}
        >
          Continuar
        </button>

        <button
          type="button"
          onClick={() => onSkip()}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Saltar paso
        </button>
      </div>
    </div>
  );
}

/**
 * Una fila del Paso 3 en la rama de carga administrativa: vacía (borde
 * punteado, invita a tocarla) o llena (tarjeta sólida con el nombre, la
 * hora, la categoría y, si lo trae, el teléfono) — mismo criterio de dos
 * estados que `ProspectSlot`.
 */
function TaskSlot({ index, value, onOpen }) {
  const isFilled = Boolean(value.descripcion.trim());

  if (isFilled) {
    return (
      <button
        type="button"
        onClick={() => onOpen(index)}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-slate-700
                   bg-slate-800/50 px-4 text-left transition-colors hover:border-slate-600"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {value.descripcion}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {value.hora || DEFAULT_TASK_HOUR} · {taskTypeLabel(value.tipo)}
            {value.telefono && ` · ${value.telefono}`}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2
                 border-dashed border-slate-700 text-sm text-slate-500 transition-colors
                 hover:border-slate-600 hover:text-slate-400"
    >
      <Plus size={16} aria-hidden="true" />
      Agregar actividad
    </button>
  );
}

/**
 * Hoja de edición de una tarea: "Tipo de Acción" (`TASK_TYPE_OPTIONS`, sin
 * ningún texto de puntos junto a él — agendar no otorga nada por sí
 * misma, el resultado real se reporta en otro flujo), nombre del cliente
 * o prospecto, teléfono y hora.
 *
 * `hora` viaja hasta la Agenda real como el horario exacto de esa
 * actividad —no la hora escalonada y genérica que traía cada slot al
 * nacer, ver `defaultTaskTime`—, y `telefono` es lo que en el futuro deja
 * que un recordatorio de esta tarea ofrezca "Llamar" o "Mandar WhatsApp"
 * en vez de sólo notificar que existe.
 *
 * Trabaja sobre un borrador local (`draft`) y no sobre `value` directo:
 * "Cancelar" debe dejar el slot exactamente como estaba, y confirmar cada
 * tecleo contra el estado del padre habría hecho imposible deshacerlo.
 */
function TaskEditorSheet({ isOpen, initialValue, onSave, onClose }) {
  const [draft, setDraft] = useState(initialValue);

  // Cada apertura arranca desde el valor real del slot, no desde lo que
  // haya quedado de una edición cancelada la vez anterior.
  useEffect(() => {
    if (isOpen) setDraft(initialValue);
  }, [isOpen, initialValue]);

  const canSave = Boolean(draft.descripcion.trim());

  const handleSave = () => {
    onSave({
      ...draft,
      descripcion: draft.descripcion.trim(),
      telefono: draft.telefono.trim(),
      hora: draft.hora || DEFAULT_TASK_HOUR,
    });
  };

  return (
    /*
      `zIndexClass="z-[100]"`: esta hoja se abre por encima del overlay de
      `FirstLoginIntro` (`z-[95]`), no de la app normal — con el `z-[60]`
      por omisión de `BottomSheet`, la hoja se dibujaría detrás de ese
      overlay y "Guardar" quedaría inalcanzable al tacto aunque se viera en
      pantalla (mismo patrón que ya resuelve `LeadCaptureModal.jsx` para su
      propio caso de anidamiento).
    */
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      label="Nueva actividad"
      zIndexClass="z-[100]"
    >
      <h2 className="mb-5 text-lg font-bold text-white">Nueva actividad</h2>

      <div className="flex flex-col gap-4 pb-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-type"
          >
            Tipo de Acción
          </label>
          <select
            id="task-sheet-type"
            value={draft.tipo}
            onChange={(event) => setDraft((current) => (
              { ...current, tipo: event.target.value }
            ))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5
                       text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {TASK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-name"
          >
            Nombre del cliente o prospecto
          </label>
          <input
            id="task-sheet-name"
            value={draft.descripcion}
            onChange={(event) => setDraft((current) => (
              { ...current, descripcion: event.target.value }
            ))}
            placeholder="Ej. Laura Gómez"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5
                       text-sm text-white placeholder:text-slate-500 focus:border-indigo-500
                       focus:outline-none"
          />
        </div>

        {/*
          La hora: llega pre-llenada con `defaultTaskTime(index)` desde
          `TaskCaptureStep` (una sugerencia, no una casilla en blanco), y
          aquí se puede corregir a la hora real del pendiente — es lo que
          hace que la Agenda muestre la hora en que la persona de verdad
          tiene esa actividad, y no una hora escalonada sin sentido.
        */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-time"
          >
            Hora
          </label>
          <input
            id="task-sheet-time"
            value={draft.hora}
            onChange={(event) => setDraft((current) => (
              { ...current, hora: event.target.value }
            ))}
            type="time"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5
                       text-sm text-white [color-scheme:dark] focus:border-indigo-500
                       focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-phone"
          >
            Teléfono
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-700
                          bg-slate-800/60 px-3"
          >
            <Phone size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
            <input
              id="task-sheet-phone"
              value={draft.telefono}
              onChange={(event) => setDraft((current) => (
                { ...current, telefono: event.target.value }
              ))}
              placeholder="10 dígitos"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white
                         placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`mt-1 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     text-white transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30
                     ${canSave ? GLOW_BUTTON_CLASS : ''}`}
        >
          Guardar
        </button>
      </div>
    </BottomSheet>
  );
}

/**
 * Paso 3 en la rama de carga administrativa — "Descarga tu mente": en vez
 * de capturar prospectos, la persona vacía sus pendientes en `slotCount`
 * filas (`taskSlotCountFor(mercado)`, según la cartera declarada en el
 * Onboarding). Cada fila se llena abriendo `TaskEditorSheet` (categoría,
 * nombre, teléfono y hora). Agendar prepara la agenda pero no suma al
 * objetivo diario: los puntos sólo nacen de resultados del diccionario.
 *
 * Cada slot arranca ya con una hora sugerida (`defaultTaskTime(index)`,
 * escalonada de media hora en media hora desde las 9:00) para que la
 * Agenda nunca reciba un pendiente sin horario — la persona puede
 * corregirla en `TaskEditorSheet` si ya sabe cuándo es de verdad, pero
 * nunca la deja vacía sin darse cuenta.
 *
 * "CONTINUAR" exige llenar al menos `MIN_FILLED_TASKS` de las filas, no
 * todas — regla anti-fricción de la especificación: quien tiene 10 slots
 * pero sólo recuerda 3 pendientes de memoria en este momento no debe
 * quedarse atorado inventando los siete que faltan.
 *
 * `onContinue` recibe las tareas limpias (descripción no vacía) para que
 * `FirstLoginIntro` las mande a la Agenda real, siempre con prioridad
 * máxima (ver `continueTaskCapture`).
 */
function TaskCaptureStep({ slotCount, onContinue, onSkip }) {
  const { typed, isTyping } = useTypewriter(TASK_STEP_TEXT);
  const [showSubtext, setShowSubtext] = useState(false);
  const [tasks, setTasks] = useState(
    () => Array.from({ length: slotCount }, (_, index) => (
      { ...EMPTY_TASK, hora: defaultTaskTime(index) }
    )),
  );
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowSubtext(true), 300);
    return () => clearTimeout(timer);
  }, [isTyping]);

  const saveTask = (next) => {
    setTasks((current) => current.map((t, i) => (i === openIndex ? next : t)));
    setOpenIndex(null);
  };

  const cleanEntries = tasks
    .map((t) => ({
      tipo: t.tipo,
      descripcion: t.descripcion.trim(),
      telefono: t.telefono.trim(),
      hora: t.hora || DEFAULT_TASK_HOUR,
    }))
    .filter((t) => t.descripcion);
  const isValid = cleanEntries.length >= MIN_FILLED_TASKS;

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{`${TASK_STEP_TITLE}. ${TASK_STEP_TEXT} ${TASK_STEP_SUBTEXT}`}</p>

      <p
        className="text-xs font-bold uppercase tracking-widest text-indigo-400"
        aria-hidden="true"
      >
        {TASK_STEP_TITLE}
      </p>

      <p
        className="mt-2 max-w-md text-lg leading-snug text-white sm:text-xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-2 max-w-sm text-[11px] leading-snug text-white/40
                    transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        {TASK_STEP_SUBTEXT}
      </p>

      <div
        className={`mt-6 w-full max-w-md transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showSubtext}
      >
        <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {tasks.map((value, index) => (
            <TaskSlot key={index} index={index} value={value} onOpen={setOpenIndex} />
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          {cleanEntries.length} / {MIN_FILLED_TASKS} pendientes mínimos para continuar
        </p>

        <button
          type="button"
          onClick={() => onContinue(cleanEntries)}
          disabled={!isValid}
          className={`mt-3 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     uppercase tracking-wide text-white transition-all hover:bg-indigo-500
                     active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none
                     ${isValid ? GLOW_BUTTON_CLASS : ''}`}
        >
          Continuar
        </button>

        <button
          type="button"
          onClick={() => onSkip()}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Saltar paso
        </button>
      </div>

      <TaskEditorSheet
        isOpen={openIndex !== null}
        initialValue={openIndex !== null ? tasks[openIndex] : EMPTY_TASK}
        onSave={saveTask}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}

/**
 * Paso 3 en la rama de mercado de bajo perfil — captura híbrida: Sección A
 * (2 prospectos de alto perfil, mismo `ProspectSlot` que ya usa
 * `ProspectCaptureStep`) y Sección B (3 acciones concretas, mismo
 * `TaskSlot`/`TaskEditorSheet` que ya usa `TaskCaptureStep`), en un único
 * paso que alimenta los dos destinos a la vez — no hay que elegir entre
 * "junta apoyos" o "vacía pendientes", esta rama pide ambos.
 *
 * Los slots de ambas secciones son fijos (`HYBRID_PROSPECT_SLOT_COUNT`,
 * `HYBRID_TASK_SLOT_COUNT`): a diferencia de las otras dos ramas, esta
 * cantidad no depende de `mercado`/cartera declarada — la especificación
 * pide exactamente 2 y exactamente 3, sin escalar.
 *
 * "CONTINUAR" se habilita con cualquier interacción real en la pantalla
 * —al menos un prospecto o una acción con datos—, y "Saltar paso" queda
 * siempre libre para quien prefiere no capturar nada ahora.
 */
function HybridCaptureStep({ onContinue, onSkip }) {
  const { typed, isTyping } = useTypewriter(HYBRID_STEP3_TEXT);
  const [showRest, setShowRest] = useState(false);
  const [prospects, setProspects] = useState(
    () => Array.from({ length: HYBRID_PROSPECT_SLOT_COUNT }, () => ({ ...EMPTY_PROSPECT })),
  );
  const [editingIndex, setEditingIndex] = useState(null);
  const [tasks, setTasks] = useState(
    () => Array.from({ length: HYBRID_TASK_SLOT_COUNT }, (_, index) => (
      { ...EMPTY_TASK, hora: defaultTaskTime(index) }
    )),
  );
  const [openIndex, setOpenIndex] = useState(null);

  const [contactPickerSupported] = useState(isContactPickerSupported);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowRest(true), 300);
    return () => clearTimeout(timer);
  }, [isTyping]);

  const updateProspect = (index, next) => {
    setProspects((current) => current.map((p, i) => (i === index ? next : p)));
  };

  const saveTask = (next) => {
    setTasks((current) => current.map((t, i) => (i === openIndex ? next : t)));
    setOpenIndex(null);
  };

  /** Ver `ProspectCaptureStep.handleOpenContacts` — mismo comportamiento, fijo a 2 slots. */
  const handleOpenContacts = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked.length) return;

      setProspects((current) => {
        const next = [...current];
        picked.slice(0, HYBRID_PROSPECT_SLOT_COUNT).forEach((contact, index) => {
          next[index] = {
            nombre: contact.name?.[0] ?? '',
            telefono: contact.tel?.[0] ?? '',
          };
        });
        return next;
      });
      setEditingIndex(null);
    } catch {
      // Selector cancelado o permiso negado: no hay nada que capturar.
    }
  };

  const cleanProspects = prospects
    .map((p) => ({ nombre: p.nombre.trim(), telefono: p.telefono.trim() }))
    .filter((p) => p.nombre);
  const cleanTasks = tasks
    .map((t) => ({
      tipo: t.tipo,
      descripcion: t.descripcion.trim(),
      telefono: t.telefono.trim(),
      hora: t.hora || DEFAULT_TASK_HOUR,
    }))
    .filter((t) => t.descripcion);
  const isValid = cleanProspects.length > 0 || cleanTasks.length > 0;

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">
        {`${HYBRID_STEP3_TEXT} ${HYBRID_PRIVACY_NOTICE} ${HYBRID_BRIDGE_TEXT}`}
      </p>

      <p
        className="max-w-md text-lg leading-snug text-white sm:text-xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-2 max-w-sm text-[11px] leading-snug text-slate-500
                    transition-opacity duration-700
                    ${showRest ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        {HYBRID_PRIVACY_NOTICE}
      </p>

      <div
        className={`mt-6 w-full max-w-md transition-opacity duration-700
                    ${showRest ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showRest}
      >
        <div className="space-y-3">
          {prospects.map((value, index) => (
            <ProspectSlot
              key={index}
              index={index}
              value={value}
              isEditing={editingIndex === index}
              onEdit={setEditingIndex}
              onChange={updateProspect}
            />
          ))}
        </div>

        {contactPickerSupported && (
          <button
            type="button"
            onClick={handleOpenContacts}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full
                       border border-slate-700 py-2.5 text-xs font-semibold text-slate-300
                       transition-colors hover:border-slate-600 hover:text-white"
          >
            <BookUser size={14} aria-hidden="true" />
            Elegir desde mi agenda
          </button>
        )}

        <p className="mt-6 text-xs text-slate-500">{HYBRID_BRIDGE_TEXT}</p>

        <div className="mt-3 space-y-3">
          {tasks.map((value, index) => (
            <TaskSlot key={index} index={index} value={value} onOpen={setOpenIndex} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onContinue(cleanProspects, cleanTasks)}
          disabled={!isValid}
          className={`mt-5 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     uppercase tracking-wide text-white transition-all hover:bg-indigo-500
                     active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none
                     ${isValid ? GLOW_BUTTON_CLASS : ''}`}
        >
          Continuar
        </button>

        <button
          type="button"
          onClick={() => onSkip()}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Saltar paso
        </button>
      </div>

      <TaskEditorSheet
        isOpen={openIndex !== null}
        initialValue={openIndex !== null ? tasks[openIndex] : EMPTY_TASK}
        onSave={saveTask}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}

/**
 * Rama "Alfombra Roja" — Paso completo (informativo) para el perfil
 * Consolidado: typing del mensaje directivo, subtexto ámbar con fade-in,
 * beneficios con stagger (framer-motion) y CTA directo a la recompensa.
 *
 * No hay captura de datos, no hay fases, no hay formulario: el botón
 * aparece al final de las animaciones y lleva directo a `RewardStep`
 * (`onContinue`). El paso fusiona lo que en las otras ramas eran los
 * pasos 1-3 (saludo + empowerment + captura) en un solo bloque
 * inspiracional: el "Consolidado" no necesita que lo guíen paso a paso.
 */
function ConsolidatedWelcomeStep({ name, onContinue }) {
  const { typed, isTyping } = useTypewriter(CONSOLIDATED_MAIN_TEXT(name));
  const [showSubtext, setShowSubtext] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (isTyping) return undefined;
    const subtextTimer = setTimeout(() => setShowSubtext(true), 400);
    return () => clearTimeout(subtextTimer);
  }, [isTyping]);

  useEffect(() => {
    if (!showSubtext) return undefined;
    const benefitsTimer = setTimeout(() => setShowBenefits(true), 600);
    return () => clearTimeout(benefitsTimer);
  }, [showSubtext]);

  useEffect(() => {
    if (!showBenefits) return undefined;
    // El CTA aparece después de que las viñetas terminen de animarse
    // (3 viñetas × 200ms stagger + 500ms de duración de la última)
    const ctaTimer = setTimeout(() => setShowCTA(true), 1100);
    return () => clearTimeout(ctaTimer);
  }, [showBenefits]);

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">
        {`${CONSOLIDATED_MAIN_TEXT(name)} ${CONSOLIDATED_SUBTEXT}`}
      </p>

      <p
        className="max-w-lg text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        aria-hidden="true"
        className={`mt-5 max-w-md text-sm font-medium leading-relaxed text-amber-200
                    transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'opacity-0'}`}
      >
        {CONSOLIDATED_SUBTEXT}
      </p>

      {showBenefits && (
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } },
          }}
          className="mt-8 w-full max-w-md space-y-4"
          aria-hidden="true"
        >
          {CONSOLIDATED_BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <motion.li
                key={benefit.text}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex items-start gap-3 rounded-xl border border-slate-800
                           bg-slate-900/60 px-4 py-3 text-left"
              >
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg
                             border border-amber-400/20 bg-amber-500/10 text-amber-400"
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-slate-200">
                  {benefit.text}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <div
        className={`mt-10 w-full transition-opacity duration-700
                    ${showCTA ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <button
          type="button"
          onClick={onContinue}
          className={`mx-auto flex w-[85%] max-w-sm items-center justify-center gap-3
                     rounded-xl border border-amber-400/50 bg-amber-500 py-4 text-base
                     font-bold tracking-wide text-slate-950 transition-all hover:bg-amber-400
                     active:scale-95 ${CONSOLIDATED_GLOW}`}
        >
          {CONSOLIDATED_CTA_TEXT}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Paso 3 en las ramas de agendamiento secuencial (referidos / sólo
 * escalar): dos fases dentro de un mismo paso, nunca ambas visibles a la
 * vez —a diferencia del Paso 3 híbrido de `low_ticket_market`, que sí
 * muestra las dos secciones juntas—.
 *
 *   Fase A — Captura: `config.slotCount` contactos (`ProspectSlot`,
 *     mismo componente y mismo selector nativo de contactos que ya usan
 *     las otras ramas). "Continuar" exige al menos un nombre para poder
 *     pasar a la Fase B —no tiene sentido programar la entrega de un
 *     regalo a nadie—; "Saltar paso" sale del Paso 3 entero sin pasar por
 *     la Fase B, misma fuga que ya ofrecen las otras ramas.
 *
 *   Fase B — Agendamiento obligatorio: por cada contacto confirmado en la
 *     Fase A (ya no editable aquí, sólo de lectura) se pide una acción
 *     (`config.actionOptions`, corta y propia de cada rama) y una fecha y
 *     hora (`datetime-local`, ambas pre-llenadas con `defaultDateTime` —
 *     igual criterio que `defaultTaskTime`: nunca vacías por accidente).
 *     "Guardar en mi Agenda" siempre queda habilitado en esta fase: cada
 *     fila ya nace con una acción y una fecha válidas, así que no hay
 *     nada que deba corregirse antes de poder continuar.
 *
 * El cambio de fase se anima con la misma transición de opacidad que el
 * resto del recorrido (`transition-opacity duration-700`), no con
 * `framer-motion`: la librería no está instalada en el proyecto y esta
 * pantalla no necesita más que un cruce simple de opacidad.
 */
function SequentialCaptureStep({ config, onContinue, onSkip }) {
  const [phase, setPhase] = useState('A');
  const mainText = phase === 'A' ? config.phaseAMain : config.phaseBMain;
  const { typed, isTyping } = useTypewriter(mainText);
  const [showRest, setShowRest] = useState(false);

  const [contacts, setContacts] = useState(
    () => Array.from({ length: config.slotCount }, () => ({ ...EMPTY_PROSPECT })),
  );
  const [editingIndex, setEditingIndex] = useState(null);
  const [contactPickerSupported] = useState(isContactPickerSupported);

  const [confirmedContacts, setConfirmedContacts] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    setShowRest(false);
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowRest(true), 300);
    return () => clearTimeout(timer);
    // `phase` también dispara el fade-in del bloque de abajo, no sólo `isTyping`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping, phase]);

  const updateContact = (index, next) => {
    setContacts((current) => current.map((c, i) => (i === index ? next : c)));
  };

  /** Ver `ProspectCaptureStep.handleOpenContacts` — mismo comportamiento, fijo a `config.slotCount`. */
  const handleOpenContacts = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked.length) return;

      setContacts((current) => {
        const next = [...current];
        picked.slice(0, config.slotCount).forEach((contact, index) => {
          next[index] = {
            nombre: contact.name?.[0] ?? '',
            telefono: contact.tel?.[0] ?? '',
          };
        });
        return next;
      });
      setEditingIndex(null);
    } catch {
      // Selector cancelado o permiso negado: no hay nada que capturar.
    }
  };

  const cleanContacts = contacts
    .map((c) => ({ nombre: c.nombre.trim(), telefono: c.telefono.trim() }))
    .filter((c) => c.nombre);
  const canAdvanceToPhaseB = cleanContacts.length > 0;

  const advanceToPhaseB = () => {
    setConfirmedContacts(cleanContacts);
    setActions(cleanContacts.map((_, index) => (
      { tipo: config.actionOptions[0].value, fechaHora: defaultDateTime(index) }
    )));
    setPhase('B');
  };

  const updateAction = (index, patch) => {
    setActions((current) => current.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const handleSaveAgenda = () => {
    onContinue(confirmedContacts.map((contact, index) => ({ ...contact, ...actions[index] })));
  };

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">
        {phase === 'A' ? `${config.phaseAMain} ${config.phaseAPrivacy}` : config.phaseBMain}
      </p>

      <p
        className="max-w-md text-lg leading-snug text-white sm:text-xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      {phase === 'A' && (
        <p
          className={`mt-2 max-w-sm text-[11px] leading-snug text-slate-500
                      transition-opacity duration-700
                      ${showRest ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          {config.phaseAPrivacy}
        </p>
      )}

      <div
        className={`mt-6 w-full max-w-md transition-opacity duration-700
                    ${showRest ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showRest}
      >
        {phase === 'A' ? (
          <>
            <div className="space-y-3">
              {contacts.map((value, index) => (
                <ProspectSlot
                  key={index}
                  index={index}
                  value={value}
                  isEditing={editingIndex === index}
                  onEdit={setEditingIndex}
                  onChange={updateContact}
                />
              ))}
            </div>

            {contactPickerSupported && (
              <button
                type="button"
                onClick={handleOpenContacts}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full
                           border border-slate-700 py-2.5 text-xs font-semibold text-slate-300
                           transition-colors hover:border-slate-600 hover:text-white"
              >
                <BookUser size={14} aria-hidden="true" />
                Elegir desde mi agenda
              </button>
            )}

            <button
              type="button"
              onClick={advanceToPhaseB}
              disabled={!canAdvanceToPhaseB}
              className={`mt-5 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                         uppercase tracking-wide text-white transition-all hover:bg-indigo-500
                         active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06]
                         disabled:text-white/25 disabled:shadow-none
                         ${canAdvanceToPhaseB ? GLOW_BUTTON_CLASS : ''}`}
            >
              Continuar
            </button>

            <button
              type="button"
              onClick={() => onSkip()}
              className="mt-4 block w-full text-sm text-slate-500 transition-colors
                         hover:text-white"
            >
              Saltar paso
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              {confirmedContacts.map((contact, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <User size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                    {contact.nombre}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-1 block text-[10px] font-semibold uppercase
                                   tracking-wider text-slate-500"
                        htmlFor={`sequential-action-${index}`}
                      >
                        Acción
                      </label>
                      <select
                        id={`sequential-action-${index}`}
                        value={actions[index]?.tipo ?? config.actionOptions[0].value}
                        onChange={(event) => updateAction(index, { tipo: event.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/60
                                   px-2.5 py-2 text-sm text-white focus:border-indigo-500
                                   focus:outline-none"
                      >
                        {config.actionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className="mb-1 block text-[10px] font-semibold uppercase
                                   tracking-wider text-slate-500"
                        htmlFor={`sequential-datetime-${index}`}
                      >
                        Fecha y hora
                      </label>
                      <input
                        id={`sequential-datetime-${index}`}
                        type="datetime-local"
                        value={actions[index]?.fechaHora ?? defaultDateTime(index)}
                        onChange={(event) => (
                          updateAction(index, { fechaHora: event.target.value })
                        )}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/60
                                   px-2.5 py-2 text-sm text-white [color-scheme:dark]
                                   focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveAgenda}
              className={`mt-5 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm
                         font-semibold uppercase tracking-wide text-white transition-all
                         hover:bg-indigo-500 active:scale-95 ${GLOW_BUTTON_CLASS}`}
            >
              Guardar en mi Agenda
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Piezas de confeti con CSS puro, mismo criterio que ya usa
 * `Celebration.jsx` (metas cumplidas): nada de `react-confetti` ni canvas
 * para un efecto de unos segundos que en esta pantalla ocurre una sola vez
 * en la vida de la cuenta. Reutiliza la misma animación `goal-confetti` ya
 * definida en `index.css` en vez de declarar una segunda igual con otro
 * nombre.
 */
function ConfettiBurst() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduceMotion(Boolean(query?.matches));
  }, []);

  // Sorteado una sola vez por aparición: recalcular en cada render haría
  // saltar las piezas a mitad de la caída.
  const pieces = useMemo(() => Array.from({ length: CONFETTI_PIECES }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 900,
    duration: 2200 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 140,
    size: 6 + Math.random() * 7,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotation: Math.random() * 360,
  })), []);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`absolute top-0 rounded-[2px] ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.6}px`,
            animation: `goal-confetti ${piece.duration}ms linear ${piece.delay}ms forwards`,
            '--drift': `${piece.drift}px`,
            '--spin': `${piece.rotation + 540}deg`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Paso 4a — La recompensa: confeti, el total de puntos ganados y el logro
 * estilo consola ("Achievement Unlocked"). Se monta directo al terminar el
 * Paso 3 —sin esperar ningún toque— y se desvanece sola a los
 * `REWARD_AUTO_MS`, avisando a `onDone` para que el padre revele el botón
 * "Iniciar".
 *
 * Dos logros posibles, uno por rama del Paso 3 (`achievement`, resuelto
 * por `FirstLoginIntro` según `isAdminOverloadBranch`, no aquí adentro):
 *
 *  - Prospectos ("Proyecto 200"): el numerador es el conteo real de
 *    prospectos capturados (0 si se saltó el paso), nunca un número
 *    inventado — sólo el denominador es una etiqueta fija del logro.
 *  - Tareas ("Agenda Optimizada"): no hay meta que perseguir, así que el
 *    logro no muestra fracción, sólo el nombre — el número que sí importa
 *    en esta rama (cuántas tareas se capturaron) ya se lee en el propio
 *    "+ N Puntos" de arriba.
 */
const PROSPECT_ACHIEVEMENT = {
  icon: Trophy,
  label: (count) => `${count} / ${PROJECT_GOAL} · Proyecto ${PROJECT_GOAL}`,
};
const TASK_ACHIEVEMENT = {
  icon: ListChecks,
  label: () => 'Agenda Optimizada',
};

function RewardStep({ capturedCount, achievement, onDone }) {
  const [visible, setVisible] = useState(false);
  const AchievementIcon = achievement.icon;

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);
    const hideTimer = setTimeout(() => setVisible(false), REWARD_AUTO_MS);
    const doneTimer = setTimeout(onDone, REWARD_AUTO_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex w-full flex-col items-center justify-center px-6 text-center">
      <ConfettiBurst />

      <div
        className={`relative flex flex-col items-center transition-opacity duration-700
                    ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <p
          className="text-3xl font-bold text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]
                     sm:text-4xl"
        >
          Logro desbloqueado
        </p>

        <div
          className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-400/30
                     bg-white/[0.04] px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          <AchievementIcon size={20} className="shrink-0 text-amber-400" aria-hidden="true" />
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Primera misión completada
            </p>
            <p className="text-sm font-semibold text-white">
              {achievement.label(capturedCount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Paso 5 — Unirse a un equipo de trabajo, justo antes de "Iniciar".
 *
 * Reutiliza la misma escritura real que ya usan `JoinPromotoria.jsx` y
 * `AccessBar.jsx` (`joinPromotoriaByCode`, con el mismo formato y mensajes
 * de `promotoriaCode.js`) — no una copia simplificada: el código que se
 * teclea aquí deja a la persona en `pending` de la misma promotoría, tal
 * cual como si lo hubiera hecho desde el panel de "Ver más" más adelante.
 *
 * "Saltar por ahora" existe porque unirse a un equipo no es parte de la
 * condición que hace aparecer esta introducción —a diferencia de la
 * captura de prospectos, aquí no hay ningún punto en juego—: quien no
 * tiene el código a la mano sigue su camino sin perder nada, y puede
 * hacerlo después desde su perfil.
 */
function JoinTeamStep({ onContinue }) {
  const { refreshIdentity } = useSession();
  const [code, setCode] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) {
      setError(explainCode(code));
      return;
    }

    setBusy(true);
    const { data, error: joinError } = await joinPromotoriaByCode(normalized);
    setBusy(false);

    if (joinError) {
      setError(describeError(joinError));
      return;
    }

    setJoined(data?.promotoria || 'tu promotoría');
    // Se relee la identidad ahora, no al presionar "Iniciar" más abajo: así
    // "Hoy" ya sabe que hay una promotoría en espera desde el primer
    // instante en que aparece, en vez de un segundo después.
    await refreshIdentity?.();
  };

  if (joined) {
    return (
      <div className="flex flex-col items-center px-6 text-center">
        <span
          className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                     border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          aria-hidden="true"
        >
          <CheckCircle2 size={24} strokeWidth={1.8} aria-hidden="true" />
        </span>

        <p className="text-lg font-semibold text-white">Solicitud enviada</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
          Pediste unirte a <span className="font-semibold text-slate-200">{joined}</span>.
          Falta que tu promotor apruebe tu acceso.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className={`mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     text-white transition-colors hover:bg-indigo-500 active:scale-95
                     ${GLOW_BUTTON_CLASS}`}
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center px-6 text-center">
      <span
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                   border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
        aria-hidden="true"
      >
        <Users size={24} strokeWidth={1.8} aria-hidden="true" />
      </span>

      <p className="max-w-sm text-lg leading-snug text-white sm:text-xl">{STEP5_TEXT}</p>
      <p className="mt-2 max-w-xs text-[11px] leading-snug text-white/40">{STEP5_SUBTEXT}</p>

      <div className="mt-6 w-full max-w-xs">
        <label className="sr-only" htmlFor="join-team-code">Código de promotoría</label>
        <input
          id="join-team-code"
          value={code}
          onChange={(event) => { setCode(normalizeCode(event.target.value)); setError(''); }}
          placeholder="PROMO-866-01"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
          maxLength={15}
          className="w-full rounded-xl border border-slate-700 bg-transparent px-3 py-3
                     text-center font-mono text-lg tracking-[0.15em] text-white
                     placeholder:text-slate-600 transition-colors focus:border-indigo-500
                     focus:outline-none"
        />

        {error && (
          <p
            role="alert"
            className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30
                       bg-rose-500/10 p-3 text-left text-[11px] leading-relaxed text-rose-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full
                     bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                     transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-wait disabled:opacity-70 ${GLOW_BUTTON_CLASS}`}
        >
          {isBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {isBusy ? 'Enviando…' : 'Unirme al equipo'}
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Hacerlo después
        </button>
      </div>
    </form>
  );
}

/**
 * Paso 6 — El botón final, con estética de CTA de app nativa premium en
 * vez del botón flotante genérico que compartía forma con el resto de
 * botones de avance del recorrido (`GLOW_BUTTON_CLASS`, índigo, angosto).
 * Éste es deliberadamente distinto: ancho (`w-[85%] max-w-sm`), en ámbar
 * —el mismo color que ya usa `RewardStep`, así el último gesto de la
 * introducción se siente como continuación del logro— y con un texto de ancla arriba
 * ("Tu entorno de trabajo está listo.") para que la pantalla no se lea
 * como un botón perdido en el centro de un fondo negro.
 *
 * Aparece solo, sin confeti ni texto de logro —esos ya se desvanecieron
 * con `RewardStep`—. Al presionarlo arranca el fundido de todo el overlay
 * (`closing`, en `FirstLoginIntro`) y sólo cuando ese fundido termina se
 * avisa al padre (`onComplete`) para registrar que el intro terminó y
 * montar "Hoy" por detrás.
 */
function StartStep({ onStart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex flex-col items-center px-6 text-center transition-opacity duration-700
                  ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <p className="mb-6 text-sm text-slate-400">Tu entorno de trabajo está listo.</p>

      <button
        type="button"
        onClick={onStart}
        className="flex w-[85%] max-w-sm items-center justify-center gap-3 rounded-xl
                   border border-amber-400/50 bg-amber-500 py-4 text-lg font-bold
                   tracking-wide text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.3)]
                   transition-all hover:bg-amber-400 active:scale-95"
      >
        INICIAR
        <ArrowRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Introducción de la primera entrada a la app. `TodayView.jsx` la muestra
 * mientras no exista la bandera persistente de finalización; la gamificación
 * diaria no participa en esa decisión. `inquietud`, `mercado` y `perfil` se
 * usan para calibrar el tono del Paso 2 y qué se captura en el Paso 3.
 *
 * Seis momentos en un único estado local (`step`), sin enrutador ni pila
 * de historial: es un recorrido lineal, sin "Atrás".
 *
 *   1. Saludo (`GreetingStep`)
 *   2. Enfoque empoderador (`EmpowermentStep`) — texto según `inquietud`,
 *      con un subtexto resaltado extra sólo para `low_ticket_market`
 *      (`step2HighlightFor`).
 *   3. Captura por slots — cuatro variantes posibles, decididas por
 *      `isSequentialBranch`/`isLowTicketMarketBranch`/
 *      `isAdminOverloadBranch(perfil, inquietud)`:
 *        - Prospectos (`ProspectCaptureStep`), cantidad según `mercado`.
 *        - Tareas/pendientes (`TaskCaptureStep`, perfil "Nuevo
 *          Profesional" con cuello de botella "carga administrativa"),
 *          cantidad de slots según la cartera (`mercado`, reutilizada como
 *          `PORTFOLIO_SIZE_OPTIONS` para este perfil), mínimo
 *          `MIN_FILLED_TASKS` llenos para continuar.
 *        - Híbrida (`HybridCaptureStep`, perfil "Nuevo Profesional" con
 *          cuello de botella "mercado de bajo perfil o primas pequeñas"):
 *          2 prospectos de alto perfil + 3 acciones concretas, fijos y
 *          visibles a la vez — alimenta a la vez la Zona Segura y la
 *          Agenda real.
 *        - Secuencial (`SequentialCaptureStep`, perfil "Nuevo Profesional"
 *          con cuello de botella "referidos" o "sólo busco escalar"): dos
 *          fases dentro del mismo paso, nunca ambas a la vez — primero se
 *          capturan los contactos (Fase A), y sólo al continuar aparece
 *          la Fase B, que pide acción y fecha/hora para esos mismos
 *          contactos.
 *      Las cuatro ofrecen "Continuar"/"Guardar en mi Agenda" o "Saltar paso".
 *   4. Recompensa automática (`RewardStep`) — confeti + logro,
 *      `REWARD_AUTO_MS`. El logro cambia según la rama ("Proyecto 200",
 *      "Agenda Optimizada", "Armería Desbloqueada", "Motor de Referidos"
 *      o "Modo Escala") y no otorga puntos del objetivo diario.
 *   5. Unirse a un equipo de trabajo (`JoinTeamStep`) — código real de
 *      promotoría, o "Hacerlo después"
 *   6. Botón final (`StartStep`) — la persona decide cuándo cruzar
 *
 * `onComplete()` se llama cuando termina el fundido de salida disparado por
 * "Iniciar". El padre registra una bandera de intro independiente y monta
 * "Hoy"; no existe ningún premio numérico de onboarding.
 */
export default function FirstLoginIntro({
  name, username, inquietud, mercado, perfil, onComplete,
}) {
  const [step, setStep] = useState(1);
  const [capturedCount, setCapturedCount] = useState(0);
  const [closing, setClosing] = useState(false);
  const { addEvent } = useEvents();

  /*
    Tocar en cualquier parte de la pantalla acelera un 50% la máquina de
    escribir (ver `TypewriterSpeedContext`, `useTypewriter.js`): el primer
    toque enciende el modo rápido para el resto del recorrido, sin volver a
    apagarse. Mismo mecanismo que ya usa `OnboardingFlow.jsx` (la parte
    pre-aprobación) — se repite aquí, y no se comparte un estado entre los
    dos, porque son dos componentes con ciclos de vida distintos.
  */
  const [fastTyping, setFastTyping] = useState(false);

  // Resueltos una sola vez: ni la inquietud, ni el mercado ni el perfil
  // cambian mientras esta pantalla está montada.
  const [step2Text] = useState(() => step2TextFor(inquietud));
  const [step2Highlight] = useState(() => step2HighlightFor(inquietud));
  const [isTaskBranch] = useState(() => isAdminOverloadBranch(perfil, inquietud));
  const [isHybridBranch] = useState(() => isLowTicketMarketBranch(perfil, inquietud));
  const [isSequential] = useState(() => isSequentialBranch(perfil, inquietud));
  const [sequentialConfig] = useState(() => sequentialConfigFor(inquietud));
  const [isConsolidated] = useState(() => isConsolidatedBranch(perfil));
  const [slotCount] = useState(() => (
    isTaskBranch ? taskSlotCountFor(mercado) : slotCountFor(mercado)
  ));

  const continueProspectCapture = (entries) => {
    writeSafeZone(username, entries);
    setCapturedCount(entries.length);
    setStep(4);
  };

  const skipProspectCapture = () => {
    writeSafeZone(username, []);
    setCapturedCount(0);
    setStep(4);
  };

  /*
    Cada tarea válida se manda de una vez a la Agenda real
    (`useEvents().addEvent`, el mismo contrato que ya usa
    `ActivityForm.jsx`): así, al abrir "Hoy" por primera vez, la lista ya
    aparece con los pendientes que la persona acaba de vaciar de su
    libreta — la promesa exacta de `TASK_STEP_SUBTEXT` ("nosotros nos
    encargamos de acomodarlas en tu agenda"). Todas quedan programadas para
    hoy, a la hora que cada una trae capturada (`entry.hora`, editada en
    `TaskEditorSheet` — ya no la hora escalonada y genérica de
    `defaultTaskTime` que traía cada slot al nacer). `telefono` viaja hasta
    el evento real de la Agenda —no sólo hasta el título— porque es el
    dato que en el futuro va a permitir que un aviso de esta actividad
    ofrezca "Llamar" o "Mandar WhatsApp" en vez de sólo notificar que
    existe: este paso no pregunta fecha a propósito (ver `TaskCaptureStep`),
    pero la hora y el teléfono sí se preguntan.

    La prioridad SIEMPRE es "máxima", no `DEFAULT_PRIORITY` ("importante")
    como el resto de la app: esto no es una actividad cualquiera capturada
    sin pensar mucho, es lo que la propia persona eligió vaciar de su
    libreta al arrancar — el pendiente más urgente que trae encima, y el
    primero que su asistente debe mostrarle. Crear estas tareas no otorga
    puntos; el intro se completa mediante su bandera persistente propia.
  */
  const continueTaskCapture = (entries) => {
    entries.forEach((entry) => {
      addEvent({
        type: 'actividad',
        title: `${taskTypeLabel(entry.tipo)}: ${entry.descripcion}`,
        date: todayKey(),
        time: entry.hora,
        priority: 'maxima',
        telefono: entry.telefono,
      });
    });
    setCapturedCount(entries.length);
    setStep(4);
  };

  /*
    "Saltar paso" tampoco debe dejar a la persona sin el punto de
    bienvenida: es la fuga para quien no quiere agendar nada ahora mismo,
    igual que `skipProspectCapture` en la otra rama —y esa rama sí otorga
    su punto al saltar—. Antes esta función lo dejaba en `0` a propósito
    (ver el comentario de `continueTaskCapture`), y ese `0` es justo lo que
    causaba que la introducción se quedara "atorada": `TodayView` vuelve a
    montar `FirstLoginIntro` desde el Paso 1 en cada apertura mientras los
    puntos sigan en 0, así que quien saltaba este paso veía la pantalla
    negra del Paso 1 una y otra vez sin ninguna forma de salir de ahí.
  */
  const skipTaskCapture = () => {
    setCapturedCount(0);
    setStep(4);
  };

  /*
    Rama híbrida (mercado de bajo perfil): la Sección A va a la lista de
    Prospectos/Zona Segura (`writeSafeZone`, igual que
    `continueProspectCapture`) y la Sección B va a la Agenda real
    (`addEvent`, igual que `continueTaskCapture` — incluida la prioridad
    fija "máxima": lo que la persona elige agendar aquí para acercarse a un
    prospecto de alto perfil merece el mismo peso que cualquier pendiente
    vaciado en la otra rama, no un trato de segunda). `capturedCount` es la
    suma de ambas secciones — el logro de esta rama no muestra fracción
    (`HYBRID_ACHIEVEMENT.label`), así que el número exacto no se lee en
    pantalla, pero se conserva por si alguna vez se necesita.
  */
  const continueHybridCapture = (prospectEntries, taskEntries) => {
    writeSafeZone(username, prospectEntries);
    taskEntries.forEach((entry) => {
      addEvent({
        type: 'actividad',
        title: `${taskTypeLabel(entry.tipo)}: ${entry.descripcion}`,
        date: todayKey(),
        time: entry.hora,
        priority: 'maxima',
        telefono: entry.telefono,
      });
    });
    setCapturedCount(prospectEntries.length + taskEntries.length);
    setStep(4);
  };

  /** "Saltar paso" de la rama híbrida: conserva la salida sin capturas. */
  const skipHybridCapture = () => {
    writeSafeZone(username, []);
    setCapturedCount(0);
    setStep(4);
  };

  /*
    Ramas secuenciales (referidos / sólo escalar): cada entrada ya trae
    nombre, teléfono, la acción elegida y la fecha/hora exacta —resultado
    de la Fase B de `SequentialCaptureStep`—, así que va completa a los dos
    destinos a la vez: el contacto a la Zona Segura (`writeSafeZone`,
    mismo criterio que las otras ramas con prospectos) y la acción
    agendada a la Agenda real (`addEvent`), separando la fecha y la hora
    del valor combinado `datetime-local` porque `addEvent` espera esos dos
    campos por separado (`date`, `time`), igual que el resto de la app.
    Prioridad fija "máxima": es lo mismo que ya se decidió para las otras
    ramas de este perfil — lo que la persona elige agendar aquí para
    concretar un referido o una firma no es una actividad cualquiera.
  */
  const continueSequentialCapture = (entries) => {
    writeSafeZone(username, entries.map(({ nombre, telefono }) => ({ nombre, telefono })));
    entries.forEach((entry) => {
      const [date, time] = entry.fechaHora.split('T');
      addEvent({
        type: 'actividad',
        title: `${sequentialActionLabel(sequentialConfig, entry.tipo)}: ${entry.nombre}`,
        date,
        time,
        priority: 'maxima',
        telefono: entry.telefono,
      });
    });
    setCapturedCount(entries.length);
    setStep(4);
  };

  /** "Saltar paso" de las ramas secuenciales: conserva la salida sin capturas. */
  const skipSequentialCapture = () => {
    writeSafeZone(username, []);
    setCapturedCount(0);
    setStep(4);
  };

  /*
    Rama Consolidado — "Alfombra Roja": no captura nada, sólo informa e
    inspira. El CTA lleva directo al logro (step 4) sin pasar por el Paso 3.
  */
  const continueConsolidated = () => {
    setCapturedCount(0);
    setStep(4);
  };

  const handleStart = () => {
    setClosing(true);
    setTimeout(() => onComplete(), FADE_OUT_MS);
  };

  return (
    <div
      className={`fixed inset-0 z-[95] flex min-h-screen w-full items-center justify-center
                  bg-slate-950 transition-opacity duration-700
                  ${closing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida"
      onClick={() => setFastTyping(true)}
    >
      <TypewriterSpeedContext.Provider value={fastTyping ? 2 : 1}>
        {/*
          Rama Consolidado — "Alfombra Roja": un solo paso informativo
          (ConsolidatedWelcomeStep) que fusiona saludo + empowerment +
          beneficios + CTA, sin captura de datos. El CTA dispara directo
          step 4 (Reward). Los pasos 2, 3 y 5 (JoinTeam) se omiten por
          completo: su tiempo es valioso, cero fricción.
        */}
        {isConsolidated ? (
          <>
            {step === 1 && (
              <ConsolidatedWelcomeStep
                name={name}
                onContinue={continueConsolidated}
              />
            )}
            {step === 4 && (
              <RewardStep
                capturedCount={capturedCount}
                achievement={CONSOLIDATED_ACHIEVEMENT}
                onDone={() => setStep(6)}
              />
            )}
            {step === 6 && <StartStep onStart={handleStart} />}
          </>
        ) : (
          <>
            {step === 1 && <GreetingStep name={name} onContinue={() => setStep(2)} />}
            {step === 2 && (
              <EmpowermentStep
                text={step2Text}
                highlight={step2Highlight}
                onContinue={() => setStep(3)}
              />
            )}
            {step === 3 && (
              isSequential ? (
                <SequentialCaptureStep
                  config={sequentialConfig}
                  onContinue={continueSequentialCapture}
                  onSkip={skipSequentialCapture}
                />
              ) : isHybridBranch ? (
                <HybridCaptureStep
                  onContinue={continueHybridCapture}
                  onSkip={skipHybridCapture}
                />
              ) : isTaskBranch ? (
                <TaskCaptureStep
                  slotCount={slotCount}
                  onContinue={continueTaskCapture}
                  onSkip={skipTaskCapture}
                />
              ) : (
                <ProspectCaptureStep
                  slotCount={slotCount}
                  onContinue={continueProspectCapture}
                  onSkip={skipProspectCapture}
                />
              )
            )}
            {step === 4 && (
              <RewardStep
                capturedCount={capturedCount}
                achievement={
                  isSequential ? sequentialConfig.achievement
                    : isHybridBranch ? HYBRID_ACHIEVEMENT
                      : isTaskBranch ? TASK_ACHIEVEMENT
                        : PROSPECT_ACHIEVEMENT
                }
                onDone={() => setStep(5)}
              />
            )}
            {step === 5 && <JoinTeamStep onContinue={() => setStep(6)} />}
            {step === 6 && <StartStep onStart={handleStart} />}
          </>
        )}
      </TypewriterSpeedContext.Provider>
    </div>
  );
}
