import { useState } from 'react';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

let idCounter = 100;
const nextId = () => String(++idCounter);

const STEPS = ['Perfil', 'Ingresos', 'Gastos', 'Deudas y Ahorro'];

export default function StepWizard({ onComplete }) {
  const {
    profile, setProfile,
    incomes, setIncomes,
    expenses, setExpenses,
    debts, setDebts,
    savings, setSavings,
  } = useFinance();

  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const next = () => (isLast ? onComplete?.() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{i + 1}</div>
            {i < STEPS.length - 1 && (
              <div className={`hidden sm:block w-12 lg:w-20 h-0.5 mx-1 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
        {STEPS[step]} — Paso {step + 1} de {STEPS.length}
      </p>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {step === 0 && <ProfileStep profile={profile} setProfile={setProfile} />}
        {step === 1 && <IncomesStep incomes={incomes} setIncomes={setIncomes} />}
        {step === 2 && <ExpensesStep expenses={expenses} setExpenses={setExpenses} />}
        {step === 3 && <DebtsStep debts={debts} setDebts={setDebts} savings={savings} setSavings={setSavings} />}
      </div>

      {/* Nav */}
      <div className="flex justify-between mt-6">
        <button onClick={back} disabled={step === 0}
          className="flex items-center gap-1 px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={16} /> Anterior
        </button>
        <button onClick={next}
          className="flex items-center gap-1 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          {isLast ? (<><BarChart3 size={16} /> Ver Diagnóstico</>) : (<>Siguiente <ChevronRight size={16} /></>)}
        </button>
      </div>
    </div>
  );
}


// ─── Paso 1: Perfil ─────────────────────────────────────────────────────────

function ProfileStep({ profile, setProfile }) {
  const upd = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Perfil Personal</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input type="text" value={profile.name} onChange={(e) => upd('name', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
          <input type="number" value={profile.age} onChange={(e) => upd('age', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Edad de Retiro</label>
          <input type="number" value={profile.retirementAge} onChange={(e) => upd('retirementAge', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pensión Mensual Deseada</label>
          <input type="number" value={profile.desiredRetirementIncome} onChange={(e) => upd('desiredRetirementIncome', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="$" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={profile.hasMedicalInsurance} onChange={(e) => upd('hasMedicalInsurance', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm text-gray-700">¿Tiene GMM (Gastos Médicos Mayores)?</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={profile.hasLifeInsurance} onChange={(e) => upd('hasLifeInsurance', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
          <span className="text-sm text-gray-700">¿Tiene Seguro de Vida?</span>
        </label>
      </div>
    </div>
  );
}


// ─── Paso 2: Ingresos ───────────────────────────────────────────────────────

function IncomesStep({ incomes, setIncomes }) {
  const add = () => setIncomes((p) => [...p, { id: nextId(), name: '', amount: 0, type: 'stable', frequency: 'monthly' }]);
  const upd = (id, k, v) => setIncomes((p) => p.map((i) => (i.id === id ? { ...i, [k]: v } : i)));
  const del = (id) => setIncomes((p) => p.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Ingresos</h2>
      {incomes.map((inc) => (
        <div key={inc.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Ingreso</span>
            <button onClick={() => del(inc.id)} className="text-red-500 text-xs hover:text-red-700">Eliminar</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Nombre" value={inc.name} onChange={(e) => upd(inc.id, 'name', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <input type="number" placeholder="Monto" value={inc.amount || ''} onChange={(e) => upd(inc.id, 'amount', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <select value={inc.type} onChange={(e) => upd(inc.id, 'type', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="stable">Estable</option>
              <option value="variable">Variable</option>
              <option value="extraordinary">Extraordinario</option>
            </select>
          </div>
        </div>
      ))}
      <button onClick={add}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
        + Agregar Ingreso
      </button>
    </div>
  );
}


// ─── Paso 3: Gastos ─────────────────────────────────────────────────────────

function ExpensesStep({ expenses, setExpenses }) {
  const add = () => setExpenses((p) => [...p, { id: nextId(), name: '', amount: 0, category: 'essential', frequency: 'monthly' }]);
  const upd = (id, k, v) => setExpenses((p) => p.map((e) => (e.id === id ? { ...e, [k]: v } : e)));
  const del = (id) => setExpenses((p) => p.filter((e) => e.id !== id));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Gastos</h2>
      {expenses.map((exp) => (
        <div key={exp.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Gasto</span>
            <button onClick={() => del(exp.id)} className="text-red-500 text-xs hover:text-red-700">Eliminar</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Nombre" value={exp.name} onChange={(e) => upd(exp.id, 'name', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <input type="number" placeholder="Monto" value={exp.amount || ''} onChange={(e) => upd(exp.id, 'amount', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <select value={exp.category} onChange={(e) => upd(exp.id, 'category', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="essential">Esencial</option>
              <option value="discretionary">Discrecional</option>
            </select>
          </div>
        </div>
      ))}
      <button onClick={add}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
        + Agregar Gasto
      </button>
    </div>
  );
}


// ─── Paso 4: Deudas y Ahorro ────────────────────────────────────────────────

function DebtsStep({ debts, setDebts, savings, setSavings }) {
  const add = () => setDebts((p) => [...p, { id: nextId(), name: '', balance: 0, monthlyPayment: 0 }]);
  const upd = (id, k, v) => setDebts((p) => p.map((d) => (d.id === id ? { ...d, [k]: v } : d)));
  const del = (id) => setDebts((p) => p.filter((d) => d.id !== id));
  const updS = (k, v) => setSavings((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Deudas</h2>
        {debts.map((d) => (
          <div key={d.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Deuda</span>
              <button onClick={() => del(d.id)} className="text-red-500 text-xs hover:text-red-700">Eliminar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Nombre" value={d.name} onChange={(e) => upd(d.id, 'name', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <input type="number" placeholder="Saldo" value={d.balance || ''} onChange={(e) => upd(d.id, 'balance', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <input type="number" placeholder="Pago mensual" value={d.monthlyPayment || ''} onChange={(e) => upd(d.id, 'monthlyPayment', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        ))}
        <button onClick={add}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
          + Agregar Deuda
        </button>
      </div>

      <div className="space-y-4 border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-800">Ahorro Actual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fondo de Emergencia</label>
            <input type="number" value={savings.emergencyFund || ''} onChange={(e) => updS('emergencyFund', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="$" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ahorro para Retiro</label>
            <input type="number" value={savings.retirementFund || ''} onChange={(e) => updS('retirementFund', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="$" />
          </div>
        </div>
      </div>
    </div>
  );
}
