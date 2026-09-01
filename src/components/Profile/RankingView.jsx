import { useEffect, useState } from 'react';
import {
  Coins, Crown, Loader2, Medal, TrendingUp,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { fetchPromotoriaRanking } from '../../data/walletRepo';
import { useWallet } from '../../data/useWallet';

const SCOPES = [
  { key: 'month', label: 'Del mes', hint: 'Se reinicia el día 1' },
  { key: 'lifetime', label: 'Histórico', hint: 'De todo el tiempo' },
];

/** Medalla para los tres primeros; número para el resto. */
function PositionBadge({ position }) {
  if (position <= 3) {
    const color = position === 1 ? 'text-amber-400'
      : position === 2 ? 'text-zinc-300' : 'text-amber-700';
    return <Medal size={18} className={`shrink-0 ${color}`} aria-hidden="true" />;
  }
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center text-xs font-bold text-zinc-500">
      {position}
    </span>
  );
}

function RankingList({ scope }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let active = true;
    setEntries(null);
    fetchPromotoriaRanking(scope, 20).then(({ data }) => {
      if (active) setEntries(data?.outcome === 'READY' ? (data.entries ?? []) : []);
    });
    return () => { active = false; };
  }, [scope]);

  if (entries === null) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 size={20} className="animate-spin text-zinc-400" aria-label="Cargando" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        Aún no hay puntos registrados este periodo. Empieza a trabajar tus actividades
        y aparecerás aquí.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((row) => (
        <li
          key={`${row.position}-${row.name}`}
          className={`flex items-center gap-3 rounded-2xl border p-3 ${row.isMe
            ? 'border-indigo-400 bg-indigo-500/10 dark:border-indigo-500/60'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}
        >
          <PositionBadge position={row.position} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {row.name}
            {row.isMe && (
              <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px]
                               font-bold text-indigo-600 dark:text-indigo-300"
              >
                Tú
              </span>
            )}
          </span>
          <span className="shrink-0 text-sm font-bold text-zinc-900 dark:text-white">
            {row.score.toLocaleString('es-MX')}
            <span className="ml-1 text-[10px] font-medium text-zinc-500">pts</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tablero de ranking, con las dos escaleras que se pidieron.
 *
 * - "Del mes": competencia pareja, todos arrancan en cero el día 1.
 * - "Histórico": el prestigio acumulado de todo el tiempo, nunca se reinicia.
 *
 * Los puntos suben aquí sin bajar nunca al comprar: gastar monedas no cuesta
 * posición en el ranking.
 */
export default function RankingView({ isOpen, onClose }) {
  const [scope, setScope] = useState('month');
  const { summary } = useWallet();

  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Ranking" label="Ranking de asesores">
      {/* Mis números, arriba: monedas para gastar y puntos que compiten. */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest
                        text-amber-600 dark:text-amber-400"
          >
            <Coins size={13} /> Monedas
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
            {(summary?.coinsBalance ?? 0).toLocaleString('es-MX')}
          </p>
          <p className="text-[10px] text-zinc-500">Para comprar en la tienda</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest
                        text-indigo-600 dark:text-indigo-400"
          >
            <TrendingUp size={13} /> Puntos del mes
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
            {(summary?.monthPoints ?? 0).toLocaleString('es-MX')}
          </p>
          <p className="text-[10px] text-zinc-500">
            {(summary?.lifetimePoints ?? 0).toLocaleString('es-MX')} en total
          </p>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100
                      p-1 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {SCOPES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setScope(s.key)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              scope === s.key
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mb-4 flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Crown size={12} className="text-amber-400" aria-hidden="true" />
        {SCOPES.find((s) => s.key === scope)?.hint} · tu promotoría
      </p>

      <RankingList scope={scope} />
    </FullScreenView>
  );
}
