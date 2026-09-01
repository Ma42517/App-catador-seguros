import { useCallback, useEffect, useState } from 'react';
import { fetchWalletSummary } from './walletRepo';
import { useGamificationStore } from '../store/gamificationStore';

/**
 * Resumen del monedero, reconciliado con el servidor.
 *
 * Se relee cuando cambian los puntos del día: cada punto ganado dispara una
 * acuñación en Supabase, así que volver a pedir el resumen tras ese cambio
 * refleja el saldo nuevo sin necesidad de que el store local lleve la cuenta
 * de monedas —que sería una segunda fuente de verdad y podría desincronizarse—.
 */
export function useWallet() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const puntosHoy = useGamificationStore((state) => state.puntosHoy);

  const reload = useCallback(async () => {
    const { data } = await fetchWalletSummary();
    if (data?.outcome === 'READY') setSummary(data);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload, puntosHoy]);

  return { summary, loading, reload };
}
