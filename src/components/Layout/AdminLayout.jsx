import { LayoutDashboard, FormInput, LogOut, ShieldCheck } from 'lucide-react';

/** Secciones navegables del área autenticada. */
export const SECTIONS = [
  { key: 'wizard', label: 'Wizard', Icon: FormInput },
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
];

/**
 * Chrome de navegación del área autenticada.
 * - Escritorio/tablet (md+): sidebar lateral fijo.
 * - Móvil: barra de navegación inferior (bottom tab bar).
 * Es puramente de presentación/navegación: no toca los contexts ni el motor.
 */
export default function AdminLayout({ section, onNavigate, onLogout, children }) {
  return (
    <div className="flex min-h-screen w-full max-w-full bg-slate-950">
      {/* Sidebar: sólo desde md hacia arriba */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-4">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30"
            aria-hidden="true"
          >
            <ShieldCheck size={17} className="text-white" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-white">PROSPECTA</p>
            <p className="truncate text-[10px] tracking-widest text-slate-500">360</p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1 p-3">
          {SECTIONS.map(({ key, label, Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido: deja espacio inferior en móvil para no quedar bajo la tab bar */}
      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

      {/* Bottom tab bar: sólo en móvil */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-800 bg-slate-900/90 backdrop-blur md:hidden"
      >
        {SECTIONS.map(({ key, label, Icon }) => {
          const active = section === key;
          return (
            <button
              key={key}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(key)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={19} />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onLogout}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold text-rose-400 transition-colors hover:text-rose-300"
        >
          <LogOut size={19} />
          Salir
        </button>
      </nav>
    </div>
  );
}
