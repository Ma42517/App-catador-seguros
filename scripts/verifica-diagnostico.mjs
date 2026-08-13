/**
 * Verificación del motor del Diagnóstico 360.
 *
 * Cada caso de aquí corresponde a un error que estaba en producción. No son
 * pruebas de que el código funcione en general: son la prueba de que estos seis
 * errores concretos no pueden volver sin que algo grite.
 *
 * Se ejecuta con `node scripts/verifica-diagnostico.mjs`.
 */
import { buildMatrix } from '../src/engine/matrix.js';
import { calculateDebts } from '../src/engine/debt.js';
import { calculateTaxes } from '../src/engine/taxes.js';
import { runConsistencyChecks } from '../src/engine/consistency.js';
import { buildRecommendations } from '../src/engine/recommendations.js';
import { createEmptyState } from '../src/data/defaults.js';
import { createDemoState } from '../src/data/demoData.js';

let fallos = 0;

function check(nombre, condicion, detalle) {
  const ok = !!condicion;
  if (!ok) fallos += 1;
  console.log(`${ok ? '  ok  ' : ' FALLA'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

function estadoBase(patch = {}) {
  return { ...createEmptyState(), ...patch };
}

// ── 1. Los impuestos no se cuentan dos veces en la brecha ──────────────────
{
  console.log('\n1. Doble contabilidad fiscal en la brecha de ingreso');

  const state = estadoBase({
    profile: { ...createEmptyState().profile, incomeType: 'gross' },
    incomes: [{
      id: 'i1', name: 'Sueldo', group: 'labor', type: 'salary',
      amount: 100000, frequency: 'monthly', stability: 'stable',
    }],
    taxes: {
      withheld: 20000, additionalPaid: 0, provisionalPayments: 0,
      refunds: 0, frequency: 'monthly',
    },
    expenses: [{
      id: 'e1', name: 'Vida', category: 'housing',
      amount: 80000, frequency: 'monthly', priority: 'essential',
    }],
  });

  const m = buildMatrix(state, { mode: 'current' });

  // Gana 100 bruto, paga 20 de impuestos, gasta 80: el neto alcanza exacto.
  check('ingreso bruto sostenible = 100,000', m.SUSTAINABLE_GROSS === 100000);
  check('ingreso neto = 80,000', m.INCOME_SUSTAINABLE === 80000);
  check('ingreso requerido = 100,000 (incluye impuestos)', m.REQUIRED_INCOME === 100000);
  check('flujo libre = 0', m.NET_CASHFLOW === 0);
  check(
    'brecha = 0, no 20,000',
    m.INCOME_GAP === 0,
    `brecha reportada: ${m.INCOME_GAP}`,
  );

  const hallazgos = runConsistencyChecks(m, state);
  check(
    'sin descuadre de brecha',
    !hallazgos.some((h) => h.id === 'gap_drift'),
  );
}

// ── 2. El diagnóstico vacío no inventa un veredicto ────────────────────────
{
  console.log('\n2. Diagnóstico vacío');

  const m = buildMatrix(estadoBase(), { mode: 'current' });

  check('salud = null (no evaluable)', m.healthScore === null, `valor: ${m.healthScore}`);
  check('luz de flujo neutral', m.lights.cashflow === 'neutral');
  check('luz de emergencia neutral', m.lights.emergency === 'neutral');
  check('luz de metas neutral', m.lights.goals === 'neutral');
  check('luz de retiro neutral', m.lights.retirement === 'neutral');
  /*
    Ni verde ni rojo. Sin deuda pero también sin ingreso no hay nada que afirmar,
    y darlo por bueno dejaba el puntaje en 100 de 100 con la captura en blanco.
  */
  check('luz de deuda neutral, no verde', m.lights.debt === 'neutral');

  const recs = buildRecommendations(m);
  check(
    'sin recomendación de fondo de emergencia',
    !recs.some((r) => r.id === 'emergency_fund'),
  );
  check(
    'sin reproche de tasa de ahorro',
    !recs.some((r) => r.id === 'low_savings_rate'),
  );
}

// ── 3. Sin metas, la viabilidad no es un cero rojo ─────────────────────────
{
  console.log('\n3. Sin metas registradas');

  const state = estadoBase({
    incomes: [{
      id: 'i1', name: 'Sueldo', group: 'labor', type: 'salary',
      amount: 50000, frequency: 'monthly', stability: 'stable',
    }],
    expenses: [{
      id: 'e1', name: 'Vida', category: 'housing',
      amount: 30000, frequency: 'monthly', priority: 'essential',
    }],
  });

  const m = buildMatrix(state, { mode: 'current' });
  check('viabilidad de metas = 1', m.goals.overallFeasibility === 1);
  check('luz de metas neutral, no roja', m.lights.goals === 'neutral');
}

// ── 4. Sin pensión deseada, el retiro no se contradice ─────────────────────
{
  console.log('\n4. Sin pensión deseada');

  const m = buildMatrix(estadoBase(), { mode: 'current' });
  check('capital requerido = 0', m.retirement.requiredCapital === 0);
  check('avance = 1 (nada que cerrar)', m.retirement.progress === 1);
  check('en trayectoria', m.retirement.isOnTrack === true);
  check('luz de retiro neutral, no roja', m.lights.retirement === 'neutral');
}

// ── 5. Deuda sin ingreso registrado no es luz verde ────────────────────────
{
  console.log('\n5. Deuda sin ingreso');

  const state = estadoBase({
    debts: [{
      id: 'd1', name: 'Tarjeta', type: 'credit_card', balance: 50000,
      interestRate: 0.48, minPayment: 2000, actualPayment: 2000, creditLimit: 60000,
    }],
  });

  const m = buildMatrix(state, { mode: 'current' });
  check('razón deuda/ingreso = 0 por división vacía', m.debts.debtToIncomeRatio === 0);
  check(
    'luz de deuda ROJA, no verde',
    m.lights.debt === 'red',
    `luz: ${m.lights.debt}`,
  );
}

// ── 6. La frecuencia de impuestos por omisión es mensual ───────────────────
{
  console.log('\n6. Impuestos sin frecuencia declarada');

  const sinFrecuencia = calculateTaxes({ withheld: 1200 }, 'gross', 10000);
  check(
    'monto mensual = 1,200 (no 100)',
    sinFrecuencia.totalTaxMonthly === 1200,
    `valor: ${sinFrecuencia.totalTaxMonthly}`,
  );
}

// ── 7. Las simulaciones duplicadas ya no se calculan ───────────────────────
{
  console.log('\n7. Simulaciones de liquidación duplicadas');

  const agregados = calculateDebts([{
    id: 'd1', name: 'Tarjeta', type: 'credit_card', balance: 50000,
    interestRate: 0.48, minPayment: 2000, actualPayment: 3000,
  }], 40000);

  check('calculateDebts no devuelve avalanche', agregados.avalanche === undefined);
  check('calculateDebts no devuelve snowball', agregados.snowball === undefined);

  const m = buildMatrix(estadoBase({
    debts: [{
      id: 'd1', name: 'Tarjeta', type: 'credit_card', balance: 50000,
      interestRate: 0.48, minPayment: 2000, actualPayment: 3000,
    }],
    incomes: [{
      id: 'i1', name: 'Sueldo', group: 'labor', type: 'salary',
      amount: 40000, frequency: 'monthly', stability: 'stable',
    }],
  }), { mode: 'current' });

  check('payoffPlans sigue disponible', !!m.payoffPlans.avalanche);
  check(
    'y usa el excedente real como acelerador',
    m.payoffPlans.accelerator === m.NET_CASHFLOW,
    `acelerador: ${Math.round(m.payoffPlans.accelerator)}`,
  );
}

// ── 8. El caso realista sigue funcionando ──────────────────────────────────
{
  console.log('\n8. Datos de ejemplo (familia Hernández Ruiz)');

  const m = buildMatrix(createDemoState(), { mode: 'current' });

  check(
    'salud es un número, no null',
    typeof m.healthScore === 'number',
    `salud: ${m.healthScore}`,
  );
  check(
    'los cinco indicadores son evaluables',
    Object.values(m.lights).every((l) => l !== 'neutral'),
    Object.entries(m.lights).map(([k, v]) => `${k}:${v}`).join(' '),
  );

  const hallazgos = runConsistencyChecks(m, createDemoState());
  const descuadres = hallazgos.filter((h) => h.id.endsWith('_drift'));
  check(
    'la matriz cuadra consigo misma',
    descuadres.length === 0,
    descuadres.map((d) => d.id).join(', ') || 'sin descuadres',
  );
  check(
    'detecta la inconsistencia de ahorro sembrada en el ejemplo',
    hallazgos.some((h) => h.id === 'savings_mismatch'),
  );

  const recs = buildRecommendations(m);
  check('genera recomendaciones', recs.length > 0, `${recs.length} recomendaciones`);
  check(
    'la más urgente va primero',
    recs[0].severity === 'critical' || recs[0].severity === 'high',
    `primera: ${recs[0].severity}`,
  );
}

// ── Cierre ─────────────────────────────────────────────────────────────────
console.log(`\n${fallos === 0 ? 'Todo en orden.' : `${fallos} verificaciones fallaron.`}`);
if (fallos > 0) throw new Error(`${fallos} verificaciones del diagnóstico fallaron`);
