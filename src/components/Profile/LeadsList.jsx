import { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, Phone, Check, X } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { useSession } from '../../context/SessionContext';
import { readLeads, removeLead, capturedLabel, followUpLink } from '../../data/leads';
import { listMyLeads, deleteLead } from '../../data/leadsRepo';

/** Icono de WhatsApp: lucide no lo trae, así que va como trazo propio. */
function WhatsAppMark({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.55 0-3.07-.42-4.4-1.2l-.32-.19-3.26.86.87-3.18-.2-.33a8.09 8.09 0 0 1-1.24-4.32c0-4.47 3.64-8.11 8.11-8.11s8.11 3.64 8.11 8.11-3.64 8.11-8.11 8.11z" />
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.34-1.6-1.5-1.9-.15-.3-.01-.46.13-.61.16-.16.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.42s1.04 2.8 1.19 3c.15.2 2.05 3.13 4.96 4.27 2.42.95 2.9.76 3.42.71.52-.05 1.68-.68 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

/**
 * Fila de un prospecto.
 *
 * El borrado pide confirmación en dos toques, en la fila misma. Un prospecto
 * perdido no se recupera —vive sólo en este teléfono— y un toque accidental en
 * una lista que se recorre con el pulgar es demasiado fácil.
 */
function LeadRow({ lead, advisorName, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const fromLink = lead.storage === 'cloud';

  return (
    <li
      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100
                   text-sm font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
        aria-hidden="true"
      >
        {lead.name.trim().charAt(0).toUpperCase() || '?'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {lead.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {lead.whatsapp} · {capturedLabel(lead.capturedAt)}
          {/*
            Se distingue de dónde vino. No es un detalle técnico: quien llegó por
            el enlace no conoce al asesor en persona, y el primer mensaje se
            escribe distinto que a quien acaba de tener el teléfono en la mano.
          */}
          {fromLink && ' · por tu enlace'}
        </p>
      </div>

      {confirming ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => { onRemove(); setConfirming(false); }}
            aria-label={`Confirmar eliminar ${lead.name}`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500 text-white
                       transition-transform active:scale-90"
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            aria-label="Cancelar"
            className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-300
                       text-zinc-500 dark:border-zinc-700"
          >
            <X size={15} />
          </button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1">
          <a
            href={`tel:${lead.whatsapp.replace(/\D/g, '')}`}
            aria-label={`Llamar a ${lead.name}`}
            className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-300
                       text-zinc-500 transition-colors hover:bg-zinc-100 active:scale-90
                       dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Phone size={15} />
          </a>

          {/* Escribir es la acción principal: va en color y con el mensaje listo. */}
          <a
            href={followUpLink(lead, advisorName)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escribir a ${lead.name} por WhatsApp`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white
                       transition-transform hover:bg-emerald-400 active:scale-90"
          >
            <WhatsAppMark />
          </a>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Eliminar ${lead.name}`}
            className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400
                       transition-colors hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 size={15} />
          </button>
        </span>
      )}
    </li>
  );
}

/**
 * Prospectos capturados desde la tarjeta digital.
 *
 * Cierra el circuito: hasta ahora los datos entraban y no salían de ninguna
 * parte. Los más recientes van arriba, que es a quienes hay que escribir antes
 * de que se enfríen.
 */
export default function LeadsList({ isOpen, onClose }) {
  const { identity } = useSession();
  const [leads, setLeads] = useState([]);

  /**
   * Junta las dos procedencias de un prospecto.
   *
   * Hay dos porque hay dos formas de capturarlo: en mano, prestando el teléfono
   * —eso se guardó siempre en este dispositivo—, y a distancia, cuando alguien
   * abre el enlace público desde su propio móvil y no hay más sitio donde
   * dejarlo que la base.
   *
   * Se muestran en una sola lista ordenada por fecha, porque para decidir a
   * quién escribir primero da igual por dónde entró. Cada fila recuerda su
   * procedencia para que al borrarla se borre donde vive de verdad.
   */
  const load = useCallback(async () => {
    const local = readLeads(identity?.key).map((lead) => ({ ...lead, storage: 'local' }));

    const { data: remote } = await listMyLeads();
    const cloud = (remote ?? []).map((lead) => ({ ...lead, storage: 'cloud' }));

    setLeads([...cloud, ...local].sort((a, b) => b.capturedAt - a.capturedAt));
  }, [identity]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const remove = async (lead) => {
    if (lead.storage === 'cloud') {
      await deleteLead(lead.id);
    } else {
      removeLead(identity?.key, lead.id);
    }
    load();
  };

  // El aviso de abajo sólo aplica a los que viven en este teléfono.
  const localCount = leads.filter((lead) => lead.storage === 'local').length;

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Prospectos"
      label="Prospectos capturados"
    >
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
          <Users size={19} className="shrink-0 text-indigo-500" aria-hidden="true" />
          {leads.length} {leads.length === 1 ? 'prospecto' : 'prospectos'}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          Quien recibe tu tarjeta y pide tu contacto deja aquí su nombre y WhatsApp.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="py-10 text-center">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                       border-zinc-200 bg-zinc-50 text-zinc-400
                       dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
            aria-hidden="true"
          >
            <Users size={24} />
          </span>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Todavía no capturas prospectos
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">
            Comparte el enlace de tu tarjeta, o ábrela y gírala hacia la persona
            para que toque &quot;Add to Contact&quot;. Sus datos aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              advisorName={identity?.name}
              onRemove={() => remove(lead)}
            />
          ))}
        </ul>
      )}

      {/*
        Se dice dónde viven los datos. Es una lista que alguien puede llegar a
        tratar como su cartera de clientes, y perderla por limpiar el navegador
        sin haber sido advertido sería grave.
      */}
      {localCount > 0 && (
        <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3
                      text-[11px] leading-relaxed text-amber-700 dark:text-amber-300"
        >
          {localCount === 1
            ? 'Uno de estos prospectos se guardó'
            : `${localCount} de estos prospectos se guardaron`}
          {' '}
          sólo en este teléfono, porque se capturaron aquí mismo: no se sincronizan
          y se pierden si borras los datos del navegador. Los que llegan por tu
          enlace compartido sí quedan guardados en tu cuenta.
        </p>
      )}
    </FullScreenView>
  );
}
