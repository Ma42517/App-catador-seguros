import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createAsset } from '../../data/defaults';
import {
  Card, CardTitle, Field, TextInput, MoneyInput, NumberInput, Select,
  Button, EmptyState, Badge,
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
import { ASSET_TYPES, isRetirementType, fmtMXN } from '../../engine/finance';

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

          <Field label="Aportación mensual">
            <MoneyInput
              value={draft.monthlyContribution}
              onChange={(v) => sheet.patch({ monthlyContribution: v })}
            />
          </Field>
        </div>

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

          <Field label="Horizonte (años)">
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
