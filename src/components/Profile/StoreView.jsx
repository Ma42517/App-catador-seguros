import { useEffect, useState } from 'react';
import {
  Coins, CreditCard, FileText, IdCard, Loader2,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { fetchStorePrice } from '../../data/walletRepo';
import { useWallet } from '../../data/useWallet';

/**
 * La tienda del asesor.
 *
 * No se compra desde aquí directamente: cada producto se adquiere en el flujo
 * donde se usa —el diagnóstico al preparar el pase de un prospecto, la tarjeta
 * al regalarla—. Esta pantalla es el catálogo: para qué sirven las monedas,
 * cuánto cuesta cada cosa y cuántas tienes. Concentrar el precio aquí evita que
 * el asesor descubra el costo sólo al momento de cobrar.
 */
function ProductCard({
  icon: Icon, title, description, price, available, where,
}) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800
                   dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/15
                         text-indigo-500 dark:text-indigo-300"
        >
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs
                              font-bold ${available
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
              : 'bg-zinc-500/15 text-zinc-500'}`}
            >
              <Coins size={12} />
              {price === null ? '—' : price}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
          <p className="mt-2 text-[11px] font-medium text-indigo-500 dark:text-indigo-400">
            {where}
          </p>
        </div>
      </div>
    </li>
  );
}

export default function StoreView({ isOpen, onClose }) {
  const { summary, loading } = useWallet();
  const [diagnosticPrice, setDiagnosticPrice] = useState(null);
  const [cardPrice, setCardPrice] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchStorePrice('diagnostic').then(setDiagnosticPrice);
    fetchStorePrice('referral_card').then(setCardPrice);
  }, [isOpen]);

  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Tienda" label="Tienda de monedas">
      <section className="mb-6 rounded-2xl border border-amber-500/25 bg-gradient-to-br
                          from-amber-500/10 to-transparent p-5"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest
                      text-amber-600 dark:text-amber-400"
        >
          <Coins size={13} /> Tu saldo
        </p>
        <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
          {loading
            ? <Loader2 size={22} className="animate-spin text-zinc-400" />
            : (summary?.coinsBalance ?? 0).toLocaleString('es-MX')}
          <span className="ml-2 text-sm font-medium text-zinc-500">monedas</span>
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Ganas 1 moneda por cada punto de tus actividades. Las monedas se gastan aquí;
          tus puntos del ranking no bajan al comprar.
        </p>
      </section>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
        <CreditCard size={16} className="text-indigo-500" aria-hidden="true" />
        Qué puedes comprar
      </h2>

      <ul className="flex flex-col gap-3">
        <ProductCard
          icon={FileText}
          title="Pase de diagnóstico"
          description="Un enlace personal de Radiografía Patrimonial para un prospecto,
                       protegido con código de acceso."
          price={diagnosticPrice}
          available
          where="Prospectos capturados → Enviar diagnóstico"
        />
        <ProductCard
          icon={IdCard}
          title="Tarjeta digital de regalo"
          description="Una tarjeta digital que el cliente personaliza con sus datos, a
                       cambio de referidos. Próximamente."
          price={cardPrice}
          available={false}
          where="Disponible pronto"
        />
      </ul>
    </FullScreenView>
  );
}
