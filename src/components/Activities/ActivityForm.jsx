import { useState, useEffect } from 'react';
import { Check, BookUser, X } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { PRIORITIES, DEFAULT_PRIORITY } from './priorities';

/** Estilo compartido de los campos; adaptativo al tema. */
const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors [color-scheme:light] '
  + 'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 '
  + 'dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark]';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/*
  Catálogo cerrado del embudo de ventas: sólo se puede elegir una de estas
  ocho opciones para una "Nueva Actividad", nunca escribir un título libre.
  Es lo que reemplaza al `<input type="text">` que ensuciaba la base con
  textos inconsistentes ("llamar a laura", "Llamar Laura!!", "LLAMADA
  LAURA"...) y que además obligaba a teclear en cada actividad, la fricción
  que este cambio busca eliminar. Mismo criterio de catálogo cerrado que ya
  usa `TASK_TYPE_OPTIONS` en `FirstLoginIntro.jsx` — valores distintos
  porque son dos catálogos con propósito distinto (esa lista es del
  Onboarding, "descarga tu mente"; ésta es el registro del día a día).
*/
const ACTIVITY_TYPE_OPTIONS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'cita', label: 'Cita' },
  { value: 'cita_inicial', label: 'Cita Inicial' },
  { value: 'cita_propuesta', label: 'Cita de Propuesta' },
  { value: 'cita_cierre', label: 'Cita de Cierre' },
  { value: 'entrega_poliza', label: 'Entrega de Póliza' },
  { value: 'cobro', label: 'Cobro' },
];

/** Etiqueta legible de una actividad del catálogo; respaldo al valor crudo si alguna vez llega uno fuera de la lista (dato viejo). */
function activityTypeLabel(value) {
  return ACTIVITY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * ¿El navegador soporta el selector nativo de contactos (Contact Picker
 * API)? Mismo criterio que ya usa `FirstLoginIntro.jsx`: sólo Chrome/Edge en
 * Android la implementan hoy, y en cualquier otro navegador el botón
 * "Vincular a un prospecto" simplemente no se dibuja — no hay alternativa
 * degradada porque no la pide esta fase.
 */
function isContactPickerSupported() {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
    && typeof window !== 'undefined' && 'ContactsManager' in window;
}

/** Fecha y hora de hoy en el formato que esperan los inputs nativos. */
function todayParts() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * Formulario de actividad o recordatorio. La prioridad se elige aquí, al final,
 * justo antes de guardar: es una decisión sobre *este* evento, no un ajuste
 * global del menú de agregar.
 */
export default function ActivityForm({ isOpen, onClose, type = 'actividad', onSave }) {
  const isReminder = type === 'recordatorio';

  // El recordatorio conserva el texto libre: "Llamar a Laura por su
  // póliza" es una nota personal para acordarse de algo, no un paso del
  // embudo de ventas — el catálogo cerrado sólo aplica a "Nueva Actividad".
  const [title, setTitle] = useState('');

  // Catálogo cerrado, exclusivo de "Nueva Actividad": arranca con la
  // primera opción ya marcada (mismo criterio que un grupo de radio, nunca
  // vacío) para que la persona no tenga que tocar nada si de verdad va a
  // registrar justo eso.
  const [tipoActividad, setTipoActividad] = useState(ACTIVITY_TYPE_OPTIONS[0].value);

  // Prospecto vinculado (opcional): nace vacío en cada apertura, se llena
  // con el selector nativo de contactos si el navegador lo soporta.
  const [prospecto, setProspecto] = useState(null);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [error, setError] = useState('');

  const [contactPickerSupported] = useState(isContactPickerSupported);

  // Cada apertura empieza en limpio, con la fecha y hora actuales.
  useEffect(() => {
    if (!isOpen) return;
    const parts = todayParts();
    setTitle('');
    setTipoActividad(ACTIVITY_TYPE_OPTIONS[0].value);
    setProspecto(null);
    setDate(parts.date);
    setTime(parts.time);
    setPriority(DEFAULT_PRIORITY);
    setError('');
  }, [isOpen]);

  /**
   * Abre el selector nativo de contactos y vincula el primero elegido.
   * Cancelar el selector, o negar el permiso, lanza
   * `AbortError`/`NotAllowedError` — se ignora en silencio, igual que
   * cancelar cualquier diálogo nativo del sistema.
   */
  const linkProspect = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!picked.length) return;
      setProspecto({
        nombre: picked[0].name?.[0] ?? '',
        telefono: picked[0].tel?.[0] ?? '',
      });
    } catch {
      // Selector cancelado o permiso negado: no hay nada que vincular.
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isReminder && !title.trim()) {
      setError('Escribe un título para continuar.');
      return;
    }

    // Los inputs nativos de fecha y hora se pueden vaciar. Sin este respaldo,
    // el evento quedaría fuera de la agenda del día, agrupado en "Sin fecha".
    const parts = todayParts();

    if (isReminder) {
      onSave?.({
        type,
        title: title.trim(),
        date: date || parts.date,
        time: time || parts.time,
        priority,
      });
      onClose();
      return;
    }

    /*
      El título que ven `CalendarView.jsx`/`ActionableCard.jsx` sigue
      siendo un texto legible —esas pantallas no saben nada de
      `tipo_actividad`—, pero ya no lo teclea la persona: se deriva de la
      opción elegida, con el nombre del prospecto vinculado si lo hay
      (mismo patrón que ya usa `FirstLoginIntro.jsx` para sus tareas:
      `"${etiqueta}: ${nombre}"`). `tipo_actividad` viaja aparte, como el
      valor estructurado y consistente que este cambio vino a garantizar.
    */
    const label = activityTypeLabel(tipoActividad);
    onSave?.({
      type,
      tipo_actividad: tipoActividad,
      title: prospecto?.nombre ? `${label}: ${prospecto.nombre}` : label,
      telefono: prospecto?.telefono ?? '',
      date: date || parts.date,
      time: time || parts.time,
      priority,
    });
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      label={isReminder ? 'Nuevo recordatorio' : 'Nueva actividad'}
    >
      <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
        {isReminder ? 'Nuevo Recordatorio' : 'Nueva Actividad'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isReminder ? (
          <div>
            <label className={LABEL} htmlFor="entry-title">¿Qué debes recordar?</label>
            <input
              id="entry-title"
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Llamar a Laura por su póliza"
              autoComplete="off"
            />
          </div>
        ) : (
          <>
            {/*
              Catálogo cerrado de 8 opciones, en vez del input de texto
              libre: reemplaza por completo a "¿QUÉ VAS A HACER?" — elegir
              ya es responder, no hace falta teclear nada para registrar
              qué tipo de actividad es. `radiogroup` porque es una elección
              única entre opciones fijas, mismo patrón que ya usa el
              selector de Prioridad más abajo en este mismo formulario.
            */}
            <div>
              <span className={LABEL}>¿Qué vas a hacer?</span>
              <div
                role="radiogroup"
                aria-label="Tipo de actividad"
                className="grid grid-cols-2 gap-2"
              >
                {ACTIVITY_TYPE_OPTIONS.map((option) => {
                  const isActive = tipoActividad === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => setTipoActividad(option.value)}
                      className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold
                                 transition-all active:scale-95 focus-visible:outline-none
                                 focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 '
                            + 'dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/*
              Vincular a un prospecto: opcional, y sólo se dibuja donde el
              navegador de verdad puede abrir el selector nativo de
              contactos —igual criterio que ya usa `FirstLoginIntro.jsx`—.
              El nombre vinculado viaja hasta el título del evento
              (`"${etiqueta}: ${nombre}"`), así que la Agenda sigue
              mostrando a quién le toca esta actividad sin que la persona
              tenga que escribir nada.
            */}
            {contactPickerSupported && (
              <div>
                {prospecto ? (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-zinc-200
                               bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950/60"
                  >
                    <BookUser
                      size={15}
                      className="shrink-0 text-indigo-500 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                      {prospecto.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProspecto(null)}
                      aria-label="Quitar prospecto vinculado"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full
                                 text-zinc-400 transition-colors hover:bg-zinc-100
                                 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={linkProspect}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border
                               border-dashed border-zinc-300 py-2.5 text-xs font-semibold
                               text-zinc-500 transition-colors hover:border-indigo-400
                               hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400
                               dark:hover:border-indigo-500/60 dark:hover:text-indigo-400"
                  >
                    <BookUser size={14} aria-hidden="true" />
                    Vincular a un prospecto
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="entry-date">Fecha</label>
            <input
              id="entry-date"
              type="date"
              className={INPUT}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="entry-time">Hora</label>
            <input
              id="entry-time"
              type="time"
              className={INPUT}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Prioridad: última decisión antes de guardar */}
        <div>
          <span className={LABEL}>Prioridad del Evento</span>
          <div role="radiogroup" aria-label="Prioridad del evento" className="flex gap-2">
            {PRIORITIES.map(({ key, label, idle, active }) => {
              const isActive = priority === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setPriority(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all
                              active:scale-95 focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-indigo-500 ${isActive ? active : idle}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p role="alert" className="text-xs font-medium text-rose-500">{error}</p>}

        <button
          type="submit"
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                     text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Check size={16} />
          Guardar
        </button>
      </form>
    </BottomSheet>
  );
}
