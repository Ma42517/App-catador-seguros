import { Home, Landmark } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Card, CardTitle, SectionTitle, Badge } from '../ui';
import { DonutChart } from '../charts';
import AssetCapture from './AssetCapture';
import { PATRIMONIO_TYPES, isPatrimonioAsset } from '../../data/assetGroups';
import { fmtMXN, fmtPct } from '../../engine/finance';

/**
 * Patrimonio: los bienes, no el dinero.
 *
 * Es lo que queda de la pestaña que se llamaba "Activos" después de sacarle el ahorro.
 * Aquí van la casa, un terreno, el auto, un negocio: cosas que se poseen y que no se
 * pueden gastar el mes que viene.
 *
 * El nombre cambió por lo mismo que se partió la pestaña: "activos" obligaba a explicar
 * qué contaba como activo antes de poder capturar nada. "Patrimonio" se entiende sin
 * glosario, y ya no tiene que abarcar a la vez una cuenta de nómina y una casa.
 *
 * Es la MISMA colección `data.assets` que "Ahorro y Afore" —sólo cambia el filtro de
 * tipos— así que el patrimonio neto se sigue calculando sobre todo: los bienes de aquí
 * más el ahorro de allá, menos las deudas.
 */
export default function PatrimonioStep() {
  const { matrix } = useFinance();
  const a = matrix.assets;
  const nw = matrix.netWorth;

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 6"
        title="Patrimonio"
        description="Los bienes que posees: casa, terrenos, autos, un negocio. Tus cuentas, tu Afore y tus inversiones van en el paso siguiente."
      />

      <AssetCapture
        types={PATRIMONIO_TYPES}
        belongsHere={isPatrimonioAsset}
        defaultType="real_estate"
        icon={Home}
        title="Bienes registrados"
        typeLabel="bien"
        namePlaceholder="Casa habitación"
        addLabel="Agregar bien"
        emptyTitle="Sin bienes registrados"
        emptyDescription="Una casa, un terreno, el auto, un negocio. Si no tienes ninguno, puedes avanzar."
        unitLabel="valor"
      />

      {/*
        El patrimonio neto mira la colección COMPLETA: los bienes de esta pestaña más el
        ahorro de la siguiente, contra las deudas. Se queda aquí porque es la cifra que
        cierra el bloque de lo que se posee, y se avisa en su ayuda que incluye cuentas que
        todavía no se han capturado: si no, un patrimonio que no cuadra con lo que se ve en
        pantalla parece un error del cálculo.
      */}
      <Card>
        <CardTitle
          icon={Landmark}
          help="Incluye también tu ahorro y tus cuentas del paso siguiente, no sólo los bienes de esta pantalla."
          action={
            <Badge status={nw.isNegative ? 'red' : nw.leverageRatio > 0.6 ? 'yellow' : 'green'}>
              Apalancamiento {fmtPct(nw.leverageRatio)}
            </Badge>
          }
        >
          Patrimonio neto
        </CardTitle>

        <DonutChart
          data={[
            { label: 'Activos líquidos', value: a.liquidAssets, color: 'rgb(16 185 129)' },
            { label: 'Activos no líquidos', value: a.illiquidAssets, color: 'rgb(37 99 235)' },
            { label: 'Pasivos', value: nw.totalLiabilities, color: 'rgb(220 38 38)' },
          ]}
          centerValue={fmtMXN(nw.netWorth)}
          centerLabel="patrimonio"
        />

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-700/50 pt-3 text-center text-xs">
          <div>
            <p className="text-zinc-400">Activos</p>
            <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(nw.totalAssets)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Pasivos</p>
            <p className="font-semibold tabular-nums text-rose-400">{fmtMXN(nw.totalLiabilities)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Neto</p>
            <p className={`font-semibold tabular-nums ${nw.isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
              {fmtMXN(nw.netWorth)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
