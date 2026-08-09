import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Phone, UserRound } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import { readAdvisorProfile, saveAdvisorProfile, initialsFrom } from '../../data/advisorProfile';

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
export default function UserProfile({ isOpen, onClose, username }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState('');

  // Cada apertura carga lo guardado, para editar en vez de volver a capturar.
  useEffect(() => {
    if (!isOpen) return;
    const saved = readAdvisorProfile(username);
    setDisplayName(saved.displayName);
    setPhone(saved.phone);
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
