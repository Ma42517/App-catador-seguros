import { useState } from 'react';
import { Lock, Unlock, UserPlus } from 'lucide-react';
import { useReferral } from '../../context/ReferralContext';

export default function ReferralGate({ children }) {
  const { isUnlocked, addReferral } = useReferral();
  const [ref1, setRef1] = useState({ name: '', phone: '' });
  const [ref2, setRef2] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');

  if (isUnlocked) return <>{children}</>;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!ref1.name.trim() || !ref1.phone.trim()) {
      setError('Completa los datos del primer referido.');
      return;
    }
    if (!ref2.name.trim() || !ref2.phone.trim()) {
      setError('Completa los datos del segundo referido.');
      return;
    }
    addReferral({ name: ref1.name.trim(), phone: ref1.phone.trim() });
    addReferral({ name: ref2.name.trim(), phone: ref2.phone.trim() });
  };

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="blur-sm opacity-30 pointer-events-none select-none"
        aria-hidden="true">{children}</div>

      {/* Gate overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-4">
              <Lock className="text-blue-600" size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              Desbloquea tu Plan de Optimización 360
            </h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Ingresa el contacto de 2 amigos o familiares a quienes
              les pueda servir este diagnóstico gratuito.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Referido 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <UserPlus size={14} /><span>Referido 1</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" placeholder="Nombre Completo"
                  value={ref1.name} onChange={(e) => setRef1((r) => ({ ...r, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="WhatsApp"
                  value={ref1.phone} onChange={(e) => setRef1((r) => ({ ...r, phone: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            {/* Referido 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <UserPlus size={14} /><span>Referido 2</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" placeholder="Nombre Completo"
                  value={ref2.name} onChange={(e) => setRef2((r) => ({ ...r, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="WhatsApp"
                  value={ref2.phone} onChange={(e) => setRef2((r) => ({ ...r, phone: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
              <Unlock size={18} /> Desbloquear mi Diagnóstico 360
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
