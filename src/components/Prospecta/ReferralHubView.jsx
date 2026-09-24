import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IdCard, ClipboardList, Users, TicketCheck, Gift, ArrowRight, Loader2, UserRound, Phone, X,
  Plus, Sparkles, ChevronRight,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import BottomSheet from '../Layout/BottomSheet';
import { useSession } from '../../context/SessionContext';
import { useEvents } from '../../context/EventContext';
import { createLead, listMyLeads, REFERRAL_GIFT_SOURCE } from '../../data/leadsRepo';

/**
 * src/components/Prospecta/ReferralHubView.jsx
 *
 * Hub "Obtener Referidos": el espacio del asesor para convertir un regalo (una
 * Tarjeta Digital o un Pase de Diagnóstico) en prospectos. Sustituye al antiguo
 * candado "Pases VIP 360" como PANTALLA de entrada, pero NO cambia el flujo del
 * Diagnóstico: al elegir "Emitir Pase VIP" se entra al mismo candado/diagnóstico
 * de siempre (onOpenDiagnostico), así que el asesor sigue llegando a su
 * herramienta sin rodeos.
 *
 * ## Por qué reutiliza y no duplica
 * Los referidos se guardan en la MISMA tabla de prospectos (`leadsRepo.createLead`)
 * con la etiqueta `referido_regalo`, y el seguimiento se agenda en la MISMA agenda
 * (`useEvents.addEvent`). No hay store nuevo: el Hub es una vista que orquesta lo
 * que ya existe. Así "Ver Prospectos" y la métrica del mes leen la única fuente
 * real de contactos, sin listas paralelas que se desincronizan.
 *
 * ## El recordatorio (24 h)
 * Al obsequiar, se crea una actividad "Llamar a referido de [cliente]" para
 * MAÑANA. Se eligen 24 h y no 48 porque un referido se enfría rápido: el cliente
 * que lo recomendó habló de su asesor hoy, y esa recomendación pierde fuerza cada
 * día que pasa sin contacto. La app recuerda el seguimiento; el Hub sólo muestra
 * una píldora con cuántos quedan pendientes, sin convertirse en otra lista.
 */

/** Suma un día a hoy y lo devuelve como 'YYYY-MM-DD', igual que todayKey(). */
function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Título con el que se agenda el recordatorio; sirve también para contarlos. */
function reminderTitle(clientName) {
  return `Llamar a referido de ${clientName || 'un cliente'}`;
}

/**
 * Acción rápida de navegación. Ya no parece un botón secundario perdido: el
 * icono vive en su propio bloque, el texto queda alineado y la flecha refuerza
 * que abre otra vista. La animación ocurre al entrar y al tocar, no pulsa para
 * siempre —debe llamar la atención sin convertir el Hub en un anuncio.
 */
function QuickAction({ icon: Icon, label, onClick, delay = 0 }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border
                 border-neutral-800 bg-neutral-900/75 p-3 text-left shadow-lg shadow-black/20
                 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border
                       border-neutral-700 bg-black text-neutral-300 transition-colors
                       group-hover:text-white"
      >
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-neutral-100">
        {label}
      </span>
      <ChevronRight size={15} className="shrink-0 text-neutral-600 transition-transform
                                              group-hover:translate-x-0.5 group-hover:text-neutral-300" />
    </motion.button>
  );
}

/**
 * Carta grande de palanca de intercambio (Bento). Título, subtítulo y un botón
 * que abre el flujo correspondiente.
 */
function LeverCard({
  icon: Icon, title, subtitle, actionLabel, onAction, accent,
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <span
        className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${accent}`}
        aria-hidden="true"
      >
        <Icon size={20} />
      </span>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs font-light leading-relaxed text-neutral-400">{subtitle}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white
                   px-4 py-3 text-sm font-semibold text-black transition-colors
                   hover:bg-neutral-200 active:scale-[0.98]"
      >
        {actionLabel} <ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Hoja de captura de un referido: nombre, WhatsApp (+52 fijo) y el nombre del
 * cliente que hizo la recomendación (el "origen del regalo"). Sin textos de
 * relleno: sólo los tres campos que hacen falta.
 */
function CaptureSheet({ open, onClose, gift, onSaved }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName(''); setPhone(''); setReferredBy(''); setError(''); setSaving(false);
  };

  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const cleanName = name.trim();
    const digits = phone.replace(/\D/g, '');
    if (!cleanName) { setError('Escribe el nombre del referido.'); return; }
    if (digits.length !== 10) { setError('El WhatsApp es a 10 dígitos.'); return; }

    setSaving(true);
    setError('');
    const ok = await onSaved({
      name: cleanName,
      whatsapp: `+52${digits}`,
      referredByName: referredBy.trim(),
    });
    setSaving(false);
    if (ok) close();
    else setError('No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');
  };

  return (
    <BottomSheet isOpen={open} onClose={close} label="Capturar referido" zIndexClass="z-[80]">
      <div className="pb-2">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              {gift === 'quick'
                ? 'Registro rápido'
                : gift === 'card' ? 'Obsequiar Tarjeta' : 'Emitir Pase VIP'}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">Nuevo referido</h2>
          </div>
          <button
            type="button" onClick={close} aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full border border-neutral-800
                       text-neutral-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Nombre del referido
            </span>
            <div className="relative">
              <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej.: Laura Méndez"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-3 pl-9 pr-3
                           text-[16px] font-light text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              WhatsApp
            </span>
            <div className="flex items-center gap-2">
              <span className="grid h-[46px] shrink-0 place-items-center rounded-xl border
                               border-neutral-800 bg-neutral-900 px-3 text-sm text-neutral-400"
              >
                +52
              </span>
              <div className="relative flex-1">
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10 dígitos"
                  type="tel"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-3 pl-9 pr-3
                             text-[16px] font-light text-neutral-100 outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              ¿Quién lo recomendó?
            </span>
            <input
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="Nombre del cliente que regaló"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3
                         text-[16px] font-light text-neutral-100 outline-none focus:border-neutral-500"
            />
          </label>

          {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                       px-4 py-3.5 text-sm font-semibold text-white transition-colors
                       hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : 'Guardar referido'}
          </button>
          <p className="text-center text-[11px] font-light text-neutral-500">
            Queda en Prospectos y la app te recordará llamarle mañana.
          </p>
        </form>
      </div>
    </BottomSheet>
  );
}

export default function ReferralHubView({
  isOpen, onClose, onOpenProfile, onOpenLeads, onEmitPass,
}) {
  const { identity } = useSession();
  const username = identity?.key;
  const { events, addEvent } = useEvents();

  const [captureFor, setCaptureFor] = useState(null); // 'quick' | 'card' | 'diagnostic' | null
  const [monthCount, setMonthCount] = useState(0);
  const [flash, setFlash] = useState('');
  const [successName, setSuccessName] = useState('');

  // El aviso se retira solo: confirma el guardado sin quedarse ocupando el Hub.
  useEffect(() => {
    if (!successName) return undefined;
    const timer = window.setTimeout(() => setSuccessName(''), 3200);
    return () => window.clearTimeout(timer);
  }, [successName]);

  // Referidos de regalo capturados ESTE MES, leídos de la única tabla de leads.
  useEffect(() => {
    if (!isOpen) return undefined;
    let alive = true;
    (async () => {
      const { data } = await listMyLeads();
      if (!alive) return;
      const now = new Date();
      const count = (data ?? []).filter((l) => {
        if (l.source !== REFERRAL_GIFT_SOURCE) return false;
        const d = new Date(l.capturedAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
      setMonthCount(count);
    })();
    return () => { alive = false; };
  }, [isOpen, flash]);

  /*
    Pendientes de contacto: recordatorios de referido aún sin completar. Se
    derivan de la agenda (única fuente), reconociendo el título con el que se
    crean, para no llevar otra lista aparte.
  */
  const pending = useMemo(
    () => events.filter((e) => !e.completed && String(e.title ?? '').startsWith('Llamar a referido de')).length,
    [events],
  );

  const handleSaved = async ({ name, whatsapp, referredByName }) => {
    const { error } = await createLead(username, { name, whatsapp, referredByName }, REFERRAL_GIFT_SOURCE);
    if (error) return false;
    // Recordatorio automático para mañana: la app se encarga del seguimiento.
    addEvent({
      type: 'actividad',
      title: reminderTitle(referredByName),
      date: tomorrowKey(),
      time: '09:00',
      telefono: whatsapp,
      priority: 'maxima',
    });
    // Respuesta inmediata mientras la consulta mensual se refresca desde Supabase.
    setMonthCount((count) => count + 1);
    setSuccessName(name);
    setFlash(String(Date.now()));
    return true;
  };

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Obtener Referidos"
      label="Convierte un regalo en prospectos"
      backLabel="Cerrar"
    >
      <div className="animate-rise space-y-5">
        {/* Métrica del mes + acción principal. Registrar ya no queda escondido
            dentro de una carta: es la acción más frecuente del Hub. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/70"
        >
          <div className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Referidos obtenidos este mes
            </p>
            <div className="mt-1 flex items-end justify-between gap-4">
              <motion.p
                key={monthCount}
                initial={{ opacity: 0.35, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                className="origin-bottom-left text-4xl font-bold tracking-tight text-white"
              >
                {monthCount}
              </motion.p>
              {pending > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-1.5 rounded-full border
                             border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px]
                             font-medium text-amber-300"
                >
                  <TicketCheck size={12} /> {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
                </motion.span>
              )}
            </div>
          </div>

          <motion.button
            type="button"
            onClick={() => setCaptureFor('quick')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden
                       border-t border-indigo-400/25 bg-indigo-600 px-5 py-4 text-sm font-bold
                       text-white shadow-lg shadow-indigo-950/30 transition-colors
                       hover:bg-indigo-500"
          >
            {/* Pulso pequeño, no un neón continuo: señala dónde empezar y se
                detiene visualmente detrás del icono. */}
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white/15">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              <Plus size={18} className="relative" strokeWidth={2.5} aria-hidden="true" />
            </span>
            Registrar referido rápido
            <Sparkles size={15} className="text-indigo-100 transition-transform
                                               group-hover:rotate-6" aria-hidden="true" />
          </motion.button>
        </motion.div>

        {/* Confirmación breve: aparece junto al Hub, no dentro de otra lista. */}
        <AnimatePresence>
          {successName && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 rounded-xl border border-emerald-500/25
                         bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
              role="status"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15">
                <Users size={14} />
              </span>
              <span>
                <strong>{successName}</strong> quedó en Prospectos. Te recordaremos llamarle mañana.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accesos rápidos, ahora visibles como tarjetas de navegación. */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={IdCard}
            label="Mi Perfil / Mi Tarjeta"
            delay={0.08}
            onClick={() => { onClose(); onOpenProfile?.(); }}
          />
          <QuickAction
            icon={ClipboardList}
            label="Ver Prospectos"
            delay={0.14}
            onClick={() => { onClose(); onOpenLeads?.(); }}
          />
        </div>

        {/* Dos palancas de intercambio */}
        <div className="grid gap-3 sm:grid-cols-2">
          <LeverCard
            icon={Users}
            accent="bg-sky-500/15 text-sky-300"
            title="Tarjeta Digital Profesional"
            subtitle="Ideal para doctores, estilistas, arquitectos y comercios."
            actionLabel="Obsequiar Tarjeta"
            onAction={() => setCaptureFor('card')}
          />
          <LeverCard
            icon={Gift}
            accent="bg-indigo-500/15 text-indigo-300"
            title="Diagnóstico Patrimonial 360"
            subtitle="Pase VIP intransferible para análisis financiero familiar."
            actionLabel="Emitir Pase VIP"
            onAction={() => { onClose(); onEmitPass?.(); }}
          />
        </div>
      </div>

      <CaptureSheet
        open={captureFor !== null}
        gift={captureFor}
        onClose={() => setCaptureFor(null)}
        onSaved={handleSaved}
      />
    </FullScreenView>
  );
}
