import {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react';

/**
 * Referidos capturados en el candado del Plan de Optimización.
 *
 * Se guardan en el navegador, igual que el resto del diagnóstico, y nunca salen
 * de ahí. Antes vivían sólo en memoria, lo que rompía dos cosas: el aviso del
 * propio candado prometía por escrito que "estos contactos se guardan únicamente
 * en este navegador" —y no se guardaban en ninguna parte—, y el asesor perdía los
 * contactos y el desbloqueo con sólo recargar la página. Un candado que hay que
 * volver a abrir en cada recarga se convierte en un peaje, no en un intercambio.
 */
const STORAGE_KEY = 'df360:referrals:v1';

function loadPersisted() {
  if (typeof window === 'undefined') return { referrals: [], isUnlocked: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { referrals: [], isUnlocked: false };
    return {
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      isUnlocked: !!parsed.isUnlocked,
    };
  } catch {
    // Almacenamiento corrupto o bloqueado: se arranca en blanco.
    return { referrals: [], isUnlocked: false };
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

const ReferralContext = createContext(undefined);

export function ReferralProvider({ children }) {
  const persisted = loadPersisted();
  const [referrals, setReferrals] = useState(persisted.referrals);
  const [isUnlocked, setIsUnlocked] = useState(persisted.isUnlocked);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ referrals, isUnlocked }));
    } catch {
      // Sin almacenamiento —modo privado, permisos—, la sesión sigue funcionando.
    }
  }, [referrals, isUnlocked]);

  /**
   * Agrega un referido { name, phone }.
   * Si la lista alcanza 2 o más referidos, desbloquea automáticamente.
   */
  const addReferral = useCallback((referral) => {
    setReferrals((prev) => {
      const updated = [...prev, referral];
      if (updated.length >= 2) {
        setIsUnlocked(true);
      }
      return updated;
    });
  }, []);

  /**
   * Desbloquea sin capturar contactos, para quien prefiere no compartirlos.
   */
  const unlockDirectly = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  const value = {
    referrals,
    isUnlocked,
    addReferral,
    unlockDirectly,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (context === undefined) {
    throw new Error('useReferral debe usarse dentro de un ReferralProvider');
  }
  return context;
}
