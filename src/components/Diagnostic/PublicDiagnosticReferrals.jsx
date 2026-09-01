import { useState } from 'react';
import { CheckCircle2, Plus, Send, Trash2, UserPlus } from 'lucide-react';
import { capturePublicDiagnosticReferrals } from '../../data/diagnosticsRepo';

const EMPTY = { name: '', whatsapp: '' };
const FIELD = 'w-full rounded-xl border border-neutral-800 bg-black px-3 py-3 text-sm '
  + 'font-light text-neutral-100 outline-none placeholder:text-neutral-700 '
  + 'focus:border-neutral-500';

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Captura opcional: guarda contactos para el asesor, pero jamás abre WhatsApp. */
export default function PublicDiagnosticReferrals({ diagnosticId, deviceSecret }) {
  const [rows, setRows] = useState([{ ...EMPTY }]);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');

  const patch = (index, field, value) => {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (phase === 'submitting') return;
    // Una persona es suficiente. Las filas vacías que se agregaron y no se
    // llenaron simplemente se descartan, en vez de bloquear el envío.
    const clean = rows
      .map((row) => ({ name: row.name.trim(), whatsapp: row.whatsapp.trim() }))
      .filter((row) => row.name || row.whatsapp);

    if (clean.length < 1) {
      setError('Escribe el nombre y el WhatsApp de al menos una persona.');
      return;
    }
    if (clean.some((row) => row.name.length < 2 || digits(row.whatsapp).length < 10)) {
      setError('Revisa que cada persona tenga nombre y un WhatsApp de 10 dígitos.');
      return;
    }

    setPhase('submitting');
    setError('');
    const { data, error: requestError } = await capturePublicDiagnosticReferrals({
      diagnosticId,
      deviceSecret,
      referrals: clean,
    });
    if (requestError || data?.outcome !== 'CAPTURED') {
      setPhase('idle');
      setError('No pudimos guardar los contactos. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }
    setPhase('success');
  };

  if (phase === 'success') {
    return (
      <section className="mb-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <h2 className="text-sm font-medium text-neutral-100">Contactos guardados</h2>
            <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
              Tu asesor los verá en Prospectos capturados. No enviamos ningún mensaje;
              él decidirá cuándo preparar y compartir el pase personal de cada uno.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-7 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border
                         border-neutral-800 bg-black text-neutral-400"
        >
          <UserPlus size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-600">
            Comparte claridad
          </p>
          <h2 className="mt-1 text-lg font-light text-white">
            Regala una Radiografía Patrimonial
          </h2>
          <p className="mt-2 text-xs font-light leading-relaxed text-neutral-500">
            Con una persona es suficiente; puedes agregar hasta tres si quieres. Sólo
            guardaremos sus datos para tu asesor; no se les enviará ningún mensaje ahora.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {rows.map((row, index) => (
          <fieldset key={index} className="rounded-xl border border-neutral-900 bg-black p-3">
            <legend className="px-1 text-[10px] uppercase tracking-widest text-neutral-700">
              Persona {index + 1}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={row.name}
                onChange={(event) => patch(index, 'name', event.target.value)}
                placeholder="Nombre completo"
                autoComplete="off"
                className={FIELD}
                aria-label={`Nombre de la persona ${index + 1}`}
              />
              <div className="flex gap-2">
                <input
                  value={row.whatsapp}
                  onChange={(event) => patch(index, 'whatsapp', event.target.value)}
                  placeholder="WhatsApp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  className={FIELD}
                  aria-label={`WhatsApp de la persona ${index + 1}`}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                    className="grid w-11 shrink-0 place-items-center rounded-xl border
                               border-neutral-800 text-neutral-600 hover:text-rose-400"
                    aria-label={`Quitar persona ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </fieldset>
        ))}

        {rows.length < 3 && (
          <button
            type="button"
            onClick={() => setRows((current) => [...current, { ...EMPTY }])}
            className="flex items-center gap-2 text-xs font-light text-neutral-500
                       hover:text-neutral-300"
          >
            <Plus size={14} /> Agregar otra persona
          </button>
        )}

        {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={phase === 'submitting'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-white
                     disabled:cursor-wait disabled:opacity-50"
        >
          <Send size={15} />
          {phase === 'submitting' ? 'Guardando…' : 'Guardar contactos para mi asesor'}
        </button>
      </form>
    </section>
  );
}
