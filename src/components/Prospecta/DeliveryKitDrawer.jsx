import { useState } from 'react';
import { ArrowLeft, FileCheck2, PackageCheck, CalendarCheck2, Check } from 'lucide-react';

/**
 * src/components/Prospecta/DeliveryKitDrawer.jsx
 *
 * Checklist de la etapa de Cierre: 3 pasos simples al entregar la póliza,
 * abierto desde el botón ámbar (`Sparkles`, "Asistente") del reverso de
 * `PipelineCard.jsx` cuando la tarjeta es de tipo `cita_cierre` — es el
 * equivalente de `UnderwritingDrawer.jsx` para esta etapa, sin la
 * complejidad de las Súper Preguntas: aquí no hay nada que capturar del
 * cliente, sólo tres pasos del propio asesor que conviene no dejar a la
 * memoria en el momento de la entrega.
 *
 * Autocontenido, mismo patrón que el resto de piezas de Prospecta: sólo
 * `useState`, sin contexto ni enrutamiento propio. Se monta con
 * `<DeliveryKitDrawer onBack={...} />` y no deja rastro al desmontarse.
 */

const STEPS = [
  {
    key: 'coverPage',
    icon: FileCheck2,
    label: 'Explicar la carátula',
    detail: 'Suma asegurada, beneficiario y vigencia, en voz alta con el cliente delante.',
  },
  {
    key: 'deliverPolicy',
    icon: PackageCheck,
    label: 'Entregar la póliza',
    detail: 'Documento físico o digital, según cómo se haya emitido.',
  },
  {
    key: 'confirmCollectionDate',
    icon: CalendarCheck2,
    label: 'Confirmar fecha de cobro',
    detail: 'La fecha en la que se cargará la primera prima, dicha en voz alta y confirmada.',
  },
];

export default function DeliveryKitDrawer({ onBack, backLabel = 'Etapas' }) {
  const [done, setDone] = useState({});
  const toggle = (key) => setDone((prev) => ({ ...prev, [key]: !prev[key] }));

  const completedCount = STEPS.filter((step) => done[step.key]).length;

  return (
    <div className="animate-rise">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500
                   transition-colors hover:text-slate-200"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </button>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl
                      shadow-black/50 sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
          Kit de Entrega
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug text-white">
          Checklist de la Cita de Cierre
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {completedCount} de {STEPS.length} pasos completados.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {STEPS.map((step) => {
            const isDone = Boolean(done[step.key]);
            const Icon = step.icon;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => toggle(step.key)}
                aria-pressed={isDone}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left
                            transition-all active:scale-[0.98] ${isDone
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border
                              transition-colors ${isDone
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                  aria-hidden="true"
                >
                  {isDone ? <Check size={18} /> : <Icon size={17} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${isDone ? 'text-emerald-200' : 'text-slate-100'}`}>
                    {step.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                    {step.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
