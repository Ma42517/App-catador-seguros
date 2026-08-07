import { ShieldCheck, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardTitle } from '../ui';

const SEVERITY = {
  error: {
    Icon: XCircle, box: 'bg-red-500/10 ring-red-500/25',
    title: 'text-red-200', body: 'text-red-300/80', icon: 'text-red-400',
  },
  warning: {
    Icon: AlertTriangle, box: 'bg-amber-500/10 ring-amber-500/25',
    title: 'text-amber-200', body: 'text-amber-300/80', icon: 'text-amber-400',
  },
  info: {
    Icon: Info, box: 'bg-indigo-500/10 ring-indigo-500/25',
    title: 'text-indigo-200', body: 'text-indigo-300/80', icon: 'text-indigo-400',
  },
};

/**
 * Hallazgos del motor de consistencia. No son consejos financieros:
 * son contradicciones estructurales en los datos capturados.
 */
export default function FindingsPanel({ findings = [] }) {
  const errors = findings.filter((f) => f.severity === 'error').length;

  return (
    <Card>
      <CardTitle
        icon={ShieldCheck}
        help="Audita que la información capturada sea internamente coherente: sin doble contabilidad de impuestos, ahorro o deuda."
      >
        Verificación de consistencia
      </CardTitle>

      {findings.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
          <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-200">
            Sin contradicciones detectadas. Tu modelo financiero es internamente consistente.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {findings.map((f) => {
            const s = SEVERITY[f.severity] ?? SEVERITY.info;
            const { Icon } = s;
            return (
              <li key={f.id} className={`flex gap-2.5 rounded-lg p-3 ring-1 ${s.box}`}>
                <Icon size={15} className={`mt-0.5 shrink-0 ${s.icon}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${s.title}`}>{f.title}</p>
                  <p className={`mt-0.5 text-[11px] leading-relaxed ${s.body}`}>{f.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {errors > 0 && (
        <p className="mt-3 text-[11px] text-red-300">
          {errors} {errors === 1 ? 'error estructural requiere' : 'errores estructurales requieren'} corrección
          antes de confiar en el diagnóstico.
        </p>
      )}
    </Card>
  );
}
