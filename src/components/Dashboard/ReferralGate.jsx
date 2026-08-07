import { useState } from 'react';
import { Lock, Unlock, User, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { useReferral } from '../../context/ReferralContext';
import { Field, TextInput, Button } from '../ui';

const EMPTY = { name: '', phone: '' };

/** Candado con resplandor dorado sobre halo índigo. */
function GlowingLock() {
  return (
    <div className="relative mx-auto mb-5 h-20 w-20">
      {/* Halos concéntricos */}
      <div
        className="animate-pulse-glow absolute inset-0 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgb(245 158 11 / 0.45), transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -inset-3 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgb(99 102 241 / 0.3), transparent 70%)' }}
        aria-hidden="true"
      />
      {/* Anillo con degradado dorado -> índigo */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-indigo-600 p-[2px] shadow-2xl">
        <div className="grid h-full w-full place-items-center rounded-full bg-slate-900">
          <Lock size={30} className="text-amber-300" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}

/** Indicador de avance de los dos contactos. */
function Progress({ filled }) {
  return (
    <div className="mx-auto mb-6 flex max-w-md items-center gap-3">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-500 transition-all duration-500"
          style={{
            width: `${(filled / 2) * 100}%`,
            boxShadow: filled > 0 ? '0 0 10px rgb(245 158 11 / 0.6)' : 'none',
          }}
        />
      </div>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {filled} de 2
      </span>
    </div>
  );
}


/**
 * Candado de referidos. Envuelve contenido de alto valor y lo libera
 * cuando el usuario comparte dos contactos.
 */
export default function ReferralGate({ children, title, description }) {
  const { isUnlocked, addReferral, unlockDirectly } = useReferral();
  const [rows, setRows] = useState([{ ...EMPTY }, { ...EMPTY }]);
  const [error, setError] = useState('');

  if (isUnlocked) return children;

  const filled = rows.filter((r) => r.name.trim() && r.phone.trim()).length;

  const patch = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const submit = (e) => {
    e.preventDefault();
    const clean = rows.map((r) => ({ name: r.name.trim(), phone: r.phone.trim() }));

    if (clean.some((r) => !r.name || !r.phone)) {
      setError('Completa el nombre y el teléfono de ambos contactos.');
      return;
    }
    if (clean.some((r) => r.phone.replace(/\D/g, '').length < 10)) {
      setError('Verifica que ambos teléfonos tengan 10 dígitos.');
      return;
    }

    setError('');
    clean.forEach(addReferral);
  };

  return (
    <div className="animate-rise relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-800/90 to-slate-900/90 p-5 shadow-2xl shadow-slate-950/60 backdrop-blur sm:p-8">
      {/* Iluminación superior */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[130%] -translate-x-1/2 blur-3xl"
        style={{ background: 'radial-gradient(ellipse at center, rgb(99 102 241 / 0.22), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative">
        <GlowingLock />

        <div className="mx-auto max-w-lg text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 ring-1 ring-amber-500/30">
            <Sparkles size={11} />
            Contenido premium
          </span>

          <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-slate-50 sm:text-xl">
            {title || 'Desbloquea tu Plan de Optimización 360'}
          </h3>
          <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-slate-400">
            {description || 'Para liberar tu estrategia completa de optimización, comparte el contacto de 2 personas a quienes también les pueda servir este diagnóstico gratuito.'}
          </p>
        </div>


        <form onSubmit={submit} className="mx-auto mt-7 max-w-md">
          <Progress filled={filled} />

          <div className="space-y-3">
            {rows.map((row, i) => {
              const complete = row.name.trim() && row.phone.trim();
              return (
                <fieldset
                  key={i}
                  className={`rounded-xl border bg-slate-900/60 p-3.5 transition-colors ${
                    complete ? 'border-emerald-500/40' : 'border-slate-700/60'
                  }`}
                >
                  <legend className="flex items-center gap-2 px-1.5 text-[10px] font-bold uppercase tracking-widest">
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full text-[9px] transition-colors ${
                        complete
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={complete ? 'text-emerald-300' : 'text-slate-500'}>
                      Contacto {i + 1}
                    </span>
                  </legend>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Field label="Nombre completo">
                      <TextInput
                        value={row.name}
                        onChange={(v) => patch(i, 'name', v)}
                        placeholder="Ana López"
                        icon={User}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="WhatsApp">
                      <TextInput
                        value={row.phone}
                        onChange={(v) => patch(i, 'phone', v)}
                        placeholder="55 1234 5678"
                        icon={Phone}
                        inputMode="tel"
                        autoComplete="off"
                      />
                    </Field>
                  </div>
                </fieldset>
              );
            })}
          </div>


          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-[11px] font-medium text-red-300 ring-1 ring-red-500/25"
            >
              {error}
            </p>
          )}

          <div className="mt-5">
            <Button type="submit" icon={Unlock} full size="lg" disabled={filled < 2}>
              Desbloquear mi Diagnóstico 360
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
            <p className="text-[10px] leading-relaxed text-slate-500">
              Estos contactos se guardan únicamente en este navegador, junto con el resto de tu
              información. No se envían a ningún servidor desde esta herramienta.
            </p>
          </div>

          <button
            type="button"
            onClick={unlockDirectly}
            className="mx-auto mt-4 block text-[11px] text-slate-500 underline-offset-2 transition-colors hover:text-slate-300 hover:underline"
          >
            Prefiero verlo sin compartir contactos
          </button>
        </form>
      </div>
    </div>
  );
}
