import { ShieldCheck, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Card, CardTitle } from '../ui';

const SEVERITY = {
  error: { Icon: XCircle, box: 'bg-red-50 ring-red-200', title: 'text-red-900', body: 'text-red-800', icon: 'text-red-600' },
  warning: { Icon: AlertTriangle, box: 'bg-amber-50 ring-amber-200', title: 'text-amber-900', body: 'text-amber-800', icon: 'text-amber-600' },
  info: { Icon: Info, box: 'bg-blue-50 ring-blue-200', title: 'text-blue-900', body: 'text-blue-800', icon: 'text-blue-600' },
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
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800">
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
        <p className="mt-3 text-[11px] text-red-700">
          {errors} {errors === 1 ? 'error estructural requiere' : 'errores estructurales requieren'} corrección
          antes de confiar en el diagnóstico.
        </p>
      )}
    </Card>
  );
}
