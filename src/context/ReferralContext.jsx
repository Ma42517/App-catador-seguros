import { createContext, useContext, useState, useCallback } from 'react';

// ─── Context ────────────────────────────────────────────────────────────────

const ReferralContext = createContext(undefined);

export function ReferralProvider({ children }) {
  const [referrals, setReferrals] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(false);

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
   * Desbloquea directamente (útil para pruebas).
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
