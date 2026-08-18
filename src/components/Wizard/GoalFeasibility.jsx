import { TrendingDown, CircleCheck, TriangleAlert, Info } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { projectGoal, formatMonths } from '../../data/goalProjection';

/*
  Formateador de moneda, creado una vez y no en cada render: el bloque se recalcula con cada
  tecla que se escribe en la aportación.
*/
const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/** Paleta de los cuatro estados posibles del veredicto. */
const TONES = {
  neutral: { box: 'bg-zinc-800/40 ring-zinc-700/60', text: 'text-zinc-400', Icon: Info },
  good: { box: 'bg-emerald-500/10 ring-emerald-500/25', text: 'text-emerald-200', Icon: CircleCheck },
  warn: { box: 'bg-amber-500/10 ring-amber-500/25', text: 'text-amber-200', Icon: TriangleAlert },
  bad: { box: 'bg-rose-500/10 ring-rose-500/25', text: 'text-rose-200', Icon: TrendingDown },
};

/**
 * Veredicto de una meta según lo que la persona puede aportar.
 *
 * El motor contesta "necesitas $2,460 al mes". Este bloque contesta la pregunta que sí se hace
 * en la mesa: "puedo poner mil doscientos, ¿me alcanza?". Y cuando no alcanza, dice las tres
 * cosas que hacen falta para decidir: cuánto falta, cuánto habría que subir la aportación, y
 * en cuánto tiempo se lograría sin subirla.
 *
 * No escribe nada en el diagnóstico: la aportación planeada se guarda en la meta, pero el
 * motor sigue calculando el requerido con el plazo elegido. Son dos cifras distintas a
 * propósito —lo que necesitas y lo que puedes— y la comparación entre ellas es el diagnóstico.
 */
export default function GoalFeasibility({ goal, contribution }) {
  const { matrix } = useFinance();

  /*
    El excedente del hogar, calculado igual que en la tarjeta de totales de este mismo paso: el
    flujo libre menos lo que ya está comprometido en aportaciones a activos. Es el techo real de
    lo que se puede prometer a una meta.
  */
  const surplus = Math.max(0, matrix.NET_CASHFLOW - matrix.assets.monthlyContributions);

  const cost = Math.max(0, Number(goal.cost) || 0);
  const planned = Math.max(0, Number(contribution) || 0);

  // Sin costo no hay nada que proyectar: el veredicto llegaría antes que la pregunta.
  if (cost <= 0) return null;

  const p = projectGoal(goal, planned);
  const plazo = formatMonths(p.monthsNeeded);

  /*
    Sin excedente, el aviso es sobre el hogar y no sobre la meta.

    Se pone antes que cualquier cuenta porque cambia el problema: no es que la aportación sea
    baja, es que no hay de dónde sacarla. Decirle "te faltan $78,452" a quien no tiene un peso
    libre lo manda a resolver la meta cuando lo que tiene que resolver es el flujo.
  */
  if (surplus <= 0) {
    const t = TONES.warn;
    return (
      <div className={`flex items-start gap-2 rounded-xl p-3 ring-1 ${t.box}`}>
        <t.Icon size={14} className={`mt-0.5 shrink-0 ${t.text}`} />
        <p className={`text-[11px] leading-relaxed ${t.text}`}>
          Actualmente no tienes flujo de ahorro disponible para alcanzar esta meta. Ajusta tus
          gastos o incrementa tus ingresos en la sección de optimización.
        </p>
      </div>
    );
  }

  // Todavía no dice cuánto puede aportar: se le muestra la referencia y se le invita.
  if (planned <= 0) {
    const t = TONES.neutral;
    return (
      <div className={`flex items-start gap-2 rounded-xl p-3 ring-1 ${t.box}`}>
        <t.Icon size={14} className={`mt-0.5 shrink-0 ${t.text}`} />
        <p className={`text-[11px] leading-relaxed ${t.text}`}>
          Escribe cuánto puedes aportar y te digo si te alcanza. Para lograrla en el plazo que
          elegiste harían falta{' '}
          <span className="font-bold text-zinc-200">{MXN.format(p.monthlyRequired)}</span> al mes,
          porque el bien costará{' '}
          <span className="font-bold text-zinc-200">{MXN.format(p.futureCost)}</span> cuando
          llegue la fecha. Tu excedente disponible es de {MXN.format(surplus)} al mes.
        </p>
      </div>
    );
  }

  // Alcanza y sobra.
  if (p.isEnough) {
    const t = TONES.good;
    return (
      <div className={`flex items-start gap-2 rounded-xl p-3 ring-1 ${t.box}`}>
        <t.Icon size={14} className={`mt-0.5 shrink-0 ${t.text}`} />
        <p className={`text-[11px] leading-relaxed ${t.text}`}>
          Te alcanza. Con {MXN.format(planned)} al mes acumularías{' '}
          <span className="font-bold">{MXN.format(p.accumulated)}</span> y el bien costará{' '}
          {MXN.format(p.futureCost)}: te sobrarían{' '}
          <span className="font-bold">{MXN.format(p.shortfall)}</span>.
          {plazo && plazo !== 'ya la tienes cubierta' && (
            <> La lograrías en <span className="font-bold">{plazo}</span>.</>
          )}
        </p>
      </div>
    );
  }

  /*
    No alcanza. Se distingue el caso sin salida del que sólo tarda más.

    Cuando el bien se encarece más rápido de lo que crece el ahorro, la brecha no cierra nunca y
    decir "la lograrías en cien años" sería una cifra sin significado. Ese caso se nombra por lo
    que es y se señala la causa, que es lo único que se puede accionar.
  */
  const t = p.monthsNeeded === null ? TONES.bad : TONES.warn;

  return (
    <div className={`flex items-start gap-2 rounded-xl p-3 ring-1 ${t.box}`}>
      <t.Icon size={14} className={`mt-0.5 shrink-0 ${t.text}`} />
      <div className={`text-[11px] leading-relaxed ${t.text}`}>
        <p>
          No te alcanza. Con {MXN.format(planned)} al mes acumularías{' '}
          <span className="font-bold">{MXN.format(p.accumulated)}</span>, y el bien costará{' '}
          <span className="font-bold">{MXN.format(p.futureCost)}</span> cuando llegue la fecha:
          te faltarían <span className="font-bold">{MXN.format(p.shortfall)}</span>.
        </p>

        <p className="mt-1.5">
          Para lograrla en el plazo que elegiste tendrías que aportar{' '}
          <span className="font-bold">{MXN.format(p.monthlyRequired)}</span> al mes,{' '}
          {MXN.format(p.missingMonthly)} más de lo que pusiste.
          {p.missingMonthly > surplus && (
            <> Eso está por encima de tu excedente de {MXN.format(surplus)}.</>
          )}
        </p>

        {p.monthsNeeded === null ? (
          <p className="mt-1.5">
            Manteniendo {MXN.format(planned)} al mes no la alcanzarías: el bien se encarece más
            rápido de lo que crece tu ahorro. Sube la aportación o cambia el instrumento donde
            lo guardas.
          </p>
        ) : (
          <p className="mt-1.5">
            Sin subir la aportación, la lograrías en{' '}
            <span className="font-bold">{plazo}</span> en lugar del plazo que elegiste.
          </p>
        )}
      </div>
    </div>
  );
}
