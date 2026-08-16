/**
 * src/lib/demoSession.js
 * Los datos de ejemplo no sobreviven a una recarga.
 *
 * El estado del diagnóstico se guarda entero en `localStorage`, y eso incluía a los
 * datos de ejemplo: quien pulsaba "Cargar Demo" una vez se quedaba con la familia
 * Hernández Ruiz cada vez que volvía a abrir la app, en su teléfono y para siempre.
 * Al asesor le aparecía un diagnóstico ajeno delante del prospecto, y el único
 * camino de vuelta estaba escondido dentro del menú de exportar.
 *
 * Aquí se descarta ese estado antes de que React monte, así que la app abre en
 * blanco sin que se vea un parpadeo de cifras que no son de nadie. Lo capturado a
 * mano no se toca: sólo se borra lo que quedó marcado como ejemplo.
 *
 * Va en su propio módulo, y no dentro del contexto financiero, porque
 * `FinanceContext.jsx` es zona intocable del proyecto: su rehidratación está
 * documentada y validada, y este arreglo no necesita entrar ahí para funcionar.
 */

/*
  Se busca por prefijo en lugar de por la clave exacta `df360:state:v1`.

  Repetir aquí el número de versión ataría este archivo al del contexto: el día que
  alguien lo suba a `v2` —algo que en este proyecto ya pasó con la clave del
  tablero— la limpieza dejaría de encontrar nada y volvería el ejemplo pegajoso,
  sin ningún error que lo delatara. El prefijo sobrevive a esa subida.
*/
const STATE_PREFIX = 'df360:state:';

/**
 * Borra el estado guardado si era de ejemplo. Silenciosa a propósito: en modo
 * privado `localStorage` lanza al leerse, y no poder limpiar no es motivo para
 * dejar la app sin arrancar.
 */
export function purgeDemoState() {
  if (typeof window === 'undefined') return;

  let store;
  try {
    store = window.localStorage;
  } catch {
    return;
  }

  /*
    Se recorre hacia atrás porque `removeItem` recoloca los índices: yendo hacia
    adelante, cada borrado haría saltarse la clave siguiente.
  */
  for (let i = store.length - 1; i >= 0; i -= 1) {
    try {
      const key = store.key(i);
      if (!key || !key.startsWith(STATE_PREFIX)) continue;

      const raw = store.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.isDemo === true) {
        store.removeItem(key);
      }
    } catch {
      /*
        Una entrada corrupta se salta y se sigue con las demás. El `try` va dentro
        del bucle y no fuera: envolviendo el recorrido completo, un solo JSON roto
        abortaría la limpieza de las claves que sí se podían leer.
      */
    }
  }
}
