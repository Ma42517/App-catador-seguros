import { useState, useEffect, useMemo } from 'react';
import { useEvents } from '../../context/EventContext';
import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';
import { buildTodayMessage } from './todayMessage';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/** Cuánto se mantiene visible el mensaje del prólogo antes de desvanecerse. */
const SPLASH_HOLD_MS = 2500;
/** Duración del fade-in de entrada y del fade-out de salida del mensaje. */
const SPLASH_FADE_MS = 500;

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * Se abre con un prólogo cinematográfico: pantalla negra, el mensaje del día
 * aparece con un fade-in suave, se queda `SPLASH_HOLD_MS` en pantalla y se
 * desvanece. Al terminar, el resto de la interfaz —fecha, saludo,
 * recordatorios, y la barra de navegación inferior, que vive fuera de este
 * componente pero ya está montada por debajo— queda revelada de golpe: no
 * hay una segunda animación de entrada después del prólogo, porque el
 * prólogo ya fue el momento dramático.
 *
 * El overlay cubre toda la pantalla con negro sólido desde el primer
 * fotograma —nunca se desvanece él mismo, sólo el texto de dentro—, así que
 * nada de lo que está montado debajo (incluida la barra inferior, que vive
 * en `AdminLayout` y no se gobierna desde aquí) se alcanza a ver ni un
 * instante mientras dura el prólogo.
 */
export default function TodayView({ name }) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const greeting = saludo ? `Hola, ${saludo}.` : 'Hola.';

  /*
    El mismo mensaje que antes se escribía letra por letra en el cuerpo del
    tablero, ahora aquí, para el prólogo. `buildTodayMessage` está preparado
    para depender de más que el conteo de pendientes el día que haga falta
    —ver el comentario en `todayMessage.js`—, así que este componente no
    tiene que cambiar cuando esa lógica crezca.
  */
  const { highPriorityToday } = useEvents();
  const message = useMemo(
    () => buildTodayMessage(highPriorityToday.length),
    [highPriorityToday.length],
  );

  /** Controla sólo la opacidad del texto: el fondo negro nunca se desvanece. */
  const [textVisible, setTextVisible] = useState(false);
  /** Cuándo se retira el overlay del DOM, ya invisible del todo. */
  const [splashMounted, setSplashMounted] = useState(true);

  useEffect(() => {
    /*
      Arranca en `false` y se enciende un instante después del montaje, a
      propósito: la transición de opacidad sólo se dispara si el navegador
      pinta primero el estado de partida y luego el de llegada en fotogramas
      distintos. Si los dos llegaran en la misma pasada de render, el texto
      aparecería de golpe, sin el fade-in que se pidió.
    */
    const enter = requestAnimationFrame(() => setTextVisible(true));
    const fadeOut = setTimeout(() => setTextVisible(false), SPLASH_HOLD_MS);
    const unmount = setTimeout(() => setSplashMounted(false), SPLASH_HOLD_MS + SPLASH_FADE_MS);

    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(fadeOut);
      clearTimeout(unmount);
    };
  }, []);

  return (
    <>
      {/*
        El tablero se monta desde el primer fotograma, no después del
        prólogo: mientras el overlay es negro sólido, nada de esto se ve, así
        que no hace falta retrasar su montaje. El beneficio es justo el que
        pide la Fase 2 — al desaparecer el overlay, todo esto ya está
        completamente pintado y aparece de golpe, sin una animación de
        entrada propia que lo delate.
      */}
      <AISequence
        header={(
          <div className="mx-auto max-w-2xl px-4 pt-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
              {fecha}
            </p>
            <div className="mt-1">
              <WelcomeGreeting text={greeting} accentWords={saludo.split(' ')} />
            </div>
          </div>
        )}
      />

      {/*
        Fase 1 — el prólogo. `z-[70]` es a propósito más alto que cualquier
        otra capa fija de la app (la barra inferior vive en `z-50`, las hojas
        modales en `z-[60]`): tiene que quedar por encima de todo sin
        excepción mientras dure, incluida una barra de navegación que ya está
        montada y visible por debajo.
      */}
      {splashMounted && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black px-6"
        >
          <p
            className={`max-w-md text-center text-xl font-light text-white
                        transition-opacity duration-500 ease-out
                        ${textVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {message}
          </p>
        </div>
      )}
    </>
  );
}
