/**
 * src/engine/expenses.js — Módulo 4: Expense Engine
 *
 * Normaliza cualquier frecuencia a equivalente mensual y clasifica
 * por categoría (destino) y por prioridad (compresibilidad).
 */
import { toMonthly, oneTimeAnnual, safeDiv } from './utils.js';

export const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Vivienda' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'food', label: 'Alimentación' },
  { value: 'transportation', label: 'Transporte' },
  { value: 'education', label: 'Educación' },
  { value: 'health', label: 'Salud' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'personal_care', label: 'Cuidado personal' },
  { value: 'clothing', label: 'Vestimenta' },
  { value: 'family_support', label: 'Apoyo familiar' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'travel', label: 'Viajes' },
  { value: 'professional', label: 'Servicios profesionales' },
  { value: 'misc', label: 'Varios' },
];

export const EXPENSE_PRIORITIES = [
  { value: 'essential', label: 'Esencial', color: '#dc2626' },
  { value: 'important', label: 'Importante', color: '#ea580c' },
  { value: 'discretionary', label: 'Discrecional', color: '#ca8a04' },
  { value: 'luxury', label: 'Lujo', color: '#7c3aed' },
];

const CATEGORY_LABEL = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);

export function categoryLabel(value) {
  return CATEGORY_LABEL[value] ?? 'Varios';
}


/**
 * @param {Array} expenses
 * @param {number} sustainableIncomeMonthly - Para calcular ratios de carga.
 */
export function calculateExpenses(expenses = [], sustainableIncomeMonthly = 0) {
  const byPriority = { essential: 0, important: 0, discretionary: 0, luxury: 0 };
  const byCategory = {};
  let totalMonthly = 0;
  let oneTimeAnnualTotal = 0;

  for (const exp of expenses) {
    const monthly = toMonthly(exp.amount, exp.frequency);
    const once = oneTimeAnnual(exp.amount, exp.frequency);

    oneTimeAnnualTotal += once;
    totalMonthly += monthly;

    const priority = byPriority[exp.priority] !== undefined ? exp.priority : 'essential';
    byPriority[priority] += monthly;

    const cat = exp.category || 'misc';
    byCategory[cat] = (byCategory[cat] || 0) + monthly;
  }

  // Top 5 categorías por monto mensual.
  const topCategories = Object.entries(byCategory)
    .map(([value, amount]) => ({
      value,
      label: categoryLabel(value),
      amount,
      share: safeDiv(amount, totalMonthly),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const essentialMonthly = byPriority.essential;
  const importantMonthly = byPriority.important;
  const discretionaryMonthly = byPriority.discretionary;
  const luxuryMonthly = byPriority.luxury;

  // Gasto comprimible: lo que puede recortarse sin afectar lo esencial.
  const compressibleMonthly = discretionaryMonthly + luxuryMonthly;


  return {
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    oneTimeAnnual: oneTimeAnnualTotal,

    essentialMonthly,
    importantMonthly,
    discretionaryMonthly,
    luxuryMonthly,
    compressibleMonthly,

    byPriority,
    byCategory,
    topCategories,

    // Ratios
    essentialRatio: safeDiv(essentialMonthly, totalMonthly),
    discretionaryRatio: safeDiv(compressibleMonthly, totalMonthly),
    expenseToIncomeRatio: safeDiv(totalMonthly, sustainableIncomeMonthly),
  };
}
