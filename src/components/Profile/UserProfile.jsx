import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Phone, UserRound, IdCard, ChevronRight, Users } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import { readAdvisorProfile, saveAdvisorProfile, initialsFrom } from '../../data/advisorProfile';
import { readLeads } from '../../data/leads';

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

export default function UserProfile({ isOpen, onClose, username, onEditCard, onOpenLeads }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState('');
  const [leadCount, setLeadCount] = useState(0);

  // Cada apertura carga lo guardado, para editar en vez de volver a capturar.
  // El conteo se relee aquí y no con un temporizador: sólo cambia cuando alguien
  // deja sus datos, y al volver a esta pantalla ya está actualizado.
  useEffect(() => {
    if (!isOpen) return;
    const saved = readAdvisorProfile(username);
    setDisplayName(saved.displayName);
    setPhone(saved.phone);
    setLeadCount(readLeads(username).length);
    setToast('');
  }, [isOpen, username]);

  const clearToast = useCallback(() => setToast(''), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveAdvisorProfile(username, { displayName, phone });
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
