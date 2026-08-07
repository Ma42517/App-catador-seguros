import { ShieldAlert, Target, ArrowRight } from 'lucide-react';
import { fmtMXN } from '../../engine/finance';

/**
 * Banner de alerta con degradado. Se reserva para los dos riesgos que
 * pueden destruir un patrimonio completo: una eventualidad médica sin
 * cobertura y llegar al retiro sin capital.
 */
function GradientBanner({
  icon: Icon, tone, eyebrow, title, body, metrics = [], footer,
}) {
  const TONES = {
    red: {
      wrap: 'from-red-500/20 via-red-500/5 to-transparent ring-red-500/30',
      chip: 'bg-red-500/15 text-red-300 ring-red-500/30',
      eyebrow: 'text-red-400',
      icon: 'bg-red-500/15 text-red-400 ring-red-500/30',
      value: 'text-red-300',
    },
    violet: {
      wrap: 'from-violet-500/20 via-indigo-500/5 to-transparent ring-violet-500/30',
      chip: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
      eyebrow: 'text-violet-400',
      icon: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
      value: 'text-violet-200',
    },
  };
  const t = TONES[tone] ?? TONES.red;

  return (
    <div
      className={`animate-rise relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 ring-1 shadow-xl shadow-slate-950/40 sm:p-5 ${t.wrap}`}
    >
      {/* Halo decorativo */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
        style={{ background: tone === 'red' ? 'rgb(239 68 68 / 0.25)' : 'rgb(139 92 246 / 0.25)' }}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3.5">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${t.icon}`}>
          <Icon size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${t.eyebrow}`}>
            {eyebrow}
          </p>
          <h3 className="mt-1 text-sm font-bold leading-snug text-slate-50 sm:text-base">
            {title}
          </h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300 sm:text-xs">
            {body}
          </p>


          {metrics.length > 0 && (
            <dl className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metrics.map((mt) => (
                <div
                  key={mt.label}
                  className="rounded-xl border border-slate-700/40 bg-slate-950/40 px-3 py-2"
                >
                  <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {mt.label}
                  </dt>
                  <dd className={`mt-0.5 text-sm font-bold tabular-nums ${mt.strong ? t.value : 'text-slate-100'}`}>
                    {mt.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {footer && (
            <p className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ${t.chip}`}>
              <ArrowRight size={12} className="shrink-0" />
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * Banners de riesgo del diagnóstico. Sólo aparecen cuando el riesgo existe:
 * si el hogar está cubierto y va bien al retiro, no se muestra nada.
 */
export default function RiskBanners({ matrix: m }) {
  const p = m.protection;
  const r = m.retirement;

  const showMedical = p.medicalRisk;
  const showRetirement = r.gap > 0;

  if (!showMedical && !showRetirement) return null;

  return (
    <div className="space-y-3">
      {showMedical && (
        <GradientBanner
          icon={ShieldAlert}
          tone="red"
          eyebrow="Riesgo patrimonial crítico"
          title="Eventualidad médica sin cobertura de Gastos Médicos Mayores"
          body={
            'Sin GMM, una hospitalización se paga con tu patrimonio o con deuda nueva. '
            + 'Es el único riesgo capaz de borrar años de ahorro en semanas, y no depende '
            + 'de tu disciplina financiera.'
          }
          metrics={[
            {
              label: 'Patrimonio expuesto',
              value: fmtMXN(p.exposedNetWorth),
              strong: true,
            },
            {
              label: 'Liquidez disponible',
              value: `${p.liquidityRunwayMonths.toFixed(1)} meses`,
            },
            {
              label: 'Gasto actual en seguros',
              value: fmtMXN(p.insuranceMonthly),
            },
          ]}
          footer="Contratar un GMM transfiere este riesgo a la aseguradora"
        />
      )}

      {showRetirement && (
        <GradientBanner
          icon={Target}
          tone="violet"
          eyebrow="Brecha de retiro"
          title={`Te faltan ${fmtMXN(r.gap)} para el retiro que quieres`}
          body={
            `Con tu trayectoria actual llegarías a los ${r.retirementAge} años con `
            + `${fmtMXN(r.projectedCapital)} de los ${fmtMXN(r.requiredCapital)} necesarios. `
            + `Tu pensión sería de ${fmtMXN(r.sustainableIncomeAtRetirement)} al mes en lugar de `
            + `los ${fmtMXN(r.desiredMonthlyIncome)} que deseas.`
          }
          metrics={[
            { label: 'Brecha', value: fmtMXN(r.gap), strong: true },
            { label: 'Avance', value: `${r.progressPct}%` },
            { label: 'Años restantes', value: `${r.yearsToRetirement}` },
          ]}
          footer={`Aportar ${fmtMXN(r.additionalMonthlyNeeded)} al mes cierra la brecha`}
        />
      )}
    </div>
  );
}

export { GradientBanner };
