import { useMemo } from 'react';
import {
  DollarSign, TrendingDown, CreditCard, Wallet,
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Heart, Target, MessageCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { runDiagnosis } from '../../engine/finance';
import ReferralGate from './ReferralGate';

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

function Badge({ status, label }) {
  const colors = { green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800' };
  const icons = { green: <CheckCircle2 size={14} />, yellow: <AlertTriangle size={14} />, red: <ShieldAlert size={14} /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {icons[status]} {label}
    </span>
  );
}

export default function ExecutiveDashboard() {
  const { profile, incomes, expenses, debts, savings } = useFinance();

  const diagnosis = useMemo(() => {
    const mapped = {
      incomes: incomes.map((i) => ({
        amount: i.amount, frequency: i.frequency || 'monthly',
        type: i.type === 'stable' ? 'fixed' : i.type,
      })),
      expenses: expenses.map((e) => ({
        amount: e.amount, frequency: e.frequency || 'monthly', category: e.category,
      })),
      debts,
      emergencyFund: savings.emergencyFund,
      retirement: {
        currentAge: profile.age, retirementAge: profile.retirementAge,
        desiredMonthlyIncome: profile.desiredRetirementIncome,
        currentSavings: savings.retirementFund,
        expectedReturn: 0.08, expectedInflation: 0.04,
      },
    };
    return runDiagnosis(mapped);
  }, [profile, incomes, expenses, debts, savings]);


  const debtStatus = diagnosis.debtRatio < 0.3 ? 'green' : diagnosis.debtRatio <= 0.5 ? 'yellow' : 'red';
  const debtLabel = debtStatus === 'green' ? 'Saludable' : debtStatus === 'yellow' ? 'Precaución' : 'Crítico';
  const emerMonths = diagnosis.emergencyCoverageMonths;
  const emerStatus = emerMonths >= 6 ? 'green' : emerMonths >= 3 ? 'yellow' : 'red';
  const emerLabel = emerStatus === 'green' ? 'Adecuado' : emerStatus === 'yellow' ? 'Insuficiente' : 'Crítico';

  const whatsappLink = `https://wa.me/5215512345678?text=${encodeURIComponent(
    `Hola, me interesa una consultoría financiera. Brecha de retiro: ${fmt(diagnosis.retirement.gap)}.`
  )}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Diagnóstico de {profile.name}</h2>
        <p className="text-sm text-gray-500 mt-1">Resumen ejecutivo de salud financiera</p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <DollarSign size={18} />
            <span className="text-xs font-medium uppercase tracking-wide">Ingreso Sostenible</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(diagnosis.income.totalRecurring)}</p>
          <p className="text-xs text-gray-400 mt-1">mensual</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <TrendingDown size={18} />
            <span className="text-xs font-medium uppercase tracking-wide">Gastos Totales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(diagnosis.expenses.totalMonthly)}</p>
          <p className="text-xs text-gray-400 mt-1">mensual</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <CreditCard size={18} />
            <span className="text-xs font-medium uppercase tracking-wide">Servicio de Deuda</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(diagnosis.debts.totalMonthlyPayment)}</p>
          <p className="text-xs text-gray-400 mt-1">mensual</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Wallet size={18} />
            <span className="text-xs font-medium uppercase tracking-wide">Flujo de Caja Libre</span>
          </div>
          <p className={`text-2xl font-bold ${diagnosis.cashFlow.netMonthly >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {fmt(diagnosis.cashFlow.netMonthly)}
          </p>
          <p className="text-xs text-gray-400 mt-1">mensual</p>
        </div>
      </div>


      {/* Semáforo de Salud Financiera */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600" />
          Semáforo de Salud Financiera
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Tasa de Endeudamiento</p>
            <p className="text-lg font-bold text-gray-900 mb-2">{(diagnosis.debtRatio * 100).toFixed(1)}%</p>
            <Badge status={debtStatus} label={debtLabel} />
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Fondo de Emergencia</p>
            <p className="text-lg font-bold text-gray-900 mb-2">{emerMonths.toFixed(1)} meses</p>
            <Badge status={emerStatus} label={emerLabel} />
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Gastos Médicos Mayores</p>
            {profile.hasMedicalInsurance ? (
              <><p className="text-lg font-bold text-gray-900 mb-2">Cubierto</p><Badge status="green" label="Protegido" /></>
            ) : (
              <><p className="text-sm font-bold text-red-700 mb-2">Sin cobertura</p>
              <Badge status="red" label="Riesgo Patrimonial Crítico por Eventualidad Médica" /></>
            )}
          </div>
        </div>
      </div>


      {/* Sección Bloqueada */}
      <ReferralGate>
        <div className="space-y-6">
          {/* Brecha de Retiro */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target size={18} className="text-purple-600" />
              Proyección de Retiro
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-1">Capital Necesario</p>
                <p className="text-xl font-bold text-gray-900">{fmt(diagnosis.retirement.requiredCapital)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-1">Ahorro Proyectado</p>
                <p className="text-xl font-bold text-gray-900">{fmt(diagnosis.retirement.futureValueOfSavings)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-xs text-red-500 uppercase mb-1">Brecha</p>
                <p className="text-xl font-bold text-red-700">{fmt(diagnosis.retirement.gap)}</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Aportación mensual requerida:</span>{' '}
                {fmt(diagnosis.retirement.monthlyContributionRequired)} durante{' '}
                {diagnosis.retirement.yearsToRetirement} años.
              </p>
            </div>
          </div>


          {/* Propuesta PPR / GMM */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Heart size={18} className="text-rose-600" />
              Solución: PPR y GMM
            </h3>
            <div className="space-y-3">
              {!profile.hasMedicalInsurance && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <ShieldAlert size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Gastos Médicos Mayores (GMM)</p>
                    <p className="text-xs text-red-700 mt-1">
                      Una eventualidad médica puede comprometer tu patrimonio. Un GMM protege
                      tus activos y tu plan de retiro.
                    </p>
                  </div>
                </div>
              )}
              {diagnosis.retirement.gap > 0 && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Target size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Plan Personal de Retiro (PPR)</p>
                    <p className="text-xs text-purple-700 mt-1">
                      Un PPR cierra la brecha de {fmt(diagnosis.retirement.gap)} con beneficios
                      fiscales (deducción de hasta 10% de tu ingreso anual o 5 UMAs anuales).
                    </p>
                  </div>
                </div>
              )}
              {!profile.hasLifeInsurance && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Seguro de Vida</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Protege a tu familia con una suma asegurada que cubra al menos
                      5 años de gastos esenciales.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA WhatsApp */}
          <div className="text-center">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md">
              <MessageCircle size={20} />
              Agendar Consultoría Financiera por WhatsApp
            </a>
          </div>
        </div>
      </ReferralGate>
    </div>
  );
}
