import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { recordPointsEarned } from '../data/walletRepo';

/** Meta oficial del Sistema de 20 Puntos. */
export const DAILY_POINTS_GOAL = 20;

/**
 * Diccionario cerrado de gamificación.
 *
 * No se exporta una operación `addPoints(number)`: todo premio debe declarar
 * qué conducta ocurrió. Así una pantalla nueva no puede inventar cantidades ni
 * volver a premiar descartes, reagendas o checks administrativos.
 */
export const GAMIFICATION_ACTIONS = Object.freeze({
  NUEVO_REFERIDO_AGREGADO: 'NUEVO_REFERIDO_AGREGADO',
  CONTACTO_EFECTIVO: 'CONTACTO_EFECTIVO',
  CITA_INICIAL_REALIZADA: 'CITA_INICIAL_REALIZADA',
  CITA_PROPUESTA_REALIZADA: 'CITA_PROPUESTA_REALIZADA',
  CITA_CIERRE: 'CITA_CIERRE',
  COBRO_REALIZADO: 'COBRO_REALIZADO',
  POLIZA_EMITIDA: 'POLIZA_EMITIDA',
});

export const POINTS_BY_ACTION = Object.freeze({
  [GAMIFICATION_ACTIONS.NUEVO_REFERIDO_AGREGADO]: 1,
  [GAMIFICATION_ACTIONS.CONTACTO_EFECTIVO]: 1,
  [GAMIFICATION_ACTIONS.CITA_INICIAL_REALIZADA]: 3,
  [GAMIFICATION_ACTIONS.CITA_PROPUESTA_REALIZADA]: 3,
  [GAMIFICATION_ACTIONS.CITA_CIERRE]: 3,
  [GAMIFICATION_ACTIONS.COBRO_REALIZADO]: 5,
  [GAMIFICATION_ACTIONS.POLIZA_EMITIDA]: 5,
});

const STORAGE_KEY = 'df360:gamification:v1';
const MAX_REFERRALS_PER_SESSION = 3;

/** Fecha local —no UTC— porque el objetivo cambia a medianoche del asesor. */
export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyBucket(date = localDateKey()) {
  return {
    puntosHoy: 0,
    lastResetDate: date,
    awardedKeys: {},
    referralSessions: {},
  };
}

function currentBucket(bucket, today = localDateKey()) {
  if (!bucket || bucket.lastResetDate !== today) return emptyBucket(today);
  return {
    puntosHoy: Number.isFinite(bucket.puntosHoy) && bucket.puntosHoy >= 0
      ? bucket.puntosHoy
      : 0,
    lastResetDate: today,
    awardedKeys: bucket.awardedKeys && typeof bucket.awardedKeys === 'object'
      ? bucket.awardedKeys
      : {},
    referralSessions: bucket.referralSessions && typeof bucket.referralSessions === 'object'
      ? bucket.referralSessions
      : {},
  };
}

/**
 * Motor único de gamificación diaria.
 *
 * `puntosHoy` y `lastResetDate` están en la raíz tal como los consume la UI.
 * `users` conserva un bucket por identidad para que dos asesores que usen el
 * mismo navegador no compartan puntos. Al activar una identidad, su bucket se
 * refleja en las variables raíz.
 *
 * La idempotencia tiene dos niveles:
 * - acciones de evento: `acción:eventId`, una vez por día;
 * - referidos: `sessionId:referralId`, máximo tres personas por sesión.
 */
export const useGamificationStore = create(
  persist(
    (set, get) => ({
      puntosHoy: 0,
      lastResetDate: localDateKey(),
      activeUserKey: '',
      users: {},

      activateUser: (userKey) => {
        const key = String(userKey ?? '').trim();
        const today = localDateKey();
        if (!key) {
          set({
            activeUserKey: '',
            puntosHoy: 0,
            lastResetDate: today,
          });
          return;
        }

        set((state) => {
          const bucket = currentBucket(state.users[key], today);
          return {
            activeUserKey: key,
            puntosHoy: bucket.puntosHoy,
            lastResetDate: bucket.lastResetDate,
            users: { ...state.users, [key]: bucket },
          };
        });
      },

      resetIfNeeded: () => {
        const state = get();
        const key = state.activeUserKey;
        const today = localDateKey();
        if (!key) {
          if (state.lastResetDate !== today || state.puntosHoy !== 0) {
            set({ puntosHoy: 0, lastResetDate: today });
          }
          return;
        }

        const bucket = currentBucket(state.users[key], today);
        if (bucket.lastResetDate === state.lastResetDate
            && bucket.puntosHoy === state.puntosHoy) return;

        set({
          puntosHoy: bucket.puntosHoy,
          lastResetDate: bucket.lastResetDate,
          users: { ...state.users, [key]: bucket },
        });
      },

      /**
       * @param {string} action Una clave de `GAMIFICATION_ACTIONS`.
       * @param {{userKey?: string, eventId?: string, sessionId?: string, referralId?: string}} context
       * @returns {{awarded: boolean, points: number, dailyTotal: number, reason?: string}}
       */
      awardPoints: (action, context = {}) => {
        const points = POINTS_BY_ACTION[action];
        const key = String(context.userKey ?? get().activeUserKey ?? '').trim();
        if (!key || !Number.isFinite(points)) {
          return { awarded: false, points: 0, dailyTotal: 0, reason: 'invalid_action' };
        }

        const today = localDateKey();
        let result = { awarded: false, points: 0, dailyTotal: 0, reason: 'duplicate' };

        set((state) => {
          const bucket = currentBucket(state.users[key], today);
          let nextBucket = bucket;

          if (action === GAMIFICATION_ACTIONS.NUEVO_REFERIDO_AGREGADO) {
            const sessionId = String(context.sessionId ?? '').trim();
            const referralId = String(context.referralId ?? '').trim();
            if (!sessionId || !referralId) {
              result = {
                awarded: false,
                points: 0,
                dailyTotal: bucket.puntosHoy,
                reason: 'missing_referral_context',
              };
              return state;
            }

            const awardedReferralIds = Array.isArray(bucket.referralSessions[sessionId])
              ? bucket.referralSessions[sessionId]
              : [];
            if (awardedReferralIds.includes(referralId)
                || awardedReferralIds.length >= MAX_REFERRALS_PER_SESSION) {
              result = {
                awarded: false,
                points: 0,
                dailyTotal: bucket.puntosHoy,
                reason: awardedReferralIds.length >= MAX_REFERRALS_PER_SESSION
                  ? 'session_limit'
                  : 'duplicate',
              };
              return state;
            }

            nextBucket = {
              ...bucket,
              puntosHoy: bucket.puntosHoy + points,
              referralSessions: {
                ...bucket.referralSessions,
                [sessionId]: [...awardedReferralIds, referralId],
              },
            };
            // Referencia estable para acuñar en el servidor sin duplicar: la
            // misma pareja sesión:referido no vuelve a sumar puntos ni monedas.
            result.reference = `${action}:${sessionId}:${referralId}`;
          } else {
            const eventId = String(context.eventId ?? '').trim();
            if (!eventId) {
              result = {
                awarded: false,
                points: 0,
                dailyTotal: bucket.puntosHoy,
                reason: 'missing_event_id',
              };
              return state;
            }

            const awardKey = `${action}:${eventId}`;
            if (bucket.awardedKeys[awardKey]) {
              result = {
                awarded: false,
                points: 0,
                dailyTotal: bucket.puntosHoy,
                reason: 'duplicate',
              };
              return state;
            }

            nextBucket = {
              ...bucket,
              puntosHoy: bucket.puntosHoy + points,
              awardedKeys: { ...bucket.awardedKeys, [awardKey]: true },
            };
            // Misma llave que la idempotencia local: `accion:eventId`.
            result.reference = awardKey;
          }

          result = {
            awarded: true,
            points,
            dailyTotal: nextBucket.puntosHoy,
            reference: result.reference,
          };

          const rootPatch = state.activeUserKey === key
            ? {
              puntosHoy: nextBucket.puntosHoy,
              lastResetDate: nextBucket.lastResetDate,
            }
            : {};

          return {
            ...rootPatch,
            users: { ...state.users, [key]: nextBucket },
          };
        });

        /*
          Reflejo al monedero permanente.

          El punto diario vive en el navegador y se reinicia cada mañana; el
          ranking y las monedas viven en Supabase y no. Se acuña sólo cuando el
          premio de verdad ocurrió (`result.awarded`), y con la misma referencia
          que ya garantiza que no se duplique en local: si el servidor recibe dos
          veces la misma, la segunda no suma nada. Es disparar y olvidar —un fallo
          de red no debe deshacer el punto del día ya otorgado—; la próxima acción
          o la recarga reconcilian el saldo leyendo `my_wallet_summary`.
        */
        if (result.awarded && result.reference) {
          recordPointsEarned({
            points: result.points,
            reason: action,
            reference: result.reference,
          }).catch(() => { /* la reconciliación al leer el resumen lo corrige */ });
        }

        return result;
      },

      /** Sólo para preview/admin: reinicia el día de una identidad. */
      resetUserToday: (userKey) => {
        const key = String(userKey ?? get().activeUserKey ?? '').trim();
        if (!key) return;
        const bucket = emptyBucket();
        set((state) => ({
          ...(state.activeUserKey === key
            ? { puntosHoy: 0, lastResetDate: bucket.lastResetDate }
            : {}),
          users: { ...state.users, [key]: bucket },
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        puntosHoy: state.puntosHoy,
        lastResetDate: state.lastResetDate,
        activeUserKey: state.activeUserKey,
        users: state.users,
      }),
      onRehydrateStorage: () => (state) => state?.resetIfNeeded(),
    },
  ),
);

/** Selector reactivo listo para usar en la UI de una identidad. */
export function useDailyPoints(userKey) {
  const activateUser = useGamificationStore((state) => state.activateUser);
  const activeUserKey = useGamificationStore((state) => state.activeUserKey);
  const puntosHoy = useGamificationStore((state) => state.puntosHoy);

  useEffect(() => {
    activateUser(userKey);
  }, [activateUser, userKey]);

  return activeUserKey === String(userKey ?? '').trim() ? puntosHoy : 0;
}

/** API imperativa para handlers de resolución fuera del render. */
export function awardGamification(action, context) {
  return useGamificationStore.getState().awardPoints(action, context);
}
