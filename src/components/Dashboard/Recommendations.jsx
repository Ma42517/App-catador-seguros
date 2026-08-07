import { Lightbulb, Flame, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardTitle, Badge } from '../ui';

const SEVERITY = {
  critical: {
    label: 'Crítico', status: 'red', Icon: Flame,
    accent: 'border-l-red-500', glow: 'rgb(239 68 68 / 0.5)', icon: 'text-red-400',
  },
  high: {
    label: 'Alto', status: 'red', Icon: AlertTriangle,
    accent: 'border-l-orange-500', glow: 'rgb(249 115 22 / 0.45)', icon: 'text-orange-400',
  },
  medium: {
    label: 'Medio', status: 'yellow', Icon: Info,
    accent: 'border-l-amber-500', glow: 'rgb(245 158 11 / 0.4)', icon: 'text-amber-400',
  },
  low: {
    label: 'Bajo', status: 'neutral', Icon: Info,
    accent: 'border-l-slate-600', glow: 'transparent', icon: 'text-slate-500',
  },
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
    <li
      className={`rounded-r-xl border-l-[3px] bg-slate-900/60 p-4 ring-1 ring-slate-700/50 transition-colors hover:bg-slate-900/90 ${s.accent}`}
      style={{ boxShadow: `-6px 0 18px -10px ${s.glow}` }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={13} className={`shrink-0 ${s.icon}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {rec.area}
        </span>
        <Badge status={s.status} showIcon={false} className="ml-auto">{s.label}</Badge>
      </div>

      <p className="text-sm font-bold leading-snug text-slate-50">{rec.problem}</p>

      <dl className="mt-2.5 space-y-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Impacto</dt>
          <dd className="text-[11px] leading-relaxed text-slate-400">{rec.impact}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cifra</dt>
          <dd className="text-sm font-bold tabular-nums text-slate-100">{rec.number}</dd>
        </div>
        <div className="rounded-xl bg-indigo-500/10 p-3 ring-1 ring-indigo-500/25">
          <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
            <CheckCircle2 size={11} /> Acción
          </dt>
          <dd className="mt-1 text-[11px] leading-relaxed text-indigo-100">{rec.action}</dd>
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
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-200">
            No se detectaron problemas. Tu estructura financiera está en orden.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
        </ul>
      )}

      {limit && recommendations.length > limit && (
        <p className="mt-3 text-center text-[11px] text-slate-500">
          {recommendations.length - limit} recomendaciones más en el paso de Optimización.
        </p>
      )}
    </Card>
  );
}
