import { Lightbulb, Flame, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardTitle, Badge } from '../ui';

const SEVERITY = {
  critical: { label: 'Crítico', status: 'red', Icon: Flame, accent: 'border-l-red-500' },
  high: { label: 'Alto', status: 'red', Icon: AlertTriangle, accent: 'border-l-orange-500' },
  medium: { label: 'Medio', status: 'yellow', Icon: Info, accent: 'border-l-amber-500' },
  low: { label: 'Bajo', status: 'neutral', Icon: Info, accent: 'border-l-slate-300' },
};

/**
 * Cada recomendación se presenta con la estructura completa
 * PROBLEMA -> IMPACTO -> CIFRA -> ACCIÓN, para que sea ejecutable
 * y no un consejo genérico.
 */
function RecommendationCard({ rec }) {
  const s = SEVERITY[rec.severity] ?? SEVERITY.low;
  const { Icon } = s;

  return (
    <li className={`rounded-r-lg border-l-4 bg-white p-3.5 shadow-sm ring-1 ring-slate-200 ${s.accent}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={13} className="shrink-0 text-slate-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {rec.area}
        </span>
        <Badge status={s.status} showIcon={false} className="ml-auto">{s.label}</Badge>
      </div>

      <p className="text-sm font-semibold leading-snug text-slate-900">{rec.problem}</p>

      <dl className="mt-2.5 space-y-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Impacto</dt>
          <dd className="text-[11px] leading-relaxed text-slate-600">{rec.impact}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cifra</dt>
          <dd className="text-sm font-bold tabular-nums text-slate-900">{rec.number}</dd>
        </div>
        <div className="rounded-lg bg-blue-50 p-2.5">
          <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            <CheckCircle2 size={11} /> Acción
          </dt>
          <dd className="mt-0.5 text-[11px] leading-relaxed text-blue-900">{rec.action}</dd>
        </div>
      </dl>
    </li>
  );
}


export default function Recommendations({ recommendations = [], limit }) {
  const list = limit ? recommendations.slice(0, limit) : recommendations;
  const criticalCount = recommendations.filter((r) => r.severity === 'critical').length;

  return (
    <Card>
      <CardTitle
        icon={Lightbulb}
        action={
          criticalCount > 0
            ? <Badge status="red">{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</Badge>
            : recommendations.length === 0
              ? <Badge status="green">Sin alertas</Badge>
              : <Badge status="neutral">{recommendations.length} hallazgos</Badge>
        }
      >
        Recomendaciones priorizadas
      </CardTitle>

      {recommendations.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800">
            No se detectaron problemas. Tu estructura financiera está en orden.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
        </ul>
      )}

      {limit && recommendations.length > limit && (
        <p className="mt-3 text-center text-[11px] text-slate-400">
          {recommendations.length - limit} recomendaciones más en el paso de Optimización.
        </p>
      )}
    </Card>
  );
}
