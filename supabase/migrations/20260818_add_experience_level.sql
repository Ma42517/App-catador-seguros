-- Etapa profesional elegida en el Paso 2 del Onboarding.
--
-- Guarda con qué tarjeta contestó la persona ('new_advisor',
-- 'new_professional' o 'established', ver src/lib/experienceLevels.js) — no
-- se usa para nada más que personalizar el mensaje de bienvenida en algún
-- momento futuro, pero cumple otro propósito hoy mismo: es la señal que
-- distingue un registro que nunca vio el Onboarding (columna vacía, le toca
-- el recorrido completo) de uno que ya lo pasó y sólo está esperando
-- aprobación (columna con valor, cae directo en la sala de espera).
--
-- Sin esta columna la app degrada con seguridad: `profilesRepo.js` lee con
-- `?? ''` y escribe con reintento silencioso si la columna no existe (mismo
-- patrón que ya usan `photo_focus`/`video_url`), así que instalar el
-- Onboarding no exige correr esta migración de inmediato — sólo hace que
-- la elección no se recuerde entre sesiones hasta que se corra.

alter table public.profiles
  add column if not exists experience_level text;

comment on column public.profiles.experience_level is
  'Etapa profesional elegida en el Onboarding: new_advisor | new_professional | '
  'established. Vacío = todavía no pasó por el Onboarding.';
