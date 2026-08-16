/**
 * src/engine/assets.js — Módulos 6 y 7: Savings/Investment Engine + Net Worth
 *
 * Distingue el ahorro DECLARADO (lo que el usuario cree que ahorra) del
 * ahorro CALCULADO (lo que el flujo realmente permite). La discrepancia
 * entre ambos es una de las señales de diagnóstico más valiosas.
 */
import { num, safeDiv, futureValue, fvAnnuity } from './utils.js';

export const ASSET_TYPES = [
  { value: 'cash', label: 'Efectivo', liquid: true, retirement: false },
  { value: 'bank', label: 'Cuentas bancarias', liquid: true, retirement: false },
  { value: 'emergency_fund', label: 'Fondo de emergencia', liquid: true, retirement: false },
  { value: 'cetes', label: 'CETES / Bonos', liquid: true, retirement: false },
  { value: 'stocks', label: 'Acciones', liquid: true, retirement: false },
  { value: 'etf', label: 'ETFs', liquid: true, retirement: false },

  /*
    Las cuentas de retiro, separadas.

    Iban en una sola opción —"Cuenta de retiro / PPR / Afore"— y no son el mismo
    instrumento: una Afore es una siefore con su régimen de inversión publicado y un
    histórico al que agarrarse, y un PPR es el contrato que cada aseguradora o casa de
    bolsa arma por su cuenta. Juntos obligaban a sugerir una sola tasa para los tres, que
    por definición estaba mal para dos.

    `retirement` NO se elimina y conserva su valor: es lo que hay guardado en el
    navegador de quien ya capturó su Afore. Quitarlo de esta lista le dejaría el activo
    sin `retirement: true`, y el módulo de retiro dejaría de contar su ahorro de un día
    para otro, sin aviso y sin nada que lo explicara en pantalla. Se queda como el cajón
    de lo que no es ninguno de los dos.

    Las tres siguen con `retirement: true` y `liquid: false`, así que ningún cálculo
    cambia de resultado: esto sólo parte una etiqueta en tres.
  */
  { value: 'afore', label: 'Afore (SIEFORE)', liquid: false, retirement: true },
  { value: 'ppr', label: 'PPR / Plan personal de retiro', liquid: false, retirement: true },
  { value: 'retirement', label: 'Otra cuenta de retiro', liquid: false, retirement: true },

  { value: 'real_estate', label: 'Bienes raíces', liquid: false, retirement: false },
  { value: 'business', label: 'Negocios', liquid: false, retirement: false },
  { value: 'other', label: 'Otro activo', liquid: false, retirement: false },
];

const TYPE_META = Object.fromEntries(ASSET_TYPES.map((t) => [t.value, t]));

export function assetTypeLabel(v) {
  return TYPE_META[v]?.label ?? 'Otro activo';
}
export function isLiquidType(v) {
  return TYPE_META[v]?.liquid ?? false;
}
export function isRetirementType(v) {
  return TYPE_META[v]?.retirement ?? false;
}

/** Umbral de tolerancia para declarar inconsistencia de ahorro. */
export const SAVINGS_MISMATCH_THRESHOLD = 0.25; // 25%


/**
 * @param {Array} assets
 * @param {object} opts
 * @param {number} opts.declaredMonthlySavings - Ahorro que el usuario declara.
 * @param {number} opts.computedMonthlySavings - Ahorro que el flujo permite.
 * @param {number} opts.sustainableIncomeMonthly
 * @param {number} opts.essentialExpensesMonthly - Base del fondo de emergencia.
 */
export function calculateAssets(assets = [], opts = {}) {
  const {
    declaredMonthlySavings = 0,
    computedMonthlySavings = 0,
    sustainableIncomeMonthly = 0,
    essentialExpensesMonthly = 0,
  } = opts;

  let totalAssets = 0;
  let liquidAssets = 0;
  let illiquidAssets = 0;
  let emergencyFund = 0;
  let retirementAssets = 0;
  let monthlyContributions = 0;

  const items = assets.map((a) => {
    const balance = Math.max(0, num(a.balance));
    const contribution = Math.max(0, num(a.monthlyContribution));
    const annualReturn = num(a.annualReturn);
    const horizon = Math.max(0, num(a.horizonYears));
    const liquid = a.liquid !== undefined ? !!a.liquid : isLiquidType(a.type);

    totalAssets += balance;
    monthlyContributions += contribution;
    if (liquid) liquidAssets += balance; else illiquidAssets += balance;
    if (a.type === 'emergency_fund') emergencyFund += balance;
    if (isRetirementType(a.type)) retirementAssets += balance;

    return {
      id: a.id, name: a.name, type: a.type,
      typeLabel: assetTypeLabel(a.type),
      balance, contribution, annualReturn, horizon, liquid,
      projectedValue: futureValue(balance, annualReturn, horizon)
        + fvAnnuity(contribution * 12, annualReturn, horizon),
    };
  });


  // Cobertura del fondo de emergencia, en meses de gasto esencial.
  // Si no hay una cuenta etiquetada como fondo, se usa la liquidez disponible.
  const emergencyBase = emergencyFund > 0 ? emergencyFund : liquidAssets;
  const emergencyMonths = safeDiv(emergencyBase, essentialExpensesMonthly);

  // Consistencia declarado vs calculado.
  const savingsGap = declaredMonthlySavings - computedMonthlySavings;
  const mismatchRatio = safeDiv(
    Math.abs(savingsGap),
    Math.max(Math.abs(declaredMonthlySavings), Math.abs(computedMonthlySavings))
  );
  const hasSavingsInconsistency = mismatchRatio > SAVINGS_MISMATCH_THRESHOLD
    && Math.abs(savingsGap) > 500;

  return {
    items,
    totalAssets,
    liquidAssets,
    illiquidAssets,
    emergencyFund: emergencyBase,
    retirementAssets,
    monthlyContributions,

    liquidityRatio: safeDiv(liquidAssets, totalAssets),
    emergencyMonths,

    declaredMonthlySavings,
    computedMonthlySavings,
    savingsGap,
    mismatchRatio,
    hasSavingsInconsistency,

    savingsRate: safeDiv(computedMonthlySavings, sustainableIncomeMonthly),
    investmentRate: safeDiv(monthlyContributions, sustainableIncomeMonthly),
  };
}


// ─── Módulo 7: Net Worth Engine ─────────────────────────────────────────────

/**
 * Patrimonio neto = Activos - Pasivos.
 * @param {object} assetResult - Salida de calculateAssets.
 * @param {object} debtResult  - Salida de calculateDebts.
 */
export function calculateNetWorth(assetResult, debtResult) {
  const totalAssets = num(assetResult?.totalAssets);
  const totalLiabilities = num(debtResult?.totalBalance);
  const netWorth = totalAssets - totalLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidAssets: num(assetResult?.liquidAssets),
    illiquidAssets: num(assetResult?.illiquidAssets),
    /** Apalancamiento: qué proporción de los activos está financiada con deuda. */
    leverageRatio: safeDiv(totalLiabilities, totalAssets),
    isNegative: netWorth < 0,
  };
}

/**
 * Proyección de patrimonio a N años (simulación, no promesa).
 * @param {number} startingNetWorth
 * @param {number} monthlySavings - Ahorro mensual sostenible.
 * @param {number} annualReturn
 * @param {number} years
 */
export function projectWealth(startingNetWorth, monthlySavings, annualReturn, years) {
  const points = [];
  const yearsN = Math.max(0, Math.floor(num(years)));
  for (let y = 0; y <= yearsN; y += 1) {
    const base = futureValue(startingNetWorth, annualReturn, y);
    const contributed = fvAnnuity(num(monthlySavings) * 12, annualReturn, y);
    points.push({ year: y, value: base + contributed });
  }
  return points;
}
