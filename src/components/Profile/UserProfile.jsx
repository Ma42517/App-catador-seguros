import { useState, useEffect, useCallback } from 'react';
import {
  BadgeCheck, Phone, UserRound, IdCard, ChevronRight, Users, Video, PauseCircle,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import TextScaleControl from '../ui/TextScaleControl';
import { readAdvisorProfile, saveAdvisorProfile, initialsFrom } from '../../data/advisorProfile';
import { readLeads } from '../../data/leads';
import { listMyLeads } from '../../data/leadsRepo';
import { readOrphans } from '../../data/orphanProspects';
import { readDiscardedProspects } from '../../data/prospectStatus';

/** Campo minimalista: sin caja, sólo un filo inferior que se enciende al enfocar. */
function MinimalField({ id, label, placeholder, value, onChange, icon: Icon, ...rest }) {
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
      >
        {label}
      </label>

      <div
        className="flex items-center gap-2 border-b border-zinc-300 pb-2 transition-colors
                   focus-within:border-indigo-500 dark:border-zinc-700"
      >
        {Icon && <Icon size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400
                     focus:outline-none dark:text-white dark:placeholder:text-zinc-600"
          {...rest}
        />
      </div>
    </div>
  );
}

/**
 * Perfil del asesor. Captura el nombre y el teléfono que después se
 * estamparán como marca de agua en los flyers compartidos.
 */
/** Fila de acceso del perfil, con distintivo opcional. */
function ProfileRow({ icon: Icon, title, subtitle, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4
                 text-left transition-colors hover:border-indigo-400
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100
                   text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        aria-hidden="true"
      >
        <Icon size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
          {title}
        </span>
        <span className="block text-[11px] text-zinc-500">{subtitle}</span>
      </span>

      {badge ? (
        <span
          className="shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold
                     text-indigo-600 dark:text-indigo-300"
        >
          {badge}
        </span>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
      )}
    </button>
  );
}

export default function UserProfile({
  isOpen, onClose, username, onEditCard, onOpenLeads, onOpenPaused,
}) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  // Enlace fijo de Zoom/Meet: lo usa `InitialMeetingCard.jsx` para las citas
  // virtuales, así el asesor no lo escribe en cada cita que agenda.
  const [zoomLink, setZoomLink] = useState('');
  const [toast, setToast] = useState('');
  const [leadCount, setLeadCount] = useState(0);
  // Prospectos que salieron del embudo sin cerrarse (citas archivadas por el
  // Reloj de Arena + descartados). Se cuentan juntos porque la pantalla que
  // abre esta fila también los muestra en una sola lista.
  const [pausedCount, setPausedCount] = useState(0);

  // Cada apertura carga lo guardado, para editar en vez de volver a capturar.
  // El conteo se relee aquí y no con un temporizador: sólo cambia cuando alguien
  // deja sus datos, y al volver a esta pantalla ya está actualizado.
  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const saved = readAdvisorProfile(username);
    const localLeadCount = readLeads(username).length;
    setDisplayName(saved.displayName);
    setPhone(saved.phone);
    setZoomLink(saved.zoomLink);
    setLeadCount(localLeadCount);
    listMyLeads().then(({ data }) => {
      if (active) setLeadCount(localLeadCount + (data?.length ?? 0));
    });
    setPausedCount(readOrphans(username).length + readDiscardedProspects(username).length);
    setToast('');
    return () => { active = false; };
  }, [isOpen, username]);

  const clearToast = useCallback(() => setToast(''), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveAdvisorProfile(username, { displayName, phone, zoomLink });
    setToast('Datos guardados. Tu marca de agua está lista.');
  };

  const initials = initialsFrom(displayName, username);

  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Mi Perfil">
      {/* Tarjeta de presentación: adelanto de cómo se verá la marca de agua */}
      <section
        className="mb-6 rounded-3xl border border-zinc-200 bg-gradient-to-br from-white
                   to-indigo-50 p-6 dark:border-zinc-800 dark:from-zinc-900
                   dark:to-indigo-950/30"
      >
        <div className="flex items-center gap-4">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br
                       from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-lg
                       shadow-indigo-600/30"
            aria-hidden="true"
          >
            {initials}
          </span>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-lg font-bold text-zinc-900 dark:text-white">
              {displayName || 'Tu nombre'}
              <BadgeCheck
                size={16}
                className="shrink-0 text-indigo-500 dark:text-indigo-400"
                aria-hidden="true"
              />
            </p>
            <p className="truncate text-sm text-zinc-500">
              {phone || 'Tu teléfono de contacto'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
          Así aparecerán tus datos en los flyers que compartas.
        </p>
      </section>

      {/*
        Mismo ajuste que en la pantalla de acceso, para quien lo quiera
        cambiar después de haber entrado: no todo el mundo lo necesita desde
        el primer momento, y aquí queda a la mano sin ocupar espacio en el
        login para quien nunca lo toca.
      */}
      <section className="mb-6 flex items-center justify-between gap-3 rounded-2xl
                          border border-zinc-200 bg-white p-4
                          dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            Tamaño de texto
          </p>
          <p className="text-[11px] text-zinc-500">
            Ajusta qué tan grande se ve la app
          </p>
        </div>
        <TextScaleControl />
      </section>

      {/*
        Accesos a la tarjeta y a los prospectos. Viven aquí y no en la pantalla de
        la tarjeta porque esa es para mostrarla: separar el editar del mostrar es
        lo que evita tener un formulario delante del prospecto.
      */}
      <div className="mb-6 flex flex-col gap-2">
        {onEditCard && (
          <ProfileRow
            icon={IdCard}
            title="Editar mi tarjeta digital"
            subtitle="Foto, título, cédula, especialidades y contacto"
            onClick={onEditCard}
          />
        )}

        {onOpenLeads && (
          <ProfileRow
            icon={Users}
            title="Prospectos capturados"
            subtitle={leadCount > 0
              ? `${leadCount} ${leadCount === 1 ? 'persona dejó' : 'personas dejaron'} sus datos`
              : 'Aún nadie ha dejado sus datos'}
            badge={leadCount > 0 ? leadCount : undefined}
            onClick={onOpenLeads}
          />
        )}

        {/*
          Los prospectos que salieron del embudo sin cerrarse. Vive junto a
          "Prospectos capturados" porque son las dos caras del mismo
          inventario de contactos: los que entraron y los que se quedaron a
          medias. Hasta que existió esta fila, las dos listas que alimenta
          se escribían sin que nadie pudiera leerlas.
        */}
        {onOpenPaused && (
          <ProfileRow
            icon={PauseCircle}
            title="Prospectos en pausa"
            subtitle={pausedCount > 0
              ? `${pausedCount} ${pausedCount === 1 ? 'salió' : 'salieron'} del embudo sin cerrarse`
              : 'Ninguno quedó fuera del embudo'}
            badge={pausedCount > 0 ? pausedCount : undefined}
            onClick={onOpenPaused}
          />
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <MinimalField
          id="profile-name"
          label="Nombre para mostrar en Flyers"
          placeholder="Ej. Juan Pérez"
          value={displayName}
          onChange={setDisplayName}
          icon={UserRound}
          autoComplete="name"
        />

        <MinimalField
          id="profile-phone"
          label="Teléfono de Contacto"
          placeholder="Ej. 55 1234 5678"
          value={phone}
          onChange={setPhone}
          icon={Phone}
          inputMode="tel"
          autoComplete="tel"
        />

        {/*
          Enlace fijo de tu sala de Zoom/Meet: lo usa `InitialMeetingCard.jsx`
          para las citas virtuales, sin que tengas que escribirlo cada vez
          que agendas una. Es opcional: si lo dejas vacío, el mensaje de
          WhatsApp de esa cita se adapta solo.
        */}
        <MinimalField
          id="profile-zoom-link"
          label="Enlace fijo de videollamada (Zoom/Meet)"
          placeholder="https://zoom.us/j/..."
          value={zoomLink}
          onChange={setZoomLink}
          icon={Video}
          type="url"
          autoComplete="off"
        />

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white
                     shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500
                     active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-500"
        >
          Guardar Información
        </button>
      </form>

      <Toast message={toast} onDone={clearToast} />
    </FullScreenView>
  );
}
