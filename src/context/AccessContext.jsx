import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';

/**
 * Acceso a la promotoría mediante códigos de invitación.
 *
 * Es un sistema aparte del login: la sesión identifica *quién* entró
 * (`admin`/`user`), y esto define *qué puede hacer dentro del Workplace*
 * (`advisor` lee, `promoter` publica).
 *
 * OJO: los códigos y la contraseña viven en el bundle del cliente, así que
 * separan capacidades pero no protegen datos. Para permisos reales de
 * publicación hace falta validarlos en un backend.
 */
const AccessContext = createContext(null);

export const ACCESS_ROLES = { ADVISOR: 'advisor', PROMOTER: 'promoter' };

/** Contraseña única de administración para los códigos con publicación. */
const PROMOTER_PASSWORD = 'Admin777*';

/**
 * Catálogo de códigos. Cada uno identifica a su promotoría, que es lo que se
 * muestra al quedar vinculado. `PROMO-ADMIN` y `PROMO-777` son equivalentes:
 * ambos se han usado como código de promotor y conviene que los dos funcionen.
 */
const CODES = {
  'ASESOR-2026': {
    role: ACCESS_ROLES.ADVISOR,
    requiresPassword: false,
    promoteria: 'Promotoría Central',
  },
  'PROMO-ADMIN': {
    role: ACCESS_ROLES.PROMOTER,
    requiresPassword: true,
    password: PROMOTER_PASSWORD,
    promoteria: 'Promotoría Central',
  },
  'PROMO-777': {
    role: ACCESS_ROLES.PROMOTER,
    requiresPassword: true,
    password: PROMOTER_PASSWORD,
    promoteria: 'Promotoría Central',
  },
};

const KEY = 'df360:access:v1';

/** Se normaliza para que el código funcione con espacios o en minúsculas. */
function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

function isValidRole(role) {
  return Object.values(ACCESS_ROLES).includes(role);
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const EMPTY_ACCESS = { role: '', code: '', promoteria: '' };

function readStored(username) {
  if (!username) return EMPTY_ACCESS;
  const entry = readAll()[username];
  return isValidRole(entry?.role)
    ? { role: entry.role, code: entry.code ?? '', promoteria: entry.promoteria ?? '' }
    : EMPTY_ACCESS;
}

function persist(username, value) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: value }));
  } catch {
    // Sin persistencia el vínculo dura sólo esta sesión.
  }
}

/**
 * Comprueba un código sin activarlo. Devuelve si es válido, qué rol otorga y
 * si hace falta contraseña, para que el formulario decida si expandirse.
 */
export function validateAccessCode(code) {
  const entry = CODES[normalizeCode(code)];
  if (!entry) return { valid: false, role: '', requiresPassword: false, promoteria: '' };
  return {
    valid: true,
    role: entry.role,
    requiresPassword: entry.requiresPassword,
    promoteria: entry.promoteria,
  };
}

/**
 * `forcedPromoter` lo activa quien ya es promotor en la tabla `profiles`.
 *
 * Sin esto habría dos verdades sobre el mismo permiso: el rol de la cuenta
 * diría que puede publicar y el muro seguiría pidiéndole el código de
 * invitación. El código sigue existiendo para quien no está en `profiles` como
 * promotor, que es su caso de uso original.
 */
export function AccessProvider({ username, forcedPromoter = false, children }) {
  const [access, setAccess] = useState(() => readStored(username));

  // Al cambiar de usuario se recarga su vínculo.
  useEffect(() => {
    setAccess(readStored(username));
  }, [username]);

  /** Activa el acceso de un código que no pide contraseña. */
  const linkAccess = useCallback((code) => {
    const result = validateAccessCode(code);
    if (!result.valid || result.requiresPassword) return result;
    const value = {
      role: result.role,
      code: normalizeCode(code),
      promoteria: result.promoteria,
    };
    persist(username, value);
    setAccess(value);
    return result;
  }, [username]);

  /**
   * Valida la contraseña de administrador y habilita la publicación.
   * Recibe el código para conservar cuál de los códigos de promotor se usó.
   */
  const verifyPromoterPassword = useCallback((password, code = 'PROMO-ADMIN') => {
    const normalized = normalizeCode(code);
    const entry = CODES[normalized];
    if (!entry || entry.role !== ACCESS_ROLES.PROMOTER) return false;
    if (password !== entry.password) return false;
    const value = { role: entry.role, code: normalized, promoteria: entry.promoteria };
    persist(username, value);
    setAccess(value);
    return true;
  }, [username]);

  const unlinkAccess = useCallback(() => {
    persist(username, EMPTY_ACCESS);
    setAccess(EMPTY_ACCESS);
  }, [username]);

  const value = useMemo(() => ({
    accessRole: forcedPromoter ? ACCESS_ROLES.PROMOTER : access.role,
    accessCode: access.code,
    promoteria: access.promoteria,
    isPromoter: forcedPromoter || access.role === ACCESS_ROLES.PROMOTER,
    isLinked: forcedPromoter || isValidRole(access.role),

    /*
      ¿El vínculo viene de un código guardado, o del rol de la cuenta?

      Hay que distinguirlo para poder desvincularse. `isLinked` mezcla las dos
      fuentes, así que para un promotor o un administrador valía `true` siempre:
      `unlinkAccess` borraba el código pero la pantalla seguía mostrándose
      vinculada, y el botón parecía no hacer nada. No había forma de salir.

      Esta bandera ignora el rol a propósito: dice si hay un código que se pueda
      soltar, que es justo lo que la barra necesita saber para ofrecerlo.
    */
    isLinkedByCode: isValidRole(access.role),
    validateAccessCode,
    linkAccess,
    verifyPromoterPassword,
    unlinkAccess,
  }), [access, forcedPromoter, linkAccess, verifyPromoterPassword, unlinkAccess]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess debe usarse dentro de <AccessProvider>');
  return ctx;
}
