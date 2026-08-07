import { useState } from 'react';
import { Lock, Unlock, UserPlus } from 'lucide-react';
import { useReferral } from '../../context/ReferralContext';
import { Card, Field, TextInput, Button } from '../ui';

const EMPTY = { name: '', phone: '' };

/**
 * Candado de referidos. Envuelve contenido de alto valor y lo libera
 * cuando el usuario comparte dos contactos.
 */
export default function ReferralGate({ children, title, description }) {
  const { isUnlocked, addReferral, unlockDirectly } = useReferral();
  const [rows, setRows] = useState([{ ...EMPTY }, { ...EMPTY }]);
  const [error, setError] = useState('');

  if (isUnlocked) return children;

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
    <Card className="border-blue-200 bg-gradient-to-b from-blue-50/60 to-white">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-100">
          <Lock size={22} className="text-blue-600" />
        </span>
        <h3 className="text-base font-bold leading-snug text-slate-900">
          {title || 'Desbloquea tu Plan de Optimización 360'}
        </h3>
        <p className="mx-auto mt-2 text-xs leading-relaxed text-slate-500">
          {description || 'Para liberar tu estrategia completa de optimización, comparte el contacto de 2 personas a quienes también les pueda servir este diagnóstico gratuito.'}
        </p>
      </div>


      <form onSubmit={submit} className="mx-auto mt-5 max-w-md space-y-4">
        {rows.map((row, i) => (
          <fieldset key={i} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
            <legend className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500">
              <UserPlus size={12} /> Contacto {i + 1}
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Field label="Nombre completo">
                <TextInput
                  value={row.name}
                  onChange={(v) => patch(i, 'name', v)}
                  placeholder="Ana López"
                />
              </Field>
              <Field label="WhatsApp">
                <TextInput
                  value={row.phone}
                  onChange={(v) => patch(i, 'phone', v)}
                  placeholder="55 1234 5678"
                  inputMode="tel"
                />
              </Field>
            </div>
          </fieldset>
        ))}

        {error && (
          <p role="alert" className="text-center text-[11px] font-medium text-red-600">{error}</p>
        )}

        <Button type="submit" icon={Unlock} full size="lg">
          Desbloquear mi Diagnóstico 360
        </Button>

        <button
          type="button"
          onClick={unlockDirectly}
          className="mx-auto block text-[11px] text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
        >
          Prefiero verlo sin compartir contactos
        </button>
      </form>
    </Card>
  );
}
