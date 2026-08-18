import { useState, useEffect } from 'react';
import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';
import PointsPill from './PointsPill';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/** Cuánto dura la entrada central del Tracker antes de "teletransportarse". */
const SPLASH_MS = 2500;
/** Duración del escape hacia abajo del círculo grande (debe calzar con la clase `duration-*` de abajo). */
const SPLASH_EXIT_MS = 300;

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * El día y el saludo viven arriba; el centro lo ocupa la secuencia de inicio.
 * El saludo entra palabra por palabra, sin vibración: el golpe al tacto se
 * reserva para los botones y los avisos del cronómetro.
 */
export default function TodayView({ name, puntosActuales = 0 }) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  /*
    Arriba sólo la fecha y el nombre. La pregunta del día ("¿cerramos un negocio
    hoy?") ya la hace el texto del centro, y repetirla aquí sonaba a eco: se leía
    dos veces la misma invitación antes de llegar a la agenda.
  */
  const greeting = saludo ? `Hola, ${saludo}.` : 'Hola.';

  /*
    Coreografía del Tracker de 25 Puntos:

    1. `showSplash` en `true` durante los primeros `SPLASH_MS`: el anillo
       grande flota centrado sobre la pantalla, encima del contenido base
       (que ya está completo y quieto — nada en esta pantalla se mueve para
       darle sitio).
    2. Al pasar a `false`, el anillo grande se contrae (transición CSS de
       escala + opacidad, no una animación de teclado nuevo) mientras el
       anillo pequeño de la cabecera aparece de golpe en el mismo instante:
       es la "teletransportación" — el destino ya estaba en su lugar final
       desde el principio, listo para recibirlo.
    3. `splashMounted` se apaga un poco después de `showSplash`, el tiempo
       exacto que tarda la transición de salida (`SPLASH_EXIT_MS`), para
       desmontar el overlay ya invisible en vez de dejarlo flotando en el
       DOM para siempre con `opacity-0`.
  */
  const [showSplash, setShowSplash] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);
  /*
    Arranca en `false` y se enciende un instante después del montaje, a
    propósito. La transición de entrada (`scale-0 opacity-0` -> `scale-100
    opacity-100`) sólo se dispara si el navegador pinta primero el estado de
    partida y luego el de llegada en fotogramas distintos; si los dos
    llegaran en la misma pasada de render, no habría transición que animar,
    sólo un elemento que aparece ya grande.
  */
  const [splashEntered, setSplashEntered] = useState(false);

  useEffect(() => {
    const enter = requestAnimationFrame(() => setSplashEntered(true));
    const hide = setTimeout(() => setShowSplash(false), SPLASH_MS);
    const unmount = setTimeout(() => setSplashMounted(false), SPLASH_MS + SPLASH_EXIT_MS);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(hide);
      clearTimeout(unmount);
    };
  }, []);

  return (
    <>
      <AISequence
        header={(
          <div className="mx-auto max-w-2xl px-4 pt-8">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                {fecha}
              </p>
              {/*
                El destino de la teletransportación. Oculto mientras dura la
                entrada central y montado de golpe en el instante en que
                `showSplash` cae — `animate-pop-in` es su propio "aterrizaje",
                corto y con un ligero rebote, para que el salto se sienta como
                una llegada y no como una aparición cualquiera.
              */}
              {!showSplash && (
                <PointsPill puntosActuales={puntosActuales} size="sm" className="animate-pop-in" />
              )}
            </div>
            {/*
              El saludo carga en su posición final desde el primer fotograma,
              sin ninguna animación que lo desplace: es "la base", y la base
              no se mueve para que el círculo grande tenga sitio.
            */}
            <div className="mt-1">
              <WelcomeGreeting text={greeting} accentWords={saludo.split(' ')} />
            </div>
          </div>
        )}
      />

      {/*
        Fase 1, la entrada dramática. Hermano de `<AISequence>` y no algo que
        vive dentro de ella — su `children` sigue detrás del efecto de
        escritura del mensaje central (correcto para contenido adicional real,
        ver AISequence.jsx), y este overlay tiene que aparecer desde el
        milisegundo cero con su propio reloj de `SPLASH_MS`, sin esperar a
        que el texto termine de escribirse.

        `fixed inset-0` + `pointer-events-none`: flota sobre todo el
        contenido, no empuja nada de layout (el saludo y los eventos ya están
        en su sitio final debajo) y no intercepta ningún toque — es sólo
        lectura, según la arquitectura original del Tracker.
      */}
      {splashMounted && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
        >
          {/*
            Una sola transición CSS gobierna entrada y salida — nada de
            keyframes aquí. Mezclar una animación de teclado con una
            transición sobre las mismas propiedades deja a la animación con
            el control incluso después de terminar (`fill-mode`), y la
            transición de salida simplemente no se vería: exactamente el
            bug que este componente tenía que evitar.

            `showSplash && splashEntered` decide el tamaño final: entra en
            grande sólo cuando ambos son ciertos (ya montado, ya en su
            fotograma de llegada); cualquier otro caso —todavía no entró, o
            ya le tocó salir— colapsa a `scale-0 opacity-0`.
          */}
          <div
            className={`transition-[transform,opacity] duration-300 ease-out
                        ${showSplash && splashEntered ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          >
            <PointsPill puntosActuales={puntosActuales} size="lg" variant="splash" />
          </div>
        </div>
      )}
    </>
  );
}
