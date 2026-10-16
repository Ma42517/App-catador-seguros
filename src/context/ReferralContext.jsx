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
/*
  La llave se SEGMENTA por usuario (`username` = id del asesor). Antes era una
  sola llave global, así que dos asesores en el mismo navegador compartían la
  lista de referidos y el "desbloqueado" del candado —una fuga de privacidad: el
  segundo veía los contactos del primero—. Con el id del asesor en la llave, cada
  cuenta tiene su propio almacén y nada se cruza. Sin usuario (preview sin id) se
  cae a `anon`, aislado también.
*/
function keyFor(username) {
  return `df360:referrals:v1:${username || 'anon'}`;
}

function loadPersisted(username) {
  if (typeof window === 'undefined') return { referrals: [], isUnlocked: false };
  try {
    const raw = window.localStorage.getItem(keyFor(username));
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

export function ReferralProvider({ children, username }) {
  const persisted = loadPersisted(username);
  const [referrals, setReferrals] = useState(persisted.referrals);
  const [isUnlocked, setIsUnlocked] = useState(persisted.isUnlocked);

  /*
    Si cambia el usuario (otra cuenta entra en el mismo navegador), se recarga el
    almacén de ESE usuario en vez de arrastrar el estado del anterior. Es la otra
    mitad del aislamiento: no basta con escribir en llaves distintas, también hay
    que dejar de mostrar en memoria lo del usuario que salió.
  */
  useEffect(() => {
    const fresh = loadPersisted(username);
    setReferrals(fresh.referrals);
    setIsUnlocked(fresh.isUnlocked);
  }, [username]);

  useEffect(() => {
    try {
      window.localStorage.setItem(keyFor(username), JSON.stringify({ referrals, isUnlocked }));
    } catch {
      // Sin almacenamiento —modo privado, permisos—, la sesión sigue funcionando.
    }
  }, [referrals, isUnlocked, username]);

  /**
   * Agrega un referido { name, phone }.
   *
   * Con UNO basta para desbloquear. Antes hacían falta dos, y quien sólo tenía
   * una persona a quien recomendar entregaba su contacto sin recibir nada: el
   * intercambio quedaba a medias y el candado seguía cerrado.
   */
  const addReferral = useCallback((referral) => {
    setReferrals((prev) => [...prev, referral]);
    setIsUnlocked(true);
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
