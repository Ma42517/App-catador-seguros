/**
 * src/data/assetGroups.js
 * Reparto de los tipos de activo entre las dos pestañas que los capturan.
 *
 * "Ahorro y Afore" y "Patrimonio" son DOS PANTALLAS SOBRE LA MISMA COLECCIÓN. Las dos
 * leen y escriben `data.assets`; lo único que cambia es qué tipos muestra cada una.
 *
 * Es la decisión de fondo de esta separación, y es lo que la hace segura: el motor sigue
 * recibiendo un solo arreglo de activos, así que el patrimonio neto, el fondo de
 * emergencia y el capital proyectado de retiro se calculan exactamente igual que antes.
 * Partir los datos en dos colecciones habría obligado a sumarlas en cada fórmula, y la
 * primera que se olvidara habría dejado al prospecto con la mitad de su ahorro.
 */
import { ASSET_TYPES } from '../engine/finance.js';

/**
 * Lo que se captura en "Ahorro y Afore": dinero, no cosas.
 *
 * El criterio es si el saldo es una cantidad de dinero que crece con una tasa, en lugar
 * de un bien que se posee. Un Afore y una cuenta de banco se parecen entre sí mucho más
 * que un Afore y una casa, aunque las tres fueran "activos" en la pestaña anterior.
 */
export const SAVINGS_TYPE_VALUES = [
  'cash', 'bank', 'emergency_fund', 'cetes', 'stocks', 'etf',
  'afore', 'ppr', 'retirement',
  /*
    El seguro con ahorro entra aquí y no en Patrimonio, aunque sea ilíquido.

    El criterio de estas dos pestañas no es la liquidez sino qué clase de cosa se captura:
    dinero apartado que crece con una tasa, o bienes que se poseen. Una póliza dotal es lo
    primero —se aporta una prima y acumula valor de rescate— y se parece mucho más a un PPR
    que a una casa. Puesto en Patrimonio quedaría junto a los terrenos y los autos, donde
    nadie iría a buscar su seguro.
  */
  'insurance',
];

const SAVINGS_SET = new Set(SAVINGS_TYPE_VALUES);

/** Opciones del selector de "Ahorro y Afore", en el orden de la lista de arriba. */
export const SAVINGS_TYPES = SAVINGS_TYPE_VALUES
  .map((v) => ASSET_TYPES.find((t) => t.value === v))
  .filter(Boolean);

/**
 * Opciones de "Patrimonio": todo lo que no es ahorro.
 *
 * Se define por resta y no con una segunda lista escrita a mano. Con dos listas, un tipo
 * nuevo en el motor —o uno que alguien olvide añadir— no aparecería en ninguna de las dos
 * pestañas: el activo existiría en los datos, contaría en los cálculos y no habría forma
 * de verlo ni de corregirlo desde la interfaz. Por resta, lo que no es ahorro siempre
 * tiene dónde salir.
 */
export const PATRIMONIO_TYPES = ASSET_TYPES.filter((t) => !SAVINGS_SET.has(t.value));

/** ¿Este activo se captura en "Ahorro y Afore"? */
export function isSavingsAsset(asset) {
  return SAVINGS_SET.has(asset?.type);
}

/**
 * ¿Este activo se captura en "Patrimonio"?
 *
 * La negación de la anterior, a propósito. Un activo con un tipo que no reconoce ninguna
 * de las dos listas —un dato viejo, o uno escrito a mano— cae aquí y se puede editar, en
 * lugar de volverse invisible en las dos pantallas.
 */
export function isPatrimonioAsset(asset) {
  return !isSavingsAsset(asset);
}
