import { useState, useEffect, useCallback } from 'react';
import {
  Users, Trash2, Phone, Check, X, IdCard, FileText, Mail, Scale, Ruler,
  Briefcase, AlertTriangle, Stethoscope, Cigarette, Ban, Ticket,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import BottomSheet from '../Layout/BottomSheet';
import { useSession } from '../../context/SessionContext';
import {
  readLeads, removeLead, capturedLabel, expedienteSummary,
} from '../../data/leads';
import { listMyLeads, deleteLead, leadSourceLabel } from '../../data/leadsRepo';
import DiagnosticInviteSheet from './DiagnosticInviteSheet';
import {
  RISK_FREQUENCY_OPTIONS, MEDICAL_CATEGORIES, HEALTH_STATUS_OPTIONS, HABIT_TYPES,
} from '../Prospecta/underwritingOptions';

/** Traduce un valor crudo del catálogo (p. ej. `'cardiaco'`) a su etiqueta legible. */
function labelFrom(options, value) {
  return options.find((option) => option.value === value)?.label || '—';
}

/** Sí/No/— para un booleano que también puede llegar como `null` (no contestado). */
function yesNo(value) {
  return value === true ? 'Sí' : value === false ? 'No' : '—';
}

/** Un dato del expediente, en la misma forma en las 3 secciones. */
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        {Icon && <Icon size={13} className="shrink-0" aria-hidden="true" />}
        {label}
      </span>
      <span className="max-w-[60%] text-right text-xs font-semibold text-slate-200">
        {value || '—'}
      </span>
    </div>
  );
}

/**
 * Detalle completo del Expediente Previo a Emisión.
 *
 * `LeadRow` sólo mostraba `expedienteSummary` —las 3 Súper Preguntas en
 * Sí/No, pensado para una fila de lista— y no había ninguna forma de ver
 * el resto de lo capturado (peso, ocupación, categoría médica, detalles de
 * riesgo...): quien preguntó por esto tenía razón, esos datos entraban al
 * expediente y no volvían a aparecer en ningún lado. Se abre en una hoja
 * propia, oscura como el propio `UnderwritingDrawer.jsx` de donde salió
 * este dato, y no reutiliza esa pantalla completa porque aquí es de sólo
 * lectura: no tiene sentido reabrir el formulario editable para ver un
 * expediente que ya se guardó.
 */
function ExpedienteDetailSheet({ lead, onClose }) {
  const data = lead?.expediente;

  return (
    /* Misma capa que la hoja del pase: sobre el `z-[70]` de esta pantalla. */
    <BottomSheet
      isOpen={Boolean(lead)}
      onClose={onClose}
      label="Expediente Previo a Emisión"
      zIndexClass="z-[80]"
    >
      {data && (
        <div className="dark">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            Expediente Previo a Emisión
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-white">{lead.name}</h2>

          <div className="mt-4 flex flex-col divide-y divide-slate-800 rounded-2xl border
                          border-slate-800 bg-slate-900 px-4"
          >
            <DetailRow icon={IdCard} label="INE" value={yesNo(data.hasIne)} />
            <DetailRow icon={FileText} label="RFC" value={yesNo(data.hasRfc)} />
            <DetailRow icon={Mail} label="Correo" value={yesNo(data.hasEmail)} />
            <DetailRow icon={Scale} label="Peso" value={data.weightKg ? `${data.weightKg} kg` : '—'} />
            <DetailRow icon={Ruler} label="Estatura" value={data.heightCm ? `${data.heightCm} cm` : '—'} />
            <DetailRow icon={Briefcase} label="Ocupación" value={data.occupation} />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide
                          text-slate-400"
            >
              <AlertTriangle size={13} className="shrink-0 text-amber-400" aria-hidden="true" />
              Riesgos y Deportes
            </p>
            <div className="mt-1 flex flex-col divide-y divide-slate-800">
              <DetailRow label="¿Practica actividad de riesgo?" value={yesNo(data.hasRisks)} />
              {data.hasRisks && (
                <>
                  <DetailRow label="Actividad" value={data.riskActivity} />
                  <DetailRow
                    label="Frecuencia / Nivel"
                    value={labelFrom(RISK_FREQUENCY_OPTIONS, data.riskFrequency)}
                  />
                  <DetailRow label="Detalles" value={data.riskDetails} />
                </>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide
                          text-slate-400"
            >
              <Stethoscope size={13} className="shrink-0 text-indigo-400" aria-hidden="true" />
              Médico
            </p>
            <div className="mt-1 flex flex-col divide-y divide-slate-800">
              <DetailRow label="¿Padecimiento diagnosticado?" value={yesNo(data.hasMedicalHistory)} />
              {data.hasMedicalHistory && (
                <>
                  <DetailRow
                    label="Categoría"
                    value={labelFrom(MEDICAL_CATEGORIES, data.medicalCategory)}
                  />
                  <DetailRow label="Fecha del diagnóstico" value={data.medicalDate} />
                  <DetailRow
                    label="Estado de salud"
                    value={labelFrom(HEALTH_STATUS_OPTIONS, data.medicalStatus)}
                  />
                </>
              )}
            </div>
          </div>

          <div className="mb-2 mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide
                          text-slate-400"
            >
              <Cigarette size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
              Hábitos / Familia
            </p>
            <div className="mt-1 flex flex-col divide-y divide-slate-800">
              <DetailRow label="¿Hábitos o antecedentes?" value={yesNo(data.hasHabits)} />
              {data.hasHabits && (
                <>
                  <DetailRow label="Tipo" value={labelFrom(HABIT_TYPES, data.habitType)} />
                  <DetailRow label="Frecuencia de consumo" value={data.habitFrequency} />
                  <DetailRow
                    icon={data.quitHabit ? Ban : undefined}
                    label="¿Abandonó el hábito?"
                    value={yesNo(data.quitHabit)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

/**
 * Fila de un prospecto.
 *
 * El borrado pide confirmación en dos toques, en la fila misma. Un prospecto
 * perdido no se recupera —vive sólo en este teléfono— y un toque accidental en
 * una lista que se recorre con el pulgar es demasiado fácil.
 */
function LeadRow({ lead, onRemove, onOpenDetail, onInvite }) {
  const [confirming, setConfirming] = useState(false);
  // Filas que vinieron del Expediente Previo a Emisión
  // (`UnderwritingDrawer.jsx`, "Guardar Expediente"): muestran el resumen
  // de las 3 Súper Preguntas en vez del origen de captura, que es lo que
  // de verdad interesa recordar de un prospecto ya con expediente.
  const isExpediente = lead.kind === 'underwriting';

  return (
    <li
      className="rounded-2xl border border-zinc-200 bg-white p-3
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100
                   text-sm font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
        aria-hidden="true"
      >
        {lead.name.trim().charAt(0).toUpperCase() || '?'}
      </span>

      {/*
        Sólo el expediente abre un detalle: el resumen del contacto normal
        ya se ve completo en la propia fila (nombre, WhatsApp, origen), no
        hay nada más que mostrar detrás. El expediente, en cambio, guarda
        una decena de campos que `expedienteSummary` recorta a 3 — antes no
        había ninguna forma de llegar al resto.
      */}
      {isExpediente ? (
        <button
          type="button"
          onClick={onOpenDetail}
          className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {lead.name}
          </p>
          <p className="truncate text-[11px] text-zinc-500">
            {expedienteSummary(lead.expediente)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
            Ver expediente completo
          </p>
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {lead.name}
          </p>
          <p className="truncate text-[11px] text-zinc-500">
            {lead.whatsapp} · {capturedLabel(lead.capturedAt)}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-indigo-500
                        dark:text-indigo-400"
          >
            {leadSourceLabel(lead)}
          </p>
        </div>
      )}

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
      </div>

      {lead.storage === 'cloud' && !isExpediente && !confirming && (
        <button
          type="button"
          onClick={onInvite}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white
                     shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500
                     active:scale-[0.99]"
        >
          <Ticket size={15} aria-hidden="true" />
          Enviar diagnóstico
        </button>
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
  // Expediente cuyo detalle completo se está mostrando en la hoja de abajo;
  // `null` cuando está cerrada.
  const [detailLead, setDetailLead] = useState(null);
  // El pase se prepara desde esta hoja; capturar un prospecto nunca la abre.
  const [inviteLead, setInviteLead] = useState(null);

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
          Aquí están nombre, WhatsApp y origen de cada persona. El envío nunca es automático.
        </p>
        {leads.some((lead) => lead.storage === 'cloud' && lead.kind !== 'underwriting') && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-500/20
                          bg-indigo-500/5 p-3 text-xs leading-relaxed text-indigo-700
                          dark:text-indigo-300"
          >
            <Ticket size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Para compartirlo: toca <strong>Enviar diagnóstico</strong> en la persona,
              crea su enlace, personaliza el mensaje y después abre WhatsApp.
            </p>
          </div>
        )}
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
              onRemove={() => remove(lead)}
              onOpenDetail={() => setDetailLead(lead)}
              onInvite={() => setInviteLead(lead)}
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

      <ExpedienteDetailSheet lead={detailLead} onClose={() => setDetailLead(null)} />
      <DiagnosticInviteSheet
        lead={inviteLead}
        advisorName={identity?.name}
        onClose={() => setInviteLead(null)}
      />
    </FullScreenView>
  );
}
