/**
 * Datos y cálculos de la Cita Inicial.
 *
 * Todo lo que se puede calcular vive aquí y no dentro de los pasos. La razón no
 * es orden por el orden: estas cifras se dicen en voz alta frente a un
 * prospecto, así que cada división tiene que estar protegida contra el cero y
 * cada resta contra un resultado negativo. Reunidas en un solo archivo, esas
 * defensas se ven de un vistazo; repartidas en siete pasos, la que falta no se
 * nota hasta que aparece un "NaN" o un "Infinity" en la pantalla, delante del
 * cliente.
 *
 * Ninguna función guarda nada: reciben números y devuelven números. Los pasos
 * conservan lo que el asesor teclea y los montos se derivan en cada render, que
 * es lo que hace que la pantalla responda mientras se escribe.
 */

/** Formato de moneda del proyecto, redondeado a pesos. */
export function formatMoney(amount) {
  if (!Number.isFinite(amount)) return '$0';
  return `$${Math.round(amount).toLocaleString('es-MX')}`;
}

/**
 * Versión corta para los montos grandes del termómetro.
 *
 * "5 millones" se lee de un golpe; "$5,000,000" obliga a contar comas, y aquí
 * el prospecto tiene que reconocer la cifra en el segundo en que se la señalan.
 */
export function formatShortMoney(amount) {
  if (amount >= 1000000) return `$${amount / 1000000} millones`;
  if (amount >= 1000) return `$${amount / 1000} mil`;
  return `$${amount}`;
}

// ── Paso 1: credenciales ─────────────────────────────────────────────────────

export const COMPANY_FACTS = [
  {
    key: 'anos',
    value: '80 años',
    label: 'de experiencia',
    detail: 'Respaldo de New York Life, fundada en 1845.',
  },
  {
    key: 'calificacion',
    value: 'AAA',
    label: 'calificación',
    detail: 'La más alta en fortaleza financiera del sector.',
  },
  {
    key: 'duracion',
    value: '45 min',
    label: 'este proceso',
    detail: 'Sin compromiso de compra. Sales con tu diagnóstico.',
  },
];

// ── Paso 2: pirámide de necesidades ──────────────────────────────────────────

/**
 * Los cuatro niveles, del más urgente al más lejano.
 *
 * El orden del arreglo es de abajo hacia arriba, igual que la pirámide que se
 * dibuja: la salud sostiene todo lo demás porque una enfermedad sin cobertura se
 * come el ahorro y el retiro de golpe. Ese es el argumento de la conversación, y
 * el arreglo lo refleja para que la vista no tenga que invertirlo.
 */
export const PYRAMID_LEVELS = [
  {
    key: 'salud',
    label: 'Salud',
    tagline: 'Lo que pagas si hoy te enfermas',
    description: 'Gastos médicos mayores, hospitalización y tratamientos. Es la base: '
      + 'una emergencia sin cobertura consume en semanas lo que tomó años juntar.',
    tone: 'from-rose-500/80 to-rose-600/80',
    width: 'w-full',
  },
  {
    key: 'proteccion',
    label: 'Protección',
    tagline: 'Lo que reciben los tuyos si tú faltas',
    description: 'Seguro de vida. Sustituye tu ingreso el tiempo suficiente para que tu '
      + 'familia no cambie de vida por tu ausencia.',
    tone: 'from-amber-500/80 to-orange-600/80',
    width: 'w-[85%]',
  },
  {
    key: 'acumulacion',
    label: 'Acumulación',
    tagline: 'Lo que juntas para lo que sí planeas',
    description: 'Ahorro con propósito: la universidad de tus hijos, el enganche de una '
      + 'casa, un negocio. Dinero que crece con reglas, no con sobras.',
    tone: 'from-sky-500/80 to-blue-600/80',
    width: 'w-[70%]',
  },
  {
    key: 'retiro',
    label: 'Retiro',
    tagline: 'Lo que te sostiene cuando dejes de trabajar',
    description: 'El ingreso que reemplaza tu sueldo por veinte años o más. Es el nivel '
      + 'más alto porque sólo se construye si los de abajo están resueltos.',
    tone: 'from-indigo-500/80 to-violet-600/80',
    width: 'w-[55%]',
  },
];

// ── Paso 3: ejercicio de salud ───────────────────────────────────────────────

/**
 * Los montos del termómetro, de mayor a menor.
 *
 * Bajan en saltos de diez porque el ejercicio busca el punto exacto donde la
 * respuesta cambia de "no" a "sí". Ese punto es la cifra que el prospecto puede
 * cubrir hoy, y todo lo que quede por encima es el hueco que hay que asegurar.
 */
export const THERMOMETER_AMOUNTS = [5000000, 500000, 50000, 5000, 500];

export const PAYMENT_METHODS = [
  { key: 'tarjeta', label: 'Tarjeta de crédito', cost: 'Intereses de hasta 100% anual' },
  { key: 'casa', label: 'Vender la casa', cost: 'Pierdes el patrimonio de años' },
  { key: 'ahorros', label: 'Ahorros', cost: 'Se va lo que era para otra cosa' },
  { key: 'prestamo', label: 'Préstamo familiar', cost: 'Trasladas el problema a otro' },
];

/**
 * El primer monto que el prospecto declara poder pagar.
 *
 * Devuelve `null` si dijo que no a todos, y ese caso no es un error: es el
 * hallazgo más importante del ejercicio, porque significa que ni quinientos
 * pesos están disponibles hoy.
 */
export function firstAffordable(answers) {
  const found = THERMOMETER_AMOUNTS.find((amount) => answers[amount] === true);
  return found ?? null;
}

// ── Paso 4: protección ───────────────────────────────────────────────────────

export function annualIncome(monthlyIncome) {
  const monthly = Number(monthlyIncome) || 0;
  return monthly > 0 ? monthly * 12 : 0;
}

/** Suma asegurada recomendada: el ingreso anual por los años de colchón. */
export function recommendedCoverage(monthlyIncome, cushionYears) {
  const years = Number(cushionYears) || 0;
  if (years <= 0) return 0;
  return annualIncome(monthlyIncome) * years;
}

// ── Paso 5: el pasado ────────────────────────────────────────────────────────

export const SAVING_HABITS = [
  { value: 'banco', label: 'En el banco' },
  { value: 'alcancia', label: 'Alcancía' },
  { value: 'inversion', label: 'Inversión' },
  { value: 'nada', label: 'No ahorro' },
];

/**
 * Cuánto dinero ha pasado por sus manos.
 *
 * Usa el ingreso actual para todos los años trabajados, y conviene saber que es
 * una simplificación deliberada: nadie recuerda cuánto ganaba hace quince años,
 * y pedirlo convertiría un ejercicio de treinta segundos en un interrogatorio.
 * La cifra sirve para el impacto —"esto pasó por tus manos y no se quedó
 * nada"—, no para una auditoría.
 */
export function lifetimeEarnings({ startWorkAge, currentAge, monthlyIncome }) {
  const start = Number(startWorkAge) || 0;
  const now = Number(currentAge) || 0;
  const yearsWorked = now > start ? now - start : 0;
  return {
    yearsWorked,
    total: yearsWorked > 0 ? annualIncome(monthlyIncome) * yearsWorked : 0,
  };
}

// ── Paso 6: el futuro ────────────────────────────────────────────────────────

/**
 * El costo del retiro y el esfuerzo mensual que exige.
 *
 * `monthlySaving` vale `null` cuando no quedan años para ahorrar —alguien que ya
 * alcanzó su edad de retiro—, en vez de un infinito. Dividir entre cero daría
 * "Infinity" en la pantalla, y esa palabra en una hoja de retiro no se puede
 * explicar delante de nadie.
 */
export function retirementPlan({
  currentAge, retireAge, lifeExpectancy, desiredMonthly,
}) {
  const now = Number(currentAge) || 0;
  const retire = Number(retireAge) || 0;
  const life = Number(lifeExpectancy) || 0;

  const retirementYears = life > retire ? life - retire : 0;
  const yearsToSave = retire > now ? retire - now : 0;
  const totalCost = retirementYears > 0 ? annualIncome(desiredMonthly) * retirementYears : 0;

  return {
    retirementYears,
    yearsToSave,
    totalCost,
    monthlySaving: yearsToSave > 0 && totalCost > 0
      ? totalCost / yearsToSave / 12
      : null,
  };
}

// ── Paso 7: conclusiones ─────────────────────────────────────────────────────

/** El rango recomendado de ahorro anual: entre el 10% y el 15% del ingreso. */
export function savingCapacity(annual) {
  const base = Number(annual) || 0;
  return { low: base * 0.10, high: base * 0.15 };
}

export const CURRENCY_OPTIONS = [
  {
    value: 'udis',
    label: 'UDIs',
    detail: 'Se ajustan con la inflación de México. Tu suma asegurada no pierde '
      + 'poder de compra con los años.',
  },
  {
    value: 'dolares',
    label: 'Dólares',
    detail: 'Protege contra la devaluación del peso. Conviene si tus gastos '
      + 'grandes están en dólares.',
  },
];

// ── Cuestionario médico del Cierre ───────────────────────────────────────────

/**
 * Índice de masa corporal.
 *
 * Devuelve `null` en lugar de cero cuando falta un dato: un IMC de 0 se
 * mostraría como "Bajo peso" y sería un dato inventado sobre la salud de alguien.
 */
export function bodyMassIndex(weightKg, heightCm) {
  const weight = Number(weightKg) || 0;
  const height = Number(heightCm) || 0;
  if (weight <= 0 || height <= 0) return null;
  const meters = height / 100;
  return weight / (meters * meters);
}

/**
 * Lectura del IMC en palabras.
 *
 * Se incluye "Bajo peso" aunque no estuviera en la lista pedida: para una
 * aseguradora también es un factor de riesgo, y omitirlo mostraría "Normal" a
 * quien no lo está.
 */
export function bmiVerdict(bmi) {
  if (bmi === null) return null;
  if (bmi < 18.5) {
    return { label: 'Bajo peso', tone: 'text-amber-300', ring: 'border-amber-500/30 bg-amber-500/10' };
  }
  if (bmi < 25) {
    return { label: 'Normal', tone: 'text-emerald-300', ring: 'border-emerald-500/30 bg-emerald-500/10' };
  }
  if (bmi < 30) {
    return { label: 'Sobrepeso', tone: 'text-amber-300', ring: 'border-amber-500/30 bg-amber-500/10' };
  }
  return { label: 'Riesgo', tone: 'text-rose-300', ring: 'border-rose-500/30 bg-rose-500/10' };
}

/**
 * Las preguntas del cuestionario.
 *
 * `follow` es el campo que se despliega al responder que sí. Vive en los datos y
 * no en el JSX porque así añadir una pregunta con seguimiento no obliga a tocar
 * el componente, que es donde se rompen las cosas.
 */
export const MEDICAL_QUESTIONS = [
  {
    key: 'fuma',
    question: '¿Fumas o has fumado en los últimos 5 años?',
    follow: { key: 'cigarrosDia', label: 'Cantidad al día', suffix: 'cig.' },
  },
  {
    key: 'deportes',
    question: '¿Practicas deportes de riesgo? (motociclismo, buceo, paracaidismo…)',
  },
  {
    key: 'cronicas',
    question: '¿Padeces o has padecido hipertensión, diabetes o cáncer?',
  },
  {
    key: 'cirugias',
    question: '¿Has tenido cirugías en los últimos 5 años?',
  },
  {
    key: 'hereditarias',
    question: '¿Tus padres o hermanos padecen enfermedades crónicas hereditarias?',
  },
];
