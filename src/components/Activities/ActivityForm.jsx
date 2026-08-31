import { useState, useEffect } from 'react';
import { Check, Phone, MapPin, Video } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { PRIORITIES, DEFAULT_PRIORITY } from './priorities';
import { ACTIVITY_TYPE_OPTIONS, activityTypeLabel } from '../../lib/activityTypes';

/*
  Modalidad de la cita: sólo aplica a los tipos que de verdad se encuentran
  con el prospecto (`cita`, `cita_inicial`, `cita_propuesta`, `cita_cierre`)
  — una "Llamada" o un "Cobro" no tienen lugar ni modalidad que elegir.
  "Presencial" pide dirección; "Virtual" ya no pide ningún link: se asume
  Zoom/Meet a partir del enlace fijo que el asesor guardó en su perfil
  (`data/advisorProfile.js`), y si no lo guardó, el mensaje de confirmación
  se adapta solo (`lib/whatsappConfirm.js`) — pedir el link aquí, en cada
  cita, era justo la fricción que se quería evitar.
*/
const MEETING_TYPES = ['cita', 'cita_inicial', 'cita_propuesta', 'cita_cierre'];
const MODALITIES = [
  { value: 'presencial', label: 'Presencial', Icon: MapPin },
  { value: 'virtual', label: 'Virtual', Icon: Video },
];

/*
  Toda "Nueva Actividad" se guarda con prioridad máxima, sin preguntar: es
  lo que la propia persona eligió registrar en su agenda del embudo de
  ventas, así que su asistente debe tratarlo como lo más urgente del día,
  no como una tarea cualquiera. Mismo criterio ya aplicado a las tareas
  capturadas en el Onboarding (`continueTaskCapture`, `FirstLoginIntro.jsx`).
  El recordatorio sí conserva el selector de prioridad: es una nota
  personal ("no olvidar"), no un paso del embudo, y ahí sigue teniendo
  sentido elegir cuánto pesa.
*/
const ACTIVITY_PRIORITY = 'maxima';

/**
 * ¿El navegador soporta el selector nativo de contactos (Contact Picker
 * API)? Sólo Chrome/Edge en Android la implementan hoy — en cualquier otro
 * navegador el ícono del teléfono no abre nada especial, y el campo sigue
 * siendo un input de texto normal.
 */
function isContactPickerSupported() {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
    && typeof window !== 'undefined' && 'ContactsManager' in window;
}

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
// El catálogo y su traductor de etiquetas viven en `lib/activityTypes.js`
// (import de arriba): los comparten `prospectText.js` —para distinguir un
// rótulo de un nombre de persona— y `CallFeedbackModal.jsx`, que antes
// duplicaba a mano el valor y el rótulo de "Cita Inicial".

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
export default function ActivityForm({
  isOpen, onClose, type = 'actividad', onSave,
  /*
    Valores iniciales opcionales, sólo para quien abre este formulario ya
    sabiendo algo del prospecto —hoy, `CallFeedbackModal.jsx` al agendar
    una cita a partir de una llamada—: nunca cambian el comportamiento por
    omisión de "Nueva Actividad" desde el menú "Agregar", donde nadie los
    pasa y todo arranca vacío como siempre.
  */
  initialTipoActividad = null, initialProspectName = '', initialProspectPhone = '',
  /*
    Campos sueltos que el router de ventas (`resolvePipelineStage`,
    `store/pipelineStore.js`, vía `App.jsx`) resuelve junto con el tipo de
    actividad y que este formulario no pregunta —`followUpReason` (el
    motivo del Seguimiento) y `primaAnual` (la que validó "Cierre
    Exitoso")—: se escriben tal cual en el evento nuevo, sin mostrar
    ningún campo adicional en la interfaz.
  */
  initialExtraFields = null,
}) {
  const isReminder = type === 'recordatorio';

  // El recordatorio conserva el texto libre: "Llamar a Laura por su
  // póliza" es una nota personal para acordarse de algo, no un paso del
  // embudo de ventas — el catálogo cerrado sólo aplica a "Nueva Actividad".
  const [title, setTitle] = useState('');

  // Catálogo cerrado, exclusivo de "Nueva Actividad": arranca con la
  // primera opción ya marcada (mismo criterio que un `<select>` nativo,
  // nunca vacío) para que la persona no tenga que tocar nada si de verdad
  // va a registrar justo eso.
  const [tipoActividad, setTipoActividad] = useState(
    initialTipoActividad ?? ACTIVITY_TYPE_OPTIONS[0].value,
  );

  // Nombre y teléfono del prospecto, ambos de texto libre y opcionales:
  // reemplaza al selector nativo de contactos (Contact Picker), que en la
  // práctica sólo funciona en Chrome/Edge de Android — en cualquier otro
  // navegador (el de escritorio incluido) la persona se quedaba sin forma
  // de anotar un teléfono. Escribirlo a mano funciona siempre, en
  // cualquier dispositivo.
  const [prospectName, setProspectName] = useState(initialProspectName);
  const [prospectPhone, setProspectPhone] = useState(initialProspectPhone);

  // Sólo se lee/muestra cuando `tipoActividad` es uno de `MEETING_TYPES`.
  const [modality, setModality] = useState(MODALITIES[0].value);
  const [location, setLocation] = useState('');
  const isMeeting = MEETING_TYPES.includes(tipoActividad);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [error, setError] = useState('');

  const [contactPickerSupported] = useState(isContactPickerSupported);

  // Cada apertura empieza en limpio, con la fecha y hora actuales —salvo el
  // tipo y el prospecto, que respetan lo ya sabido si llegó como prop.
  useEffect(() => {
    if (!isOpen) return;
    const parts = todayParts();
    setTitle('');
    setTipoActividad(initialTipoActividad ?? ACTIVITY_TYPE_OPTIONS[0].value);
    setProspectName(initialProspectName);
    setProspectPhone(initialProspectPhone);
    setModality(MODALITIES[0].value);
    setLocation('');
    setDate(parts.date);
    setTime(parts.time);
    setPriority(DEFAULT_PRIORITY);
    setError('');
    // Sólo reacciona a `isOpen`: los valores iniciales se leen en el
    // instante de abrir, no deben reprogramar la limpieza cada vez que el
    // padre re-renderice con la misma prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * Abre el selector nativo de contactos del teléfono y llena nombre y
   * teléfono de una vez, sin que la persona tenga que teclearlos. Cancelar
   * el selector, o negar el permiso, lanza `AbortError`/`NotAllowedError`
   * — se ignora en silencio, igual que cancelar cualquier diálogo nativo
   * del sistema: no es un error de la app, es la persona decidiendo no
   * elegir a nadie por ahora.
   */
  const pickFromContacts = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!picked.length) return;
      if (picked[0].name?.[0]) setProspectName(picked[0].name[0]);
      if (picked[0].tel?.[0]) setProspectPhone(picked[0].tel[0]);
    } catch {
      // Selector cancelado o permiso negado: no hay nada que llenar.
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
      `tipo_actividad`—, pero ya no lo teclea la persona como título
      libre: se deriva de la opción elegida más el nombre escrito, si lo
      hay (mismo patrón que ya usa `FirstLoginIntro.jsx` para sus tareas:
      `"${etiqueta}: ${nombre}"`). `tipo_actividad` viaja aparte, como el
      valor estructurado y consistente que este cambio vino a garantizar.
    */
    const label = activityTypeLabel(tipoActividad);
    const cleanName = prospectName.trim();
    onSave?.({
      type,
      tipo_actividad: tipoActividad,
      title: cleanName ? `${label}: ${cleanName}` : label,
      telefono: prospectPhone.trim(),
      date: date || parts.date,
      time: time || parts.time,
      priority: ACTIVITY_PRIORITY,
      /*
        Sólo se guardan si el tipo elegido es de encuentro con el
        prospecto; para el resto (`llamada`, `cobro`...) no aplican y no
        se escriben, en vez de dejar campos vacíos sin sentido en esos
        eventos.
      */
      ...(isMeeting && {
        modality,
        // Sólo tiene sentido cuando es presencial: virtual ya no pide texto.
        location: modality === 'presencial' ? location.trim() : '',
      }),
      ...initialExtraFields,
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
              Catálogo cerrado de 8 opciones, como un `<select>` nativo y no
              como un bloque de ocho botones: reemplaza a "¿QUÉ VAS A
              HACER?" sin ocupar más espacio del que ya ocupaba ese campo —
              un `radiogroup` de ocho chips se veía pesado y desordenado
              para un solo dato que sólo admite un valor a la vez, que es
              justo para lo que existe el `<select>`.
            */}
            <div>
              <label className={LABEL} htmlFor="entry-tipo">Tipo de actividad</label>
              <select
                id="entry-tipo"
                className={INPUT}
                value={tipoActividad}
                onChange={(e) => setTipoActividad(e.target.value)}
              >
                {ACTIVITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/*
              Nombre y teléfono del prospecto: dos campos de texto libre y
              opcionales, en la misma fila que la fecha/hora de más abajo.
              Sustituyen al selector nativo de contactos —que sólo abre en
              Chrome/Edge de Android— por algo que funciona igual en
              cualquier navegador y dispositivo, sin depender de un permiso
              del sistema.
            */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="entry-prospect-name">
                  Nombre del prospecto
                </label>
                <input
                  id="entry-prospect-name"
                  className={INPUT}
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="Laura Gómez"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="entry-prospect-phone">Teléfono</label>
                <div
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200
                             bg-white pl-1.5 pr-3 transition-colors focus-within:border-indigo-500
                             focus-within:ring-2 focus-within:ring-indigo-500
                             dark:border-zinc-700 dark:bg-zinc-950/60"
                >
                  {/*
                    Fondo y borde propios, visibles todo el tiempo y no
                    sólo al pasar el cursor: un ícono suelto del mismo gris
                    que el resto del campo se lee como decoración, no como
                    algo tocable — nada en su apariencia en reposo avisaba
                    que hacía algo. Con la píldora de color siempre
                    encendida, el botón se anuncia solo, igual que ya hace
                    "Elegir desde mi agenda" en `FirstLoginIntro.jsx` (borde
                    y texto de color propio, no gris neutro).

                    Sólo se dibuja como botón donde de verdad puede abrir
                    la agenda del teléfono (Contact Picker): en cualquier
                    otro navegador el ícono vuelve a ser un adorno fijo del
                    campo, nunca una promesa que va a fallar. Elegir un
                    contacto llena nombre y teléfono de una vez, sin que la
                    persona tenga que escribir ninguno de los dos a mano.
                  */}
                  {contactPickerSupported ? (
                    <button
                      type="button"
                      onClick={pickFromContacts}
                      title="Elegir de mi agenda de contactos"
                      aria-label="Elegir de mi agenda de contactos"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg
                                 border border-indigo-200 bg-indigo-50 text-indigo-600
                                 transition-colors hover:border-indigo-300 hover:bg-indigo-100
                                 active:scale-95 dark:border-indigo-500/30 dark:bg-indigo-500/15
                                 dark:text-indigo-400 dark:hover:bg-indigo-500/25"
                    >
                      <Phone size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <Phone
                      size={14}
                      className="ml-1.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                      aria-hidden="true"
                    />
                  )}
                  <input
                    id="entry-prospect-phone"
                    value={prospectPhone}
                    onChange={(e) => setProspectPhone(e.target.value)}
                    placeholder="10 dígitos"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-zinc-900
                               placeholder:text-zinc-400 focus:outline-none
                               dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
                {contactPickerSupported && (
                  <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                    Toca el ícono para elegir desde tu agenda
                  </p>
                )}
              </div>
            </div>

            {/*
              Toggle de Modalidad: sólo para los tipos que se encuentran con
              el prospecto. Virtual ya no pide ningún input de texto —el
              link se resuelve solo, con el enlace fijo del perfil del
              asesor o con un mensaje que se adapta si no lo tiene guardado
              (ver `lib/whatsappConfirm.js`).
            */}
            {isMeeting && (
              <div>
                <label className={LABEL} htmlFor="entry-modality">Modalidad</label>
                <div
                  id="entry-modality"
                  role="radiogroup"
                  aria-label="Modalidad de la cita"
                  className="grid grid-cols-2 gap-2"
                >
                  {MODALITIES.map(({ value, label: modLabel, Icon }) => {
                    const isActive = modality === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setModality(value)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border
                                    px-3 py-2.5 text-sm font-semibold transition-all
                                    active:scale-95 ${isActive
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'}`}
                      >
                        <Icon size={14} aria-hidden="true" />
                        {modLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Sólo presencial pide dirección; virtual no pide nada. */}
                {modality === 'presencial' && (
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Dirección o punto de encuentro"
                    autoComplete="off"
                    aria-label="Dirección o punto de encuentro"
                    className={`${INPUT} mt-2`}
                  />
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

        {/*
          Prioridad: sólo se elige en el recordatorio ("no olvidar"), última
          decisión antes de guardar. Una "Nueva Actividad" ya no pregunta
          nada aquí — siempre se guarda con prioridad máxima
          (`ACTIVITY_PRIORITY`), sin ningún selector que mostrar.
        */}
        {isReminder && (
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
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold
                                transition-all active:scale-95 focus-visible:outline-none
                                focus-visible:ring-2 focus-visible:ring-indigo-500
                                ${isActive ? active : idle}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
