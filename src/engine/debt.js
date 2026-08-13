/**
 * src/engine/debt.js — Módulo 5: Debt Engine
 *
 * El servicio de deuda usa el pago REAL (actualPayment), con el pago mínimo
 * como piso. Liquidar una deuda libera su pago del flujo de inmediato.
 */
import { num, safeDiv, toMonthlyRate, payoffMonths, totalInterest } from './utils.js';

export const DEBT_TYPES = [
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'auto', label: 'Crédito automotriz' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'personal', label: 'Préstamo personal' },
  { value: 'student', label: 'Crédito educativo' },
  { value: 'payroll', label: 'Crédito de nómina' },
  { value: 'business', label: 'Crédito de negocio' },
  { value: 'family', label: 'Préstamo familiar' },
  { value: 'other', label: 'Otra deuda' },
];

const TYPE_LABEL = Object.fromEntries(DEBT_TYPES.map((t) => [t.value, t.label]));
export function debtTypeLabel(v) {
  return TYPE_LABEL[v] ?? 'Otra deuda';
}

/** Normaliza una deuda y calcula sus métricas individuales. */
export function analyzeDebt(debt) {
  const balance = Math.max(0, num(debt.balance));
  const annualRate = num(debt.interestRate);
  const monthlyRate = toMonthlyRate(annualRate);
  const minPayment = Math.max(0, num(debt.minPayment));
  // El pago real nunca puede ser menor al mínimo declarado.
  const payment = Math.max(minPayment, num(debt.actualPayment));

  const monthlyInterest = balance * monthlyRate;
  const principalPortion = Math.max(0, payment - monthlyInterest);
  const months = payoffMonths(balance, monthlyRate, payment);
  const interestCost = totalInterest(balance, monthlyRate, payment);

  const isCreditCard = debt.type === 'credit_card';
  const creditLimit = num(debt.creditLimit);
  const utilization = isCreditCard ? safeDiv(balance, creditLimit) : null;


  return {
    id: debt.id,
    name: debt.name,
    type: debt.type,
    typeLabel: debtTypeLabel(debt.type),
    linkedAsset: debt.linkedAsset || null,

    balance,
    annualRate,
    monthlyRate,
    minPayment,
    payment,

    monthlyInterest,
    principalPortion,
    /** null = el pago no cubre intereses, la deuda nunca se liquida. */
    payoffMonths: months,
    totalInterest: interestCost,

    isCreditCard,
    creditLimit,
    utilization,
    /** Pago mínimo para no capitalizar intereses en tarjeta. */
    interestOnlyPayment: isCreditCard ? monthlyInterest : null,
    isNeverPaidOff: months === null,
  };
}

/**
 * Simulación de liquidación acelerada.
 * @param {Array} analyzed - Deudas ya analizadas.
 * @param {'avalanche'|'snowball'} method
 * @param {number} extraPayment - Excedente mensual destinado a acelerar.
 */
export function simulatePayoff(analyzed, method = 'avalanche', extraPayment = 0) {
  // Orden de ataque: avalanche = mayor tasa primero; snowball = menor saldo primero.
  const queue = [...analyzed]
    .filter((d) => d.balance > 0)
    .sort((a, b) => (method === 'avalanche'
      ? b.annualRate - a.annualRate
      : a.balance - b.balance));

  if (queue.length === 0) {
    return { method, months: 0, totalInterest: 0, order: [], freedCashflow: 0 };
  }


  // Estado mutable local de la simulación (no altera la entrada).
  const state = queue.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    rate: d.monthlyRate,
    payment: d.payment,
    paidOffMonth: null,
  }));

  let month = 0;
  let interestAccrued = 0;
  let rollover = Math.max(0, num(extraPayment));
  const MAX_MONTHS = 600; // tope de 50 años para evitar bucles infinitos

  while (month < MAX_MONTHS && state.some((d) => d.balance > 0.01)) {
    month += 1;
    let available = rollover;

    // 1) Pago base de cada deuda activa.
    for (const d of state) {
      if (d.balance <= 0.01) continue;
      const interest = d.balance * d.rate;
      interestAccrued += interest;
      d.balance += interest;
      const pay = Math.min(d.payment, d.balance);
      d.balance -= pay;
      // Si sobra del pago base al liquidarse, se recicla.
      available += Math.max(0, d.payment - pay);
    }

    // 2) El excedente ataca la deuda prioritaria activa.
    for (const d of state) {
      if (available <= 0) break;
      if (d.balance <= 0.01) continue;
      const pay = Math.min(available, d.balance);
      d.balance -= pay;
      available -= pay;
    }

    // 3) Registrar liquidaciones y liberar su pago al rollover.
    for (const d of state) {
      if (d.balance <= 0.01 && d.paidOffMonth === null) {
        d.paidOffMonth = month;
        rollover += d.payment;
      }
    }
  }


  const settled = state.every((d) => d.balance <= 0.01);

  return {
    method,
    months: settled ? month : null,
    totalInterest: interestAccrued,
    /** Flujo mensual que se libera cuando toda la deuda queda liquidada. */
    freedCashflow: queue.reduce((sum, d) => sum + d.payment, 0),
    order: state.map((d) => ({
      id: d.id,
      name: d.name,
      paidOffMonth: d.paidOffMonth,
    })),
  };
}

/**
 * Agregados de deuda del hogar.
 *
 * No simula la liquidación acelerada, y es a propósito: el excedente que la
 * acelera se conoce después, cuando ya existe el flujo de caja, y el flujo de caja
 * necesita el servicio de deuda que se calcula aquí. Esa simulación vive en
 * `matrix.payoffPlans`, que es quien tiene el excedente real.
 *
 * Antes se hacía en los dos lados: aquí con excedente cero y allá con el de
 * verdad. Las de aquí no las leía nadie —dos recorridos de hasta 600 meses cada
 * uno, por cada una de las tres matrices, en cada tecla— y quedaban a un descuido
 * de que alguien las mostrara creyendo que incluían el excedente.
 *
 * @param {Array} debts
 * @param {number} sustainableIncomeMonthly
 */
export function calculateDebts(debts = [], sustainableIncomeMonthly = 0) {
  const analyzed = debts.map(analyzeDebt);

  const totalBalance = analyzed.reduce((s, d) => s + d.balance, 0);
  const monthlyService = analyzed.reduce((s, d) => s + d.payment, 0);
  const monthlyMinimum = analyzed.reduce((s, d) => s + d.minPayment, 0);
  const monthlyInterest = analyzed.reduce((s, d) => s + d.monthlyInterest, 0);

  // Deuda con la vida más larga define el horizonte del hogar.
  const finite = analyzed.filter((d) => d.payoffMonths !== null);
  const longestPayoff = finite.length
    ? Math.max(...finite.map((d) => d.payoffMonths))
    : null;
  const hasUnpayableDebt = analyzed.some((d) => d.isNeverPaidOff && d.balance > 0);


  const cards = analyzed.filter((d) => d.isCreditCard);
  const cardUtilization = safeDiv(
    cards.reduce((s, d) => s + d.balance, 0),
    cards.reduce((s, d) => s + d.creditLimit, 0)
  );

  // Deuda más cara: el objetivo racional de ataque.
  const mostExpensive = [...analyzed]
    .filter((d) => d.balance > 0)
    .sort((a, b) => b.annualRate - a.annualRate)[0] || null;

  const debtToIncomeRatio = safeDiv(monthlyService, sustainableIncomeMonthly);

  return {
    items: analyzed,
    totalBalance,
    monthlyService,
    monthlyMinimum,
    monthlyInterest,
    annualInterest: monthlyInterest * 12,

    debtToIncomeRatio,
    /** Proporción del pago que sólo cubre intereses. */
    interestShareOfService: safeDiv(monthlyInterest, monthlyService),

    longestPayoff,
    hasUnpayableDebt,
    cardUtilization: cards.length ? cardUtilization : null,
    mostExpensive,
  };
}
