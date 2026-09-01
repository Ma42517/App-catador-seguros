import { useEffect, useState } from 'react';
import {
  Coins, FileText, IdCard, Loader2, Check, X,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import BottomSheet from '../Layout/BottomSheet';
import { fetchStorePacks, buyPack } from '../../data/walletRepo';
import { useWallet } from '../../data/useWallet';

const KIND_META = {
  diagnostic: {
    icon: FileText,
    accent: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30',
    chip: 'text-indigo-500 dark:text-indigo-300',
  },
  card: {
    icon: IdCard,
    accent: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    chip: 'text-amber-600 dark:text-amber-300',
  },
};

/** Carta de paquete, estilo Clash Royale: se toca y abre la confirmación. */
function PackCard({ pack, onPick }) {
  const meta = KIND_META[pack.kind] ?? KIND_META.diagnostic;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(pack)}
      className={`group relative flex flex-col items-center gap-3 rounded-3xl border
                  bg-gradient-to-b p-5 text-center transition-transform active:scale-95
                  ${meta.accent}`}
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/70 shadow-inner
                       dark:bg-black/30"
      >
        <Icon size={30} className={meta.chip} aria-hidden="true" />
      </span>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black
                       text-zinc-900 shadow dark:bg-zinc-100"
      >
        ×{pack.quantity}
      </span>
      <span className="text-sm font-bold leading-tight text-zinc-900 dark:text-white">
        {pack.title}
      </span>
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-sm
                       font-bold text-amber-600 dark:text-amber-300"
      >
        <Coins size={14} /> {pack.coins}
      </span>
    </button>
  );
}

export default function StoreView({ isOpen, onClose }) {
  const { summary, loading, reload } = useWallet();
  const [packs, setPacks] = useState([]);
  const [picked, setPicked] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchStorePacks().then(setPacks);
  }, [isOpen]);

  const balance = summary?.coinsBalance ?? 0;
  const canAfford = picked ? balance >= picked.coins : false;

  const confirm = async () => {
    if (!picked || status === 'buying') return;
    setStatus('buying');
    setError('');
    const { data } = await buyPack(picked.code);
    if (data?.outcome === 'BOUGHT') {
      setStatus('done');
      await reload();
    } else if (data?.outcome === 'INSUFFICIENT') {
      setStatus('idle');
      setError(`Te faltan monedas: cuesta ${data.price} y tienes ${data.coinsBalance}.`);
    } else {
      setStatus('idle');
      setError('No pudimos completar la compra. Inténtalo nuevamente.');
    }
  };

  const closeSheet = () => { setPicked(null); setStatus('idle'); setError(''); };

  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Tienda" label="Tienda de paquetes">
      {/* Saldo e inventario, arriba. */}
      <section className="mb-6 rounded-2xl border border-amber-500/25 bg-gradient-to-br
                          from-amber-500/10 to-transparent p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase
                          tracking-widest text-amber-600 dark:text-amber-400"
            >
              <Coins size={13} /> Saldo
            </p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
              {loading
                ? <Loader2 size={22} className="animate-spin text-zinc-400" />
                : balance.toLocaleString('es-MX')}
              <span className="ml-2 text-sm font-medium text-zinc-500">monedas</span>
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p className="flex items-center justify-end gap-1">
              <FileText size={12} className="text-indigo-500" />
              {summary?.invDiagnostics ?? 0} diagnósticos
            </p>
            <p className="mt-1 flex items-center justify-end gap-1">
              <IdCard size={12} className="text-amber-500" />
              {summary?.invCards ?? 0} tarjetas
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Ganas 1 moneda por cada punto de tus actividades. Compra paquetes y úsalos
          cuando quieras; tus puntos del ranking no bajan al comprar.
        </p>
      </section>

      {packs.length === 0 ? (
        <div className="grid place-items-center py-12">
          <Loader2 size={20} className="animate-spin text-zinc-400" aria-label="Cargando" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {packs.map((pack) => <PackCard key={pack.code} pack={pack} onPick={setPicked} />)}
        </div>
      )}

      <BottomSheet
        isOpen={Boolean(picked)}
        onClose={closeSheet}
        label="Confirmar compra"
        zIndexClass="z-[80]"
      >
        {picked && (
          <div className="text-center">
            {status === 'done' ? (
              <>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl
                                 bg-emerald-500/15 text-emerald-500"
                >
                  <Check size={26} />
                </span>
                <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
                  ¡Listo! Se añadió a tu inventario
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {picked.quantity} {picked.kind === 'card' ? 'tarjetas' : 'diagnósticos'} ·
                  saldo {balance.toLocaleString('es-MX')} monedas
                </p>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="mt-6 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold
                             text-white transition-colors hover:bg-indigo-500"
                >
                  Seguir en la tienda
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {picked.title}
                </h2>
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-zinc-500">
                  <Coins size={14} className="text-amber-500" />
                  {picked.coins} monedas · tienes {balance.toLocaleString('es-MX')}
                </p>

                {error && <p className="mt-3 text-xs text-rose-500" role="alert">{error}</p>}

                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border
                               border-zinc-300 py-3.5 text-sm font-semibold text-zinc-600
                               dark:border-zinc-700 dark:text-zinc-300"
                  >
                    <X size={16} /> Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={!canAfford || status === 'buying'}
                    className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl
                               bg-indigo-600 py-3.5 text-sm font-semibold text-white
                               transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed
                               disabled:opacity-50"
                  >
                    {status === 'buying'
                      ? <><Loader2 size={16} className="animate-spin" /> Comprando…</>
                      : canAfford
                        ? <><Coins size={16} /> Comprar por {picked.coins}</>
                        : 'Saldo insuficiente'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </FullScreenView>
  );
}
