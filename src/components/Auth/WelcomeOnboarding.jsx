import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import ExpandiaMark from './ExpandiaMark';
import { APP_THEMES, themeFor, readAppTheme, writeAppTheme } from '../../lib/appTheme';
import {
  TEXT_SCALES, readTextScale, writeTextScale, applyTextScale,
} from '../../lib/textScale';
import { markWelcomeSeen } from '../../lib/welcomeOnboarding';

/**
 * src/components/Auth/WelcomeOnboarding.jsx
 *
 * Bienvenida breve ANTES del registro, al estilo de una conversación: una idea a la
 * vez, y lo ya contestado sube y se desvanece arriba en lugar de desaparecer de
 * golpe. Es deliberadamente corta —dos preguntas, ambas sobre cómo se verá la app—
 * porque el cuestionario de verdad (el de negocio) viene DESPUÉS del registro y es
 * largo; esto sólo deja la app a gusto de la persona y le da la bienvenida sin
 * cansarla. Nuestra gente va de joven a mayor, así que el lenguaje es llano y los
 * controles son grandes y pocos.
 *
 * No cambia la lógica de acceso: al terminar (o al saltar) marca la bienvenida como
 * vista y le cede la pantalla al login. Se muestra una sola vez por dispositivo.
 */

const ESLOGAN = 'Multiplica tus posibilidades';

/* Pasos del recorrido. 'intro' no es pregunta; las otras dos sí. */
const STEP_INTRO = 'intro';
const STEP_THEME = 'theme';
const STEP_SIZE = 'size';
const STEP_DONE = 'done';

/* Etiqueta llana de cada tamaño de texto, sin tecnicismos. */
const SIZE_LABEL = { normal: 'Normal', large: 'Grande', xlarge: 'Más grande' };

/**
 * Una línea del hilo de conversación. Las de más arriba se ven más tenues y más
 * chicas: es lo que da la sensación de que lo contestado "se aleja". `depth` = 0 es
 * la línea viva (abajo), 1 la anterior, 2 la de más atrás.
 */
function ThreadLine({ children, depth, colorClass }) {
  // El color lo pone el tema elegido, no la clase `dark` global del <html>: en
  // crema o claro el texto tiene que ser oscuro aunque el documento siga en modo
  // oscuro. La profundidad sólo gradúa opacidad y desenfoque, no el color.
  const fade = ['opacity-100', 'opacity-40 blur-[0.4px]', 'opacity-20 blur-[1px]'];
  const sizes = ['text-2xl sm:text-3xl', 'text-xl sm:text-2xl', 'text-lg sm:text-xl'];
  return (
    <motion.p
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`text-center font-light leading-snug ${colorClass}
                  ${sizes[depth] ?? sizes[2]} ${fade[depth] ?? fade[2]}`}
    >
      {children}
    </motion.p>
  );
}

export default function WelcomeOnboarding({ onFinish }) {
  const [step, setStep] = useState(STEP_INTRO);
  const [theme, setTheme] = useState(readAppTheme);
  const [size, setSize] = useState(readTextScale);
  const t = themeFor(theme);

  // El hilo de preguntas ya contestadas, de la más vieja a la más nueva. Es lo que
  // se dibuja apilado y difuminado por encima de la pregunta viva.
  const [thread, setThread] = useState([]);
  const bottomRef = useRef(null);

  // Al cambiar de paso, el nuevo contenido queda a la vista (abajo del hilo).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [step, thread.length]);

  const finish = () => {
    markWelcomeSeen();
    onFinish();
  };

  const chooseTheme = (value) => {
    setTheme(value);
    writeAppTheme(value);
  };

  const confirmTheme = () => {
    setThread((prev) => [...prev, `Tu app se verá en ${themeFor(theme).label.toLowerCase()}.`]);
    setStep(STEP_SIZE);
  };

  const chooseSize = (value) => {
    setSize(value);
    writeTextScale(value);
    applyTextScale(value); // Se ve el cambio al instante, en esta misma pantalla.
  };

  const confirmSize = () => {
    setThread((prev) => [...prev, `Texto en tamaño ${SIZE_LABEL[size].toLowerCase()}.`]);
    setStep(STEP_DONE);
  };

  // Las líneas difuminadas de arriba: las ya contestadas, con la más reciente
  // pegada a la pregunta viva. Se muestran como mucho dos, para no llenar la vista.
  const faded = thread.slice(-2);

  const bg = t.bgStyle ? '' : t.bg;

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col overflow-hidden px-6 ${bg}`}
      style={t.bgStyle}
    >
      {/* Saltar: siempre a la mano, discreto. No en la pantalla final. */}
      {step !== STEP_DONE && (
        <button
          type="button"
          onClick={finish}
          className={`absolute right-5 top-5 z-10 rounded-full px-3 py-1.5 text-sm font-medium
                      transition-opacity hover:opacity-70 ${t.muted}`}
        >
          Saltar
        </button>
      )}

      {/* ── INTRO: wordmark + eslogan + comenzar ── */}
      {step === STEP_INTRO && (
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          {/*
            Resplandor con el acento del tema detrás del wordmark: le quita el
            vacío al fondo. Se atenúa en claro/crema para no ensuciar el fondo.
          */}
          <div
            className="pointer-events-none absolute left-1/2 top-[40%] -z-0 h-64 w-80
                       -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${t.accent}44, transparent 70%)`,
              opacity: theme === 'dark' ? 1 : 0.45,
            }}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <ExpandiaMark theme={theme} size="text-5xl sm:text-6xl" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`mt-4 text-base font-medium tracking-wide sm:text-lg ${t.muted}`}
          >
            {ESLOGAN}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className={`mt-10 max-w-[16rem] text-base font-light leading-relaxed ${t.text} opacity-80`}
          >
            Antes de empezar, dejemos la app a tu gusto.
          </motion.p>

          <motion.button
            type="button"
            onClick={() => setStep(STEP_THEME)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.5 }}
            whileTap={{ scale: 0.95 }}
            style={{ backgroundColor: t.accent }}
            className="mt-9 flex items-center gap-2 rounded-full px-10 py-3.5 text-base
                       font-bold text-[#0B1A30] shadow-lg transition-transform
                       hover:brightness-105"
          >
            Comenzar
            <ArrowRight size={18} />
          </motion.button>
        </div>
      )}

      {/* ── PREGUNTAS: hilo que sube + control vivo abajo ── */}
      {(step === STEP_THEME || step === STEP_SIZE) && (
        <div className="flex flex-1 flex-col justify-center py-16">
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
            <AnimatePresence initial={false}>
              {faded.map((line, i) => (
                <ThreadLine key={line + i} depth={faded.length - i} colorClass={t.text}>
                  {line}
                </ThreadLine>
              ))}
            </AnimatePresence>

            {/* Pregunta viva */}
            {step === STEP_THEME && (
              <ThreadLine depth={0} colorClass={t.text}>¿Cómo quieres que se vea tu app?</ThreadLine>
            )}
            {step === STEP_SIZE && (
              <ThreadLine depth={0} colorClass={t.text}>¿De qué tamaño lees mejor?</ThreadLine>
            )}

            {/* Controles de la pregunta viva */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-6 w-full"
            >
              {step === STEP_THEME ? (
                <ThemeChooser
                  theme={theme}
                  onChoose={chooseTheme}
                  onContinue={confirmTheme}
                  activeTheme={t}
                />
              ) : (
                <SizeChooser size={size} onChoose={chooseSize} onContinue={confirmSize} activeTheme={t} />
              )}
            </motion.div>
          </div>
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── LISTO: remate manuscrito y entrada al login ── */}
      {step === STEP_DONE && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <motion.p
            initial={{ opacity: 0, y: 10, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-hand text-6xl sm:text-7xl"
            style={{ color: t.accent }}
          >
            ¡Listo!
          </motion.p>
          <p className={`mt-4 max-w-xs text-lg font-light ${t.text}`}>
            Ya quedó a tu gusto. Vamos a entrar.
          </p>

          <button
            type="button"
            onClick={finish}
            style={{ backgroundColor: t.accent }}
            className="mt-10 rounded-full px-10 py-3.5 text-base font-bold text-[#0B1A30]
                       shadow-lg transition-transform hover:brightness-105 active:scale-95"
          >
            Continuar
          </button>
        </motion.div>
      )}
    </div>
  );
}

/* ── Selector de tema: tres círculos de color ── */
function ThemeChooser({ theme, onChoose, onContinue, activeTheme }) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center justify-center gap-8">
        {APP_THEMES.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChoose(option.value)}
              aria-label={option.label}
              aria-pressed={active}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={`grid h-16 w-16 place-items-center rounded-full ring-2
                            transition-all active:scale-90 ${
                  active ? `${option.ring} ring-offset-2 ring-offset-transparent scale-110`
                    : 'ring-transparent opacity-70'
                }`}
                style={{ backgroundColor: option.swatch,
                  boxShadow: active ? '0 6px 20px -6px rgba(0,0,0,0.45)' : 'none' }}
              >
                {active && (
                  <Check
                    size={22}
                    strokeWidth={3}
                    className={option.value === 'dark' ? 'text-white' : 'text-stone-800'}
                  />
                )}
              </span>
              {/*
                El color del rótulo viene del tema elegido (`activeTheme.text`), no
                del blanco global: en crema o claro, "Oscuro/Claro/Crema" tienen que
                leerse en oscuro. Ése era el texto que se perdía sobre el crema.
              */}
              <span
                className={`text-sm font-semibold ${activeTheme.text}
                            ${active ? 'opacity-100' : 'opacity-55'}`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{ backgroundColor: activeTheme.accent }}
        className="rounded-full px-10 py-3 text-base font-bold text-[#0B1A30]
                   shadow-lg transition-transform hover:brightness-105 active:scale-95"
      >
        Continuar
      </button>
    </div>
  );
}

/* ── Selector de tamaño de texto: cada opción se muestra en su propio tamaño ── */
function SizeChooser({ size, onChoose, onContinue, activeTheme }) {
  const preview = { normal: 'text-base', large: 'text-xl', xlarge: 'text-3xl' };
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-xs flex-col gap-3">
        {TEXT_SCALES.map((scale) => {
          const active = size === scale.value;
          return (
            <button
              key={scale.value}
              type="button"
              onClick={() => onChoose(scale.value)}
              aria-pressed={active}
              className="flex items-center justify-between rounded-2xl border px-5 py-4
                         transition-all active:scale-[0.98]"
              style={{
                ...(activeTheme.inputStyle ?? {}),
                borderColor: active ? activeTheme.accent : undefined,
                boxShadow: active ? `inset 0 0 0 1px ${activeTheme.accent}` : undefined,
              }}
            >
              <span className={`font-semibold ${preview[scale.value]} ${activeTheme.text}`}>
                {SIZE_LABEL[scale.value]}
              </span>
              {active && (
                <Check size={20} strokeWidth={3} className="shrink-0"
                  style={{ color: activeTheme.accent }} />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{ backgroundColor: activeTheme.accent }}
        className="rounded-full px-10 py-3 text-base font-bold text-[#0B1A30]
                   shadow-lg transition-transform hover:brightness-105 active:scale-95"
      >
        Continuar
      </button>
    </div>
  );
}
