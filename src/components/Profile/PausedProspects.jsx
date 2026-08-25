import { useState, useEffect, useCallback } from 'react';
import {
  PauseCircle, RotateCcw, Trash2, Check, X, Hourglass, Archive, Phone,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { useSession } from '../../context/SessionContext';
import { useEvents } from '../../context/EventContext';
import { readOrphans, removeOrphan } from '../../data/orphanProspects';
import { readDiscardedProspects, removeDiscardedProspect } from '../../data/prospectStatus';
import { PIPELINE_STAGES } from '../../store/pipelineStore';

/** Cuánto hace, en la forma que sirve para decidir a quién retomar antes. */
function agoLabel(timestamp) {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days === 0) {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours < 1) return 'Hace unos minutos';
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(timestamp).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Por qué quedó en pausa, en palabras. `reason` viene crudo del registro
 * (`'sin_sesion_30min'`, escrito por el Reloj de Arena de
 * `InitialMeetingCard.jsx`), así que se traduce aquí: la persona no tiene
 * por qué leer una clave interna en su propio perfil.
 */
function reasonLabel(record) {
  if (record.kind === 'discarded') return 'Lo marcaste como "no califica"';
  if (record.reason === 'sin_sesion_30min') {
    return 'Su Cita Inicial se archivó: pasaron 30 minutos sin iniciar la presentación';
  }
  return 'Quedó fuera del embudo';
}

/** Fecha y hora de mañana: un prospecto reactivado se retoma al día siguiente. */
function tomorrowParts() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: '09:00',
  };
}

/** Estado visual de cada procedencia. */
const KIND_STYLES = {
  orphan: {
    label: 'Cita archivada',
    Icon: Hourglass,
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  discarded: {
    label: 'Descartado',
    Icon: Archive,
    chip: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
};

/**
 * Fila de un prospecto en pausa. El borrado definitivo pide confirmación en
 * dos toques, igual que `LeadsList.jsx`: es la última copia de ese contacto
 * y un toque accidental en una lista que se recorre con el pulgar es
 * demasiado fácil.
 */
function PausedRow({ record, onReactivate, onForget }) {
  const [confirming, setConfirming] = useState(false);
  const style = KIND_STYLES[record.kind] ?? KIND_STYLES.orphan;
  const hasPhone = Boolean(String(record.phone ?? '').trim());

  return (
    <li
      className="rounded-2xl border border-zinc-200 bg-white p-3.5
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100
                     text-sm font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
          aria-hidden="true"
        >
          {String(record.name ?? '').trim().charAt(0).toUpperCase() || '?'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {record.name || 'Prospecto sin nombre'}
          </p>

          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5
                        text-[10px] font-semibold ${style.chip}`}
          >
            <style.Icon size={10} aria-hidden="true" />
            {style.label}
          </span>

          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            {reasonLabel(record)}
          </p>

          {/*
            El teléfono es el dato que decide si se puede retomar de verdad:
            un prospecto archivado sin número no se puede contactar, y
            conviene verlo antes de reactivarlo para nada.
          */}
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Phone size={10} className="shrink-0" aria-hidden="true" />
            {hasPhone ? record.phone : 'Sin teléfono registrado'}
            <span aria-hidden="true">·</span>
            {agoLabel(record.pausedAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => { onForget(); setConfirming(false); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500
                         px-3 py-2 text-xs font-semibold text-white transition-transform
                         active:scale-95"
            >
              <Check size={13} aria-hidden="true" />
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Cancelar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border
                         border-zinc-300 text-zinc-500 dark:border-zinc-700"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onReactivate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600
                         px-3 py-2 text-xs font-semibold text-white transition-colors
                         hover:bg-indigo-500 active:scale-95"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reactivar como Seguimiento
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Olvidar a ${record.name || 'este prospecto'}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-zinc-400
                         transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * src/components/Profile/PausedProspects.jsx
 *
 * "Prospectos en pausa": los que salieron del embudo sin cerrarse.
 *
 * Junta las dos listas que hasta ahora se escribían y NADIE leía —eran dos
 * agujeros negros—:
 *
 *  - **Huérfanos** (`data/orphanProspects.js`): su Cita Inicial se archivó
 *    sola al pasar los 30 minutos de gracia sin iniciar la presentación (el
 *    "Reloj de Arena" de `InitialMeetingCard.jsx`). `addOrphanProspect` se
 *    llamaba, pero `readOrphans` no tenía ni un consumidor: el prospecto se
 *    guardaba y desaparecía para siempre.
 *  - **Descartados** (`data/prospectStatus.js`): los "No califica" / "No le
 *    interesó" de los routers de venta. Igual, `readDiscardedProspects`
 *    nunca se llamaba desde ninguna pantalla, así que un descarte por
 *    error no tenía marcha atrás.
 *
 * Se muestran en una sola lista ordenada por fecha porque para decidir a
 * quién retomar da igual por dónde salió; cada fila recuerda su procedencia
 * (`kind`) para pintar su estado y para borrarse del almacén correcto.
 *
 * "Reactivar" crea un Seguimiento real en la agenda —no una Cita Inicial—
 * a propósito: alguien que se archivó o se descartó hace semanas no vuelve
 * directo a una cita agendada, primero hay que volver a contactarlo, y el
 * Seguimiento es exactamente el puente que el embudo tiene para eso
 * (`FollowUpCard.jsx`, con su botón "Retomar" para saltar de ahí a
 * cualquier etapa).
 */
export default function PausedProspects({ isOpen, onClose }) {
  const { identity } = useSession();
  const { addEvent } = useEvents();
  const [records, setRecords] = useState([]);

  const username = identity?.key;

  /*
    Se normalizan las dos procedencias a la misma forma (`kind`, `pausedAt`)
    para poder ordenarlas juntas: cada almacén usa su propio nombre de
    marca de tiempo (`archivedAt` vs `discardedAt`), y mezclarlas sin
    unificar dejaría la mitad de la lista sin fecha.
  */
  const load = useCallback(() => {
    const orphans = readOrphans(username).map((entry) => ({
      ...entry, kind: 'orphan', pausedAt: entry.archivedAt,
    }));
    const discarded = readDiscardedProspects(username).map((entry) => ({
      ...entry, kind: 'discarded', pausedAt: entry.discardedAt,
    }));
    setRecords([...orphans, ...discarded].sort((a, b) => b.pausedAt - a.pausedAt));
  }, [username]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const forget = (record) => {
    if (record.kind === 'discarded') removeDiscardedProspect(username, record.id);
    else removeOrphan(username, record.id);
    load();
  };

  const reactivate = (record) => {
    const parts = tomorrowParts();
    addEvent({
      type: 'actividad',
      tipo_actividad: PIPELINE_STAGES.SEGUIMIENTO,
      title: `Seguimiento: ${record.name || 'Prospecto'}`,
      telefono: record.phone ?? '',
      date: parts.date,
      time: parts.time,
      priority: 'maxima',
      followUpReason: record.kind === 'discarded'
        ? 'Reactivado: lo habías descartado'
        : 'Reactivado: su Cita Inicial se había archivado',
      ...(record.primaAnual && { primaAnual: record.primaAnual }),
    });
    // Sale de la pausa: ya volvió al embudo como actividad real, y dejarlo
    // en las dos listas lo mostraría a la vez como activo y como archivado.
    forget(record);
  };

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="En pausa"
      label="Prospectos en pausa"
    >
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
          <PauseCircle size={19} className="shrink-0 text-indigo-500" aria-hidden="true" />
          {records.length} {records.length === 1 ? 'prospecto' : 'prospectos'}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Salieron del embudo sin cerrarse: citas que se archivaron solas y prospectos
          que descartaste. Ninguno está perdido, puedes reactivarlos.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="py-10 text-center">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                       border-zinc-200 bg-zinc-50 text-zinc-400
                       dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
            aria-hidden="true"
          >
            <PauseCircle size={24} />
          </span>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            No tienes prospectos en pausa
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">
            Aquí aparecerán las Citas Iniciales que se archiven por no iniciarse a tiempo
            y los prospectos que marques como &quot;no califica&quot;.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {records.map((record) => (
            <PausedRow
              key={`${record.kind}-${record.id}`}
              record={record}
              onReactivate={() => reactivate(record)}
              onForget={() => forget(record)}
            />
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3
                    text-[11px] leading-relaxed text-amber-700 dark:text-amber-300"
      >
        Esta lista vive sólo en este dispositivo: no se sincroniza y se pierde si borras
        los datos del navegador.
      </p>
    </FullScreenView>
  );
}
