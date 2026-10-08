import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, CreditCard, TrendingDown, Zap, Pencil, Trash2, Landmark, Car, Home,
  GraduationCap, Wallet, ArrowDownRight, Sparkles, AlertTriangle, Briefcase,
  Users, Banknote,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createDebt } from '../../data/defaults';
import { rateForDebtType, rateOrBlank, isSuggestedRate } from '../../data/historicalRates';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, PercentInput,
  Select, Button, Badge, SegmentedControl,
} from '../ui';
import RowSheet from './RowSheet';
import SuggestedField from './SuggestedField';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import { DEBT_TYPES, fmtMXN, fmtPct } from '../../engine/finance';

/* ── Helpers de presentación ─────────────────────────────────────────────── */

function monthsLabel(months) {
  if (months === null || months === undefined) return 'Nunca se liquida';
  if (months === 0) return 'Liquidada';
  if (months < 12) return `${months} meses`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} año${y > 1 ? 's' : ''}` : `${y}a ${m}m`;
}

/* Ícono por tipo de deuda: la lista se recorre mirando los íconos, no leyendo. */
const TYPE_ICON = {
  credit_card: CreditCard,
  mortgage: Home,
  auto: Car,
  personal: Wallet,
  student: GraduationCap,
  payroll: Landmark,
  business: Briefcase,
  family: Users,
  other: Banknote,
};
function iconForType(type) {
  return TYPE_ICON[type] ?? Wallet;
}

/*
  Color según la tasa: la deuda cara se ve roja antes de leer el número. Es la
  misma escala que usaba la BarList original (>35% roja, >15% naranja, resto azul),
  conservada para no cambiar el significado de los colores entre pantallas.
*/
function rateTone(annualRate) {
  if (annualRate > 0.35) return 'rose';
  if (annualRate > 0.15) return 'amber';
  return 'indigo';
}
const TONE_CLASSES = {
  rose: { text: 'text-rose-300', icon: 'bg-rose-500/10 text-rose-300 border-rose-500/30', bar: 'bg-rose-500' },
  amber: { text: 'text-amber-300', icon: 'bg-amber-500/10 text-amber-300 border-amber-500/30', bar: 'bg-amber-500' },
  indigo: { text: 'text-indigo-300', icon: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30', bar: 'bg-indigo-500' },
};

/* ── Tarjeta de deuda (reemplaza a CompactRow en este módulo) ─────────────── */

/**
 * Una deuda, en modo lectura, como tarjeta.
 *
 * Enseña de un vistazo lo que antes había que abrir para ver: cuánto del pago se
 * va en intereses y cuánto baja realmente el saldo (la barra), si la deuda se
 * liquida algún día, y qué tan cara es (el color). La tarjeta entera abre la
 * edición; el lápiz y el bote quedan fuera de esa zona para que un toque cerca
 * del borde no abra el formulario al querer borrar.
 */
function DebtCard({ debt, analysis, onEdit, onRemove }) {
  const Icon = iconForType(debt.type);
  const tone = TONE_CLASSES[rateTone(analysis?.annualRate ?? debt.interestRate)];
  const never = analysis?.isNeverPaidOff && analysis.balance > 0;

  // Qué parte del pago mensual ataca el capital (lo que de verdad reduce la deuda).
  const payment = analysis?.payment ?? 0;
  const toPrincipal = analysis?.principalPortion ?? 0;
  const principalPct = payment > 0 ? Math.max(0, Math.min(100, (toPrincipal / payment) * 100)) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className="surface-sunken group relative overflow-hidden p-3.5 transition-colors
                 hover:border-zinc-600/60"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none"
        >
          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${tone.icon}`}>
            <Icon size={16} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-zinc-100">
                {debt.name || 'Deuda sin nombre'}
              </span>
              {never && <Badge status="red">No amortiza</Badge>}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
              {[
                labelOf(DEBT_TYPES, debt.type),
                debt.interestRate > 0 ? `${fmtPct(debt.interestRate)} anual` : '',
              ].filter(Boolean).join(' · ')}
            </span>
          </span>

          <span className="shrink-0 text-right">
            <span className="block text-sm font-bold tabular-nums text-zinc-50">
              {fmtMXN(debt.balance)}
            </span>
            <span className={`block text-[10px] font-medium ${never ? 'text-rose-400' : 'text-zinc-500'}`}>
              {analysis ? monthsLabel(analysis.payoffMonths) : 'saldo'}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar"
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500
                       transition-colors hover:bg-zinc-700/60 hover:text-zinc-200"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Eliminar"
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500
                       transition-colors hover:bg-rose-500/15 hover:text-rose-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Barra pago → capital vs. interés. Sólo cuando hay un pago que repartir. */}
      {analysis && payment > 0 && (
        <div className="mt-3 pl-12">
          <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              De tu pago de <span className="font-semibold text-zinc-400">{fmtMXN(payment)}</span>
            </span>
            <span className={never ? 'font-semibold text-rose-400' : ''}>
              {never ? 'nada baja el saldo' : `${Math.round(principalPct)}% baja el saldo`}
            </span>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-700/40">
            <motion.div
              className={`h-full ${tone.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${principalPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <div className="h-full flex-1 bg-rose-500/40" />
          </div>
          <div className="mt-1 flex items-center justify-between text-[9.5px] text-zinc-600">
            <span>Capital {fmtMXN(toPrincipal)}</span>
            <span>Interés {fmtMXN(analysis.monthlyInterest)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Estrategia de pago acelerado (tarjeta destacada) ─────────────────────── */

function StrategyDetail({ title, sub, plan, savings }) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-zinc-700/50 bg-zinc-900/40 p-4"
    >
      <p className="text-xs text-zinc-400">{sub}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Quedas libre en</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-50">{monthsLabel(plan.months)}</p>
        </div>
        <div className="rounded-xl bg-zinc-800/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Interés total</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-rose-300">{fmtMXN(plan.totalInterest)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
        <ArrowDownRight size={18} className="shrink-0 text-emerald-300" />
        <p className="text-[12px] text-emerald-200">
          Al terminar liberas{' '}
          <span className="font-bold">{fmtMXN(plan.freedCashflow)}/mes</span> de tu flujo.
        </p>
      </div>

      {savings > 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <Sparkles size={12} className="shrink-0" />
          Este método te ahorra <span className="font-semibold">{fmtMXN(savings)}</span> en intereses.
        </p>
      )}
    </motion.div>
  );
}

/* ── Paso ─────────────────────────────────────────────────────────────────── */

export default function DebtStep() {
  const { debts, matrix, add, update, remove } = useFinance();
  const d = matrix.debts;
  const plans = matrix.payoffPlans;
  const byId = Object.fromEntries(d.items.map((x) => [x.id, x]));

  const sheet = useRowSheet({ collection: 'debts', create: createDebt, add, update });
  const { draft } = sheet;

  const isCard = draft.type === 'credit_card';
  const analyzed = byId[draft.id];

  // Tasa sugerida del tipo elegido (promedio de mercado). `null` = sin sugerencia.
  const suggestedRate = rateForDebtType(draft.type);

  /*
    Modo manual de la tasa. Se deduce del valor —si no coincide con la sugerida, es que
    alguien la escribió— pero el interruptor `rateOverride` deja forzarlo aunque el valor
    sea idéntico al sugerido: así "ponerlo manualmente" abre el input aun antes de teclear.
    Mismo patrón que la esperanza de vida en ProfileStep.
  */
  const [rateOverride, setRateOverride] = useState(false);
  const rateIsManual = rateOverride || !isSuggestedRate(draft.interestRate, suggestedRate);

  /*
    El override no debe sobrevivir entre deudas: al abrir la hoja (nueva o edición) se
    reinicia, y a partir de ahí el valor guardado decide si abre en verde o en manual.
    Sin esto, haber tocado "ponerlo manualmente" en una deuda dejaría la siguiente abierta
    en modo manual aunque su tasa fuera la sugerida.
  */
  useEffect(() => {
    if (sheet.isOpen) setRateOverride(false);
  }, [sheet.isOpen]);

  /*
    Al cambiar el tipo, la tasa sigue al nuevo producto SÓLO si venía en modo sugerido:
    quien ya escribió su CAT a mano no quiere que cambiar "auto" por "nómina" le borre el
    número. Igual que la tasa de los activos sigue (o no) al tipo de activo.
  */
  const changeType = (type) => {
    if (rateIsManual) {
      sheet.patch({ type });
    } else {
      sheet.patch({ type, interestRate: rateOrBlank(rateForDebtType(type)) });
    }
  };

  // Estrategia elegida en el selector. Avalancha por omisión: ahorra más intereses.
  const [strategy, setStrategy] = useState('avalanche');
  const bothComparable = plans.avalanche.months !== null && plans.snowball.months !== null;
  const savings = bothComparable
    ? Math.abs(plans.snowball.totalInterest - plans.avalanche.totalInterest)
    : 0;
  const cheaperStrategy = plans.avalanche.totalInterest <= plans.snowball.totalInterest
    ? 'avalanche' : 'snowball';

  const dtiTone = d.debtToIncomeRatio > 0.5 ? 'negative' : d.debtToIncomeRatio >= 0.3 ? 'warning' : 'positive';
  const dtiStatus = d.debtToIncomeRatio > 0.5 ? 'red' : d.debtToIncomeRatio >= 0.3 ? 'yellow' : 'green';

  const hasDebts = debts.length > 0;

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 5"
        title="Deudas"
        description="Registra tus créditos. Verás cuánto de cada pago baja tu saldo y cuánto se va en intereses — y cómo liberar ese dinero más rápido."
      />

      {/* ── Resumen en tarjetas de métrica (sólo con deudas) ── */}
      <AnimatePresence>
        {hasDebts && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <MetricTile label="Saldo total" value={fmtMXN(d.totalBalance)} tone="neutral" icon={Wallet} />
            <MetricTile label="Pago mensual" value={fmtMXN(d.monthlyService)} tone="accent" icon={CreditCard} />
            <MetricTile label="Interés al mes" value={fmtMXN(d.monthlyInterest)} tone="negative" icon={TrendingDown} />
            <MetricTile
              label="De tu ingreso"
              value={fmtPct(d.debtToIncomeRatio)}
              tone={dtiTone}
              icon={AlertTriangle}
              badge={<Badge status={dtiStatus}>{dtiStatus === 'green' ? 'Sano' : dtiStatus === 'yellow' ? 'Vigilar' : 'Alto'}</Badge>}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lista de créditos ── */}
      <Card>
        <CardTitle
          icon={CreditCard}
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={() => sheet.openNew()}>
              Agregar
            </Button>
          }
        >
          Tus créditos
        </CardTitle>

        {!hasDebts ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-10 text-center">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl
                             border border-zinc-700/60 bg-zinc-800/60"
            >
              <CreditCard size={24} className="text-zinc-500" />
            </span>
            <p className="text-sm font-semibold text-zinc-200">Sin deudas registradas</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
              ¿Tienes tarjetas, un auto o un crédito? Agrégalos para ver cuánto te cuestan
              realmente. Si no tienes deuda, ¡felicidades! Puedes avanzar al siguiente paso.
            </p>
            <div className="mt-5">
              <Button icon={Plus} onClick={() => sheet.openNew()}>
                Agregar mi primera deuda
              </Button>
            </div>
          </div>
        ) : (
          <motion.div layout className="space-y-2.5">
            <AnimatePresence initial={false}>
              {newestFirst(debts).map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  analysis={byId[debt.id]}
                  onEdit={() => sheet.openEdit(debt)}
                  onRemove={() => remove('debts', debt.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </Card>

      {/* ── Estrategias de liquidación acelerada ── */}
      {hasDebts && (
        <Card>
          <CardTitle
            icon={Zap}
            help="Ambos métodos aplican tu excedente mensual a una deuda a la vez. Cuando una se liquida, su pago se suma al ataque de la siguiente (efecto bola de nieve)."
          >
            ¿Cómo salir de deudas más rápido?
          </CardTitle>

          <p className="mb-3 text-[11px] text-zinc-400">
            Con tu excedente actual de{' '}
            <span className="font-semibold text-zinc-200">{fmtMXN(plans.accelerator)}</span> al mes,
            elige una estrategia:
          </p>

          <SegmentedControl
            className="mb-3 flex w-full"
            value={strategy}
            onChange={setStrategy}
            options={[
              { value: 'avalanche', label: '🔥 Avalancha' },
              { value: 'snowball', label: '❄️ Bola de nieve' },
            ]}
          />

          <AnimatePresence mode="wait">
            {strategy === 'avalanche' ? (
              <StrategyDetail
                title="avalanche"
                sub="Atacas primero la deuda con la tasa más alta. Es la que menos intereses te hace pagar."
                plan={plans.avalanche}
                savings={cheaperStrategy === 'avalanche' ? savings : 0}
              />
            ) : (
              <StrategyDetail
                title="snowball"
                sub="Atacas primero el saldo más chico. Liquidas deudas rápido, lo que motiva a seguir."
                plan={plans.snowball}
                savings={cheaperStrategy === 'snowball' ? savings : 0}
              />
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* ── Hoja de captura (sin cambios de modelo) ── */}
      <RowSheet
        isOpen={sheet.isOpen}
        onClose={sheet.close}
        onSave={sheet.save}
        isEditing={sheet.isEditing}
        title="deuda"
        hint="El concepto y el saldo son obligatorios."
        canSave={(draft.name || '').trim() !== '' && draft.balance > 0}
        saveLabel="Agregar deuda"
      >
        <Field label="Concepto">
          <TextInput
            value={draft.name}
            onChange={(v) => sheet.patch({ name: v })}
            placeholder="Tarjeta de crédito"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Saldo actual">
            <MoneyInput
              value={draft.balance}
              onChange={(v) => sheet.patch({ balance: v })}
              step="1000"
            />
          </Field>

          <Field label="Tipo">
            <Select
              value={draft.type}
              onChange={changeType}
              options={DEBT_TYPES}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <SuggestedField
            label="Tasa anual"
            help="Tasa de interés anual efectiva (CAT) del crédito."
            suggested={suggestedRate}
            format={fmtPct}
            note="Promedio de mercado para este tipo de crédito."
            chipLabel="Sugerida"
            isManual={rateIsManual}
            onUseManual={() => setRateOverride(true)}
            onUseSuggested={() => {
              setRateOverride(false);
              sheet.patch({ interestRate: rateOrBlank(suggestedRate) });
            }}
            manualLabel="Ponerlo manualmente"
            manualNote="Tasa escrita por ti. "
            restoreLabel={(v) => `Usar la sugerida (${v})`}
          >
            {(id) => (
              <PercentInput
                id={id}
                value={draft.interestRate}
                onChange={(v) => sheet.patch({ interestRate: v })}
              />
            )}
          </SuggestedField>

          <Field label="Pago mínimo">
            <MoneyInput
              value={draft.minPayment}
              onChange={(v) => sheet.patch({ minPayment: v })}
            />
          </Field>
        </div>

        <Field label="Pago real" hint="Lo que efectivamente pagas">
          <MoneyInput
            value={draft.actualPayment}
            onChange={(v) => sheet.patch({ actualPayment: v })}
          />
        </Field>

        {isCard && (
          <Field label="Línea de crédito" help="Necesaria para calcular tu porcentaje de utilización.">
            <MoneyInput
              value={draft.creditLimit}
              onChange={(v) => sheet.patch({ creditLimit: v })}
              step="1000"
            />
          </Field>
        )}

        <Field label="Activo vinculado" hint="Opcional: qué bien respalda esta deuda">
          <TextInput
            value={draft.linkedAsset}
            onChange={(v) => sheet.patch({ linkedAsset: v })}
            placeholder="Casa, auto..."
          />
        </Field>

        {/* Lo que el motor ya calculó de esta deuda. Sólo al corregir una existente. */}
        {sheet.isEditing && analyzed && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t
                          border-zinc-700/50 pt-3 text-[11px] text-zinc-400"
          >
            <span>
              Interés mensual:{' '}
              <span className="font-semibold text-zinc-300">{fmtMXN(analyzed.monthlyInterest)}</span>
            </span>
            <span>
              A capital:{' '}
              <span className="font-semibold text-zinc-300">{fmtMXN(analyzed.principalPortion)}</span>
            </span>
            {analyzed.totalInterest !== null && (
              <span>
                Interés total:{' '}
                <span className="font-semibold text-zinc-300">{fmtMXN(analyzed.totalInterest)}</span>
              </span>
            )}
            {isCard && analyzed.utilization !== null && (
              <Badge status={analyzed.utilization > 0.7 ? 'red' : analyzed.utilization > 0.3 ? 'yellow' : 'green'}>
                Utilización {fmtPct(analyzed.utilization)}
              </Badge>
            )}
            {analyzed.isNeverPaidOff && analyzed.balance > 0 && (
              <Badge status="red">
                El pago no cubre el interés de {fmtMXN(analyzed.monthlyInterest)}
              </Badge>
            )}
          </div>
        )}
      </RowSheet>
    </div>
  );
}

/**
 * Tile de métrica compacto para el resumen de deuda. Usa el mismo lenguaje de
 * `StatCard` (tono + ícono + glow) pero más chico, para que las cuatro quepan en
 * una fila en el teléfono.
 */
function MetricTile({ label, value, sub, icon: Icon, tone = 'neutral', badge }) {
  const TONES = {
    neutral: { value: 'text-zinc-100', icon: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    accent: { value: 'text-indigo-300', icon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
    positive: { value: 'text-emerald-400', icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    negative: { value: 'text-rose-400', icon: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    warning: { value: 'text-amber-400', icon: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  };
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <div className="surface relative overflow-hidden p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {Icon && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${t.icon}`}>
            <Icon size={13} />
          </span>
        )}
      </div>
      <p className={`text-base font-bold leading-none tabular-nums sm:text-lg ${t.value}`}>
        {value}
      </p>
      {(sub || badge) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {badge}
          {sub && <span className="text-[10px] text-zinc-500">{sub}</span>}
        </div>
      )}
    </div>
  );
}
