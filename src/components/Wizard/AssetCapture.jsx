import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createAsset } from '../../data/defaults';
import {
  Card, CardTitle, Field, TextInput, MoneyInput, NumberInput, Select,
  SegmentedControl, Switch, Button, EmptyState, Badge,
} from '../ui';
import CompactRow from './CompactRow';
import RowSheet from './RowSheet';
import RateField from './RateField';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import {
  isSuggestedRate, rateOrBlank, suggestedRateForAsset,
  PPR_PROFILES, PPR_CURRENCIES, DEFAULT_PPR_PROFILE, DEFAULT_PPR_CURRENCY,
} from '../../data/historicalRates';
import {
  ASSET_TYPES, isRetirementType, fmtMXN, toMonthly, PREMIUM_FREQUENCIES,
} from '../../engine/finance';
import {
  aforeContributions, AFORE_ESTIMATE_NOTE, PREMIUM_PAYERS,
} from '../../data/contributionRates';

/**
 * La captura de activos, compartida por "Ahorro y Afore" y por "Patrimonio".
 *
 * Las dos pestañas hacen lo mismo sobre la misma colección y sólo se diferencian en qué
 * tipos ofrecen y cómo se llaman las cosas. Vive en un componente porque toda la
 * mecánica de las tasas —la sugerencia que sigue al tipo, el modo manual, los dos
 * selectores del PPR y el recálculo al cambiar cualquiera de los tres— tiene que
 * comportarse idéntica en ambas. Duplicada, bastaría con arreglar un caso en una para
 * que la otra se quedara atrás sin que ninguna prueba lo notara.
 *
 * @param types          Opciones del selector de tipo para esta pestaña.
 * @param belongsHere    Qué activos de la colección se listan aquí.
 * @param defaultType    Tipo con el que abre un registro nuevo.
 * @param typeLabel      Cómo se llama el tipo en esta pestaña: "cuenta" o "bien".
 */
export default function AssetCapture({
  types, belongsHere, defaultType, icon, title, typeLabel,
  namePlaceholder, addLabel, emptyTitle, emptyDescription, unitLabel = 'saldo',
}) {
  const { assets, matrix, add, update, remove } = useFinance();
  const byId = Object.fromEntries(matrix.assets.items.map((x) => [x.id, x]));

  const sheet = useRowSheet({ collection: 'assets', create: createAsset, add, update });
  const { draft } = sheet;

  /*
    ¿La tasa la manda el tipo, o la escribió el asesor?

    Mientras sea sugerida, cambiar el tipo la actualiza. En cuanto alguien la escribe a
    mano deja de moverse: sobreescribir un dato que la persona acaba de teclear, porque
    después tocó otro campo, es la clase de cosa que hace desconfiar de la herramienta.
  */
  const [manualRate, setManualRate] = useState(false);

  const suggestedRate = suggestedRateForAsset(draft);
  const isPpr = draft.type === 'ppr';

  const visible = newestFirst(assets.filter(belongsHere));

  const openNew = () => {
    setManualRate(false);
    /*
      El tipo por omisión lo pone la pestaña, no la fábrica: en "Ahorro" abre en una
      cuenta bancaria y en "Patrimonio" en un inmueble. Sin esto, agregar un bien
      arrancaría con un tipo de la otra pestaña y el registro desaparecería de la lista
      en cuanto se guardara.
    */
    sheet.openNew({
      type: defaultType,
      annualReturn: rateOrBlank(suggestedRateForAsset({ type: defaultType })),
    });
  };

  const openEdit = (asset) => {
    setManualRate(!isSuggestedRate(asset.annualReturn, suggestedRateForAsset(asset)));
    sheet.openEdit(asset);
  };

  /**
   * Cambia lo que se pida y recalcula la tasa sugerida a partir del borrador resultante.
   *
   * Los tres selectores que mueven la tasa —tipo, moneda y perfil del PPR— pasan por
   * aquí. La tasa se deduce del borrador ya con el cambio aplicado, no del campo que se
   * tocó: si cada selector calculara su propia tasa, el de moneda tendría que acordarse
   * del perfil y el de perfil de la moneda, y el primero que se olvidara daría una
   * sugerencia de otro instrumento.
   *
   * Si el resultado no tiene sugerencia, la tasa se va a cero, que el formulario dibuja
   * como campo vacío. Conservar la anterior sería peor: quien pasa de Afore a un bien sin
   * referencia se quedaría con un 7 % heredado que nadie eligió para eso.
   */
  const patchWithRate = (patch) => {
    if (manualRate) {
      sheet.patch(patch);
      return;
    }
    const next = { ...draft, ...patch };
    sheet.patch({ ...patch, annualReturn: rateOrBlank(suggestedRateForAsset(next)) });
  };

  const changeType = (type) => patchWithRate({ type });

  const isAfore = draft.type === 'afore';
  const isPremiumAsset = draft.type === 'ppr' || draft.type === 'insurance';

  /** Equivalente mensual de la prima, con la periodicidad elegida. */
  const premiumMonthly = toMonthly(draft.premiumAmount, draft.premiumFrequency);

  /**
   * El sueldo estima las dos aportaciones y, con ellas, la aportación mensual.
   *
   * Se recalcula al escribir el sueldo y no con un efecto que lo vigile: un efecto también
   * se dispararía al abrir una Afore ya guardada, y le sobreescribiría al asesor el desglose
   * exacto que copió del estado de cuenta con una estimación.
   */
  const changeSalary = (grossSalary) => {
    const { employerContribution, workerContribution } = aforeContributions(grossSalary);
    sheet.patch({
      grossSalary,
      employerContribution,
      workerContribution,
      monthlyContribution: employerContribution + workerContribution,
    });
  };

  /** Corregir una aportación a mano rehace la suma, sin tocar la otra ni el sueldo. */
  const changeBreakdown = (patch) => {
    const next = { ...draft, ...patch };
    sheet.patch({
      ...patch,
      monthlyContribution: (next.employerContribution || 0) + (next.workerContribution || 0),
    });
  };

  /*
    La prima y su periodicidad alimentan la aportación mensual, que es lo que lee el motor.

    Se normaliza aquí y se guarda también el monto y la frecuencia originales: guardar sólo
    el equivalente mensual dejaría una prima anual de 24,000 convertida en 2,000, imposible
    de reconocer al reabrir la póliza.
  */
  const changePremiumAmount = (premiumAmount) => {
    sheet.patch({
      premiumAmount,
      monthlyContribution: Math.round(toMonthly(premiumAmount, draft.premiumFrequency)),
    });
  };

  const changePremiumFrequency = (premiumFrequency) => {
    sheet.patch({
      premiumFrequency,
      monthlyContribution: Math.round(toMonthly(draft.premiumAmount, premiumFrequency)),
    });
  };

  /** De dónde sale la tasa sugerida, dicho en una línea. */
  const rateNote = (() => {
    if (isPpr) {
      const perfil = labelOf(PPR_PROFILES, draft.portfolioProfile ?? DEFAULT_PPR_PROFILE);
      const moneda = (draft.pprCurrency ?? DEFAULT_PPR_CURRENCY) === 'USD'
        ? 'en dólares'
        : 'en pesos';
      return `Histórico de un portafolio ${perfil.toLowerCase()} ${moneda}.`;
    }
    if (draft.type === 'real_estate') {
      return 'Sólo plusvalía. Si el inmueble se renta, esa renta va en el módulo de Ingresos.';
    }
    if (suggestedRate === null) {
      return `El rendimiento de ${labelOf(ASSET_TYPES, draft.type)} depende del caso: escríbelo.`;
    }
    return `Promedio histórico para ${labelOf(ASSET_TYPES, draft.type)}.`;
  })();

  return (
    <>
      <Card>
        <CardTitle
          icon={icon}
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={openNew}>
              Agregar
            </Button>
          }
        >
          {title}
        </CardTitle>

        {visible.length === 0 ? (
          <EmptyState
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Button size="sm" icon={Plus} onClick={openNew}>
                {addLabel}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {visible.map((asset) => {
              const analyzed = byId[asset.id];

              /*
                Que una cuenta alimente el módulo de retiro cambia cómo la lee el motor,
                así que se dice en la tarjeta. Sin esa marca, dos cuentas con saldos
                parecidos se ven iguales y pesan distinto en el diagnóstico.
              */
              const flag = isRetirementType(asset.type)
                ? <Badge status="neutral">Retiro</Badge>
                : null;

              return (
                <CompactRow
                  key={asset.id}
                  title={asset.name || `Sin nombre`}
                  badge={flag}
                  subtitle={[
                    labelOf(ASSET_TYPES, asset.type),
                    asset.monthlyContribution > 0
                      ? `+${fmtMXN(asset.monthlyContribution)}/mes`
                      : '',
                  ].filter(Boolean).join(' · ')}
                  amount={fmtMXN(asset.balance)}
                  note={analyzed
                    ? `proyectado ${fmtMXN(analyzed.projectedValue)}`
                    : unitLabel}
                  onEdit={() => openEdit(asset)}
                  onRemove={() => remove('assets', asset.id)}
                />
              );
            })}
          </div>
        )}
      </Card>

      <RowSheet
        isOpen={sheet.isOpen}
        onClose={sheet.close}
        onSave={sheet.save}
        isEditing={sheet.isEditing}
        title={typeLabel}
        hint="Registra el saldo actual, la aportación mensual, o ambos."
        canSave={(draft.name || '').trim() !== ''
          && (draft.balance > 0 || draft.monthlyContribution > 0)}
        saveLabel={addLabel}
      >
        <Field label="Concepto">
          <TextInput
            value={draft.name}
            onChange={(v) => sheet.patch({ name: v })}
            placeholder={namePlaceholder}
          />
        </Field>

        <Field
          label={`Tipo de ${typeLabel}`}
          hint={isRetirementType(draft.type)
            ? 'Esta cuenta alimenta tu módulo de retiro automáticamente'
            : undefined}
        >
          <Select value={draft.type} onChange={changeType} options={types} />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Saldo actual">
            <MoneyInput
              value={draft.balance}
              onChange={(v) => sheet.patch({ balance: v })}
              step="1000"
            />
          </Field>

          <Field
            label="Aportación mensual"
            hint={isAfore && draft.grossSalary > 0
              ? 'Suma de la aportación patronal y la tuya. Edítala para incluir aportaciones voluntarias.'
              : isPremiumAsset && draft.premiumAmount > 0
                ? `Equivale a tu prima de ${labelOf(PREMIUM_FREQUENCIES, draft.premiumFrequency).toLowerCase()}.`
                : undefined}
          >
            <MoneyInput
              value={draft.monthlyContribution}
              onChange={(v) => sheet.patch({ monthlyContribution: v })}
            />
          </Field>
        </div>

        {/*
          Desglose de la Afore.

          Casi nadie sabe cuánto le aporta su patrón, y es justo el número que abre la
          conversación de un PPR: "tu patrón pone esto, con esto no alcanza". Se estima del
          sueldo bruto, que sí se sabe de memoria.
        */}
        {isAfore && (
          <div className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <Field
              label="Sueldo mensual bruto"
              help="Con él se estiman las dos aportaciones. No se guarda en ningún otro cálculo del diagnóstico."
            >
              <MoneyInput value={draft.grossSalary} onChange={changeSalary} step="1000" />
            </Field>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Aportación patronal mensual" hint={AFORE_ESTIMATE_NOTE}>
                <MoneyInput
                  value={draft.employerContribution}
                  onChange={(v) => changeBreakdown({ employerContribution: v })}
                />
              </Field>

              <Field label="Aportación del trabajador">
                <MoneyInput
                  value={draft.workerContribution}
                  onChange={(v) => changeBreakdown({ workerContribution: v })}
                />
              </Field>
            </div>
          </div>
        )}

        {/*
          Prima de un PPR o de un seguro con ahorro.

          Se pregunta aparte de la "aportación mensual" porque estos dos instrumentos casi
          nunca se pagan por mes, y porque quién paga cambia el diagnóstico: una prima que
          cubre la empresa como prestación no compite con el gasto del mes, y una que sale
          del bolsillo sí.
        */}
        {isPremiumAsset && (
          <div className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Aportación / Prima">
                <MoneyInput value={draft.premiumAmount} onChange={changePremiumAmount} />
              </Field>

              <Field
                label="Frecuencia de pago"
                hint={premiumMonthly > 0 ? `${fmtMXN(premiumMonthly)} al mes` : undefined}
              >
                <Select
                  value={draft.premiumFrequency}
                  onChange={changePremiumFrequency}
                  options={PREMIUM_FREQUENCIES}
                />
              </Field>
            </div>

            <Field label="¿Quién realiza esta aportación?">
              <SegmentedControl
                value={draft.premiumPaidBy ?? 'self'}
                onChange={(v) => sheet.patch({ premiumPaidBy: v })}
                options={PREMIUM_PAYERS}
              />
            </Field>

            {/*
              El interruptor sólo aparece si la prima la paga la persona. Ofrecerlo cuando la
              cubre la empresa invitaría a restar de su presupuesto un dinero que no sale de
              su bolsillo, y el flujo libre saldría más bajo de lo que es.
            */}
            {(draft.premiumPaidBy ?? 'self') === 'self' ? (
              <Switch
                checked={!!draft.includeInFixedExpenses}
                onChange={(v) => sheet.patch({ includeInFixedExpenses: v })}
                label="Incluir automáticamente en mi presupuesto de Gastos Fijos"
                hint={premiumMonthly > 0
                  ? `Marca esta prima como un compromiso de ${fmtMXN(premiumMonthly)} al mes que sale de tu bolsillo.`
                  : 'Marca esta prima como un compromiso mensual que sale de tu bolsillo.'}
              />
            ) : (
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Al pagarla tu empresa, esta prima no se descuenta de tu flujo mensual: suma a
                tu patrimonio sin competir con tu gasto.
              </p>
            )}
          </div>
        )}

        {/*
          Moneda y perfil, sólo para el PPR. Son las dos preguntas que determinan su
          rendimiento, y sin ellas el campo de la tasa no tiene nada que sugerir.
        */}
        {isPpr && (
          <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-zinc-800
                          bg-zinc-950/40 p-3 sm:grid-cols-2"
          >
            <Field
              label="Moneda del plan"
              /*
                El aviso es obligatorio. El diagnóstico entero se calcula en pesos y esta
                app no convierte divisas: si alguien captura un saldo en dólares porque el
                selector dice "Dólares", su patrimonio queda dividido entre veinte y no
                hay nada en pantalla que lo explique.
              */
              hint="Los montos se siguen capturando en pesos. La moneda sólo ajusta el rendimiento sugerido."
            >
              <Select
                value={draft.pprCurrency ?? DEFAULT_PPR_CURRENCY}
                onChange={(v) => patchWithRate({ pprCurrency: v })}
                options={PPR_CURRENCIES}
              />
            </Field>

            <Field
              label="Perfil del portafolio"
              help="Un PPR rinde lo que rinde lo que se contrató dentro. Entre renta fija y renta variable hay varios puntos al año de diferencia."
            >
              <Select
                value={draft.portfolioProfile ?? DEFAULT_PPR_PROFILE}
                onChange={(v) => patchWithRate({ portfolioProfile: v })}
                options={PPR_PROFILES}
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <RateField
            label="Rendimiento anual"
            help="Puede ser negativo para bienes que se deprecian, como un auto."
            value={draft.annualReturn}
            suggested={suggestedRate}
            note={rateNote}
            isManual={manualRate}
            onUseManual={() => setManualRate(true)}
            onUseSuggested={() => {
              setManualRate(false);
              sheet.patch({ annualReturn: suggestedRate });
            }}
            onChange={(v) => sheet.patch({ annualReturn: v })}
            min={-100}
          />

          {/*
            "Horizonte" es vocabulario financiero, no lenguaje común: la palabra sola no
            dice si se miden años, si es una fecha o si es el plazo de un contrato. El pie
            traduce el término y da los tramos, que es lo que permite contestar sin saber
            qué es un horizonte de inversión.
          */}
          <Field
            label="Horizonte (años)"
            hint="El tiempo que planeas mantener este patrimonio o fondo antes de disponer de él. Corto plazo (0-2 años), Mediano plazo (3-7 años) o Largo plazo (más de 7 años)."
          >
            <NumberInput
              value={draft.horizonYears}
              onChange={(v) => sheet.patch({ horizonYears: v })}
              min={0}
              max={70}
            />
          </Field>
        </div>
      </RowSheet>
    </>
  );
}
