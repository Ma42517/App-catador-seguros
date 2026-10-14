import { useState } from 'react';
import { RefreshCw, LogOut, Loader2, Check } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { readAppTheme, themeFor } from '../../lib/appTheme';
import ExpandiaMark from './ExpandiaMark';

/**
 * Sala de espera: la cuenta existe pero todavía no se ha activado el acceso.
 *
 * Es una pantalla completa sin barra de navegación ni acceso a nada más. Que no
 * haya nada que tocar es intencional: si asomara aunque sea el menú, se leería
 * como que el acceso está a medias.
 *
 * El botón de revisar existe para no obligar a recargar. Una persona que acaba
 * de pedir acceso va a querer comprobarlo en cuanto le digan que ya está, y
 * recargar la página no es un gesto evidente en un celular.
 *
 * Respeta el tema elegido en la bienvenida (negro/blanco/crema) y usa un tono
 * cálido —"ya casi estás dentro"— en vez del trámite frío de antes.
 */
export default function PendingApproval() {
  const { identity, signOut, refreshRole } = useSession();
  const [isChecking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');

  const t = themeFor(readAppTheme());
  const isDark = t.value === 'dark';
  const bg = t.bgStyle ? '' : t.bg;

  const check = async () => {
    setChecking(true);
    const { changed } = await refreshRole();
    setChecking(false);

    // Si cambió, la app entera se vuelve a evaluar y esta pantalla desaparece;
    // sólo hay que dar señal cuando sigue igual.
    if (!changed) {
      setCheckedAt(new Date().toLocaleTimeString('es-MX', { hour12: false }));
    }
  };

  // Panel y campos tematizados, igual que el login.
  const panelClass = `rounded-3xl border p-7 shadow-xl backdrop-blur-md ${t.panel}`;

  return (
    <div
      className={`relative flex min-h-screen w-full max-w-full items-center justify-center
                  overflow-hidden px-4 py-10 ${bg}`}
      style={t.bgStyle}
    >
      {/* Resplandor cálido con el acento del tema, en vez del grid corporativo. */}
      <div
        className="pointer-events-none absolute left-1/2 top-20 h-64 w-80 -translate-x-1/2
                   rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${t.accent}33, transparent 70%)`,
          opacity: isDark ? 1 : 0.4,
        }}
        aria-hidden="true"
      />

      <div className="animate-rise relative w-full max-w-sm text-center">
        <div className={panelClass} style={t.panelStyle}>
          {/* El logo de la marca da identidad y continuidad con el resto del acceso. */}
          <div className="mb-6 flex justify-center">
            <ExpandiaMark theme={t.value} size="text-4xl" />
          </div>

          <h1 className={`text-2xl font-bold ${t.text}`}>
            ¡Ya casi estás dentro!
          </h1>

          <p className={`mt-3 text-sm leading-relaxed ${t.muted}`}>
            Estamos preparando todo para ti. Tu cuenta se activará muy pronto.
          </p>

          {/* Con qué cuenta entró: evita la confusión de haber usado otro correo. */}
          {identity?.email && (
            <div
              className={`mt-5 flex items-center gap-3 rounded-2xl border p-3 text-left ${t.inputBg}`}
              style={t.inputStyle}
            >
              {identity.avatarUrl ? (
                <img
                  src={identity.avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${t.accent}26`, color: t.accent }}
                  aria-hidden="true"
                >
                  {(identity.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-semibold ${t.text}`}>
                  {identity.name}
                </span>
                <span className={`block truncate text-[11px] ${t.faint}`}>
                  {identity.email}
                </span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={check}
            disabled={isChecking}
            style={{ backgroundColor: t.accent }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-4
                       text-base font-bold text-[#0B1A30] shadow-lg transition-all
                       hover:brightness-105 active:scale-[0.98] disabled:cursor-wait
                       disabled:opacity-70"
          >
            {isChecking
              ? <Loader2 size={18} className="animate-spin" />
              : <RefreshCw size={18} />}
            {isChecking ? 'Revisando...' : 'Ya me dieron acceso'}
          </button>

          {checkedAt && (
            <p
              role="status"
              className={`mt-2.5 flex items-center justify-center gap-1.5 text-[11px] ${t.faint}`}
            >
              <Check size={12} />
              Revisado a las {checkedAt}. Tu acceso sigue en espera.
            </p>
          )}

          <button
            type="button"
            onClick={signOut}
            className={`mx-auto mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs
                        font-semibold transition-colors hover:text-rose-400 ${t.muted}`}
          >
            <LogOut size={13} />
            Usar otra cuenta
          </button>
        </div>

        <p className={`mt-4 text-[11px] leading-relaxed ${t.faint}`}>
          ¿Llevas rato esperando? Escríbenos y lo revisamos.
        </p>
      </div>
    </div>
  );
}
