import { useEffect, useRef } from 'react';
import useTypewriter from '../../lib/useTypewriter';

/**
 * Una frase que se escribe sola y avisa al terminar.
 *
 * El aviso es lo que permite encadenar la escena: la línea no se dibuja hasta que
 * la pregunta acaba, y el texto de ejemplo no aparece hasta que la línea está
 * trazada. Con retardos fijos habría que adivinar cuánto tarda cada frase, y al
 * cambiar una palabra la coreografía se desincronizaría en silencio.
 *
 * El texto completo va aparte en un `sr-only` y el animado queda oculto para
 * lectores de pantalla: si no, cada letra dispara un anuncio y la pregunta se oye
 * veinte veces a medio formar.
 */
export default function TypedLine({ text, className = '', onDone, cursor = true }) {
  const { typed, isTyping } = useTypewriter(text);

  /*
    El aviso se manda una sola vez por frase. El efecto también se dispara si
    cambia la identidad de `onDone` —y cambia en cada render del padre, porque casi
    siempre es una función anónima—, así que sin este candado la escena avanzaría
    varias veces y se saltaría un paso.
  */
  const notified = useRef(null);

  useEffect(() => {
    if (isTyping || notified.current === text) return;
    notified.current = text;
    onDone?.();
  }, [isTyping, text, onDone]);

  return (
    <>
      <p className="sr-only">{text}</p>
      <p className={className} aria-hidden="true">
        {typed}
        {cursor && isTyping && <span className="animate-pulse text-white/50">|</span>}
      </p>
    </>
  );
}
