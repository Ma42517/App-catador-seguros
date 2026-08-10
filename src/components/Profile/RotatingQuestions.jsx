import { useEffect, useState } from 'react';
import { PROSPECTING_QUESTIONS, QUESTION_INTERVAL_MS } from '../../data/prospectingQuestions';

/*
  Lo que tarda el texto en apagarse antes de cambiar. Tiene que coincidir con la
  duración de la transición en las clases: si el reemplazo llegara antes, la
  frase nueva aparecería a medio desvanecer y se leerían las dos superpuestas.
*/
const FADE_MS = 400;

/**
 * Preguntas que se relevan solas, entre el video y el botón de agendar.
 *
 * Rotan en lugar de listarse por una razón de espacio y otra de lectura: las
 * cuatro juntas ocupan media tarjeta y se leen como un menú que hay que
 * descartar, mientras que de una en una cada frase tiene su turno completo de
 * atención. Quien no se reconoce en la primera espera tres segundos; quien sí,
 * ya está mirando el botón.
 */
export default function RotatingQuestions({
  questions = PROSPECTING_QUESTIONS,
  intervalMs = QUESTION_INTERVAL_MS,
}) {
  const [index, setIndex] = useState(0);
  const [isVisible, setVisible] = useState(true);

  useEffect(() => {
    // Con una sola frase no hay nada que relevar, y un temporizador encendido
    // para siempre gastaría batería por un cambio que nunca ocurre.
    if (questions.length < 2) return undefined;

    let swap;

    const cycle = setInterval(() => {
      setVisible(false);
      swap = setTimeout(() => {
        setIndex((current) => (current + 1) % questions.length);
        setVisible(true);
      }, FADE_MS);
    }, intervalMs);

    /*
      Se limpian los dos relojes. El interior es el que se olvida y el que
      importa: al voltear la tarjeta en el momento justo, quedaría pendiente un
      cambio de estado sobre un componente que ya no existe.
    */
    return () => {
      clearInterval(cycle);
      clearTimeout(swap);
    };
  }, [questions, intervalMs]);

  return (
    <div className="mb-5">
      {/*
        Alto reservado para dos renglones. Las frases no miden lo mismo y sin esa
        reserva el botón de agendar subiría y bajaría cada tres segundos: un
        blanco que se mueve solo bajo el pulgar.
      */}
      <p
        aria-hidden="true"
        className={`flex min-h-[3.25rem] items-center justify-center px-2 text-center
                    text-[15px] font-semibold leading-snug text-sky-300
                    transition-opacity duration-[400ms] ease-in-out
                    motion-reduce:transition-none
                    ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {questions[index]}
      </p>

      {/*
        Las cuatro preguntas, para quien usa lector de pantalla.

        El párrafo de arriba queda oculto para la asistencia y esta lista la
        sustituye. Anunciar un texto que cambia solo cada tres segundos
        interrumpe la lectura de todo lo demás —y el prospecto no puede volver
        atrás a una frase que ya pasó—, así que aquí las cuatro están disponibles
        de una vez y en silencio.
      */}
      <ul className="sr-only">
        {questions.map((question) => <li key={question}>{question}</li>)}
      </ul>
    </div>
  );
}
