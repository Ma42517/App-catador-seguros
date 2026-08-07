import { createContext, useContext, useState, useCallback } from 'react';

// ─── Estado inicial por defecto ─────────────────────────────────────────────

const defaultState = {
  profile: {
    name: 'Marco García',
    age: 30,
    retirementAge: 65,
    desiredRetirementIncome: 35000,
    hasMedicalInsurance: false,
    hasLifeInsurance: false,
  },
  incomes: [
    {
      id: '1',
      name: 'Ingreso Principal',
      amount: 45000,
      type: 'stable',
      frequency: 'monthly',
    },
  ],
  expenses: [
    {
      id: '1',
      name: 'Vivienda y Alimentación',
      amount: 22000,
      category: 'essential',
      frequency: 'monthly',
    },
  ],
  debts: [
    {
      id: '1',
      name: 'Tarjeta / Crédito',
      balance: 35000,
      monthlyPayment: 3500,
    },
  ],
  savings: {
    emergencyFund: 20000,
    retirementFund: 40000,
  },
};

// ─── Datos demo: familia mexicana realista ──────────────────────────────────

const demoData = {
  profile: {
    name: 'Familia Ramírez López',
    age: 38,
    retirementAge: 65,
    desiredRetirementIncome: 45000,
    hasMedicalInsurance: false, // Sin GMM privado
    hasLifeInsurance: false,
  },
  incomes: [
    {
      id: '1',
      name: 'Sueldo titular',
      amount: 38000,
      type: 'stable',
      frequency: 'monthly',
    },
    {
      id: '2',
      name: 'Sueldo cónyuge',
      amount: 17000,
      type: 'stable',
      frequency: 'monthly',
    },
  ],
  expenses: [
    {
      id: '1',
      name: 'Hipoteca',
      amount: 14500,
      category: 'essential',
      frequency: 'monthly',
    },
    {
      id: '2',
      name: 'Colegiaturas (2 hijos)',
      amount: 9000,
      category: 'essential',
      frequency: 'monthly',
    },
    {
      id: '3',
      name: 'Alimentación y hogar',
      amount: 8500,
      category: 'essential',
      frequency: 'monthly',
    },
    {
      id: '4',
      name: 'Transporte y gasolina',
      amount: 4000,
      category: 'essential',
      frequency: 'monthly',
    },
    {
      id: '5',
      name: 'Servicios (luz, agua, internet)',
      amount: 2800,
      category: 'essential',
      frequency: 'monthly',
    },
    {
      id: '6',
      name: 'Entretenimiento y salidas',
      amount: 3500,
      category: 'discretionary',
      frequency: 'monthly',
    },
  ],
  debts: [
    {
      id: '1',
      name: 'Crédito hipotecario',
      balance: 1800000,
      monthlyPayment: 14500,
    },
    {
      id: '2',
      name: 'Tarjeta de crédito',
      balance: 42000,
      monthlyPayment: 4200,
    },
    {
      id: '3',
      name: 'Crédito automotriz',
      balance: 180000,
      monthlyPayment: 5800,
    },
  ],
  savings: {
    emergencyFund: 35000, // Apenas ~0.8 meses de gastos esenciales
    retirementFund: 85000, // Brecha significativa en PPR
  },
};

// ─── Context ────────────────────────────────────────────────────────────────

const FinanceContext = createContext(undefined);

export function FinanceProvider({ children }) {
  const [profile, setProfile] = useState(defaultState.profile);
  const [incomes, setIncomes] = useState(defaultState.incomes);
  const [expenses, setExpenses] = useState(defaultState.expenses);
  const [debts, setDebts] = useState(defaultState.debts);
  const [savings, setSavings] = useState(defaultState.savings);

  // Carga los datos de demostración
  const loadDemoData = useCallback(() => {
    setProfile(demoData.profile);
    setIncomes(demoData.incomes);
    setExpenses(demoData.expenses);
    setDebts(demoData.debts);
    setSavings(demoData.savings);
  }, []);

  // Resetea al estado por defecto
  const resetData = useCallback(() => {
    setProfile(defaultState.profile);
    setIncomes(defaultState.incomes);
    setExpenses(defaultState.expenses);
    setDebts(defaultState.debts);
    setSavings(defaultState.savings);
  }, []);

  const value = {
    profile,
    setProfile,
    incomes,
    setIncomes,
    expenses,
    setExpenses,
    debts,
    setDebts,
    savings,
    setSavings,
    loadDemoData,
    resetData,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance debe usarse dentro de un FinanceProvider');
  }
  return context;
}
