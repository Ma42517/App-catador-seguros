-- Radiografía completa del Onboarding (pasos 3 a 8: fortaleza, inquietud,
-- mercado, disponibilidad, horario operativo y motor) — ver
-- src/lib/advisorOnboarding.js.
--
-- Se guarda como un solo objeto JSONB y no como columnas sueltas porque es
-- un único cuestionario que se contesta de una vez y se lee de una vez: no
-- hay ningún caso hoy en que la app necesite, por ejemplo, el "mercado" sin
-- el resto de las respuestas. El día que el algoritmo de tareas diarias
-- necesite filtrar o indexar por un campo específico (p. ej. calibrar la
-- dosis de prospección según `mercado`), se puede extraer esa clave a una
-- columna propia sin perder el resto del cuestionario.
--
-- Sin esta columna la app degrada con seguridad: `profilesRepo.js` lee con
-- `?? null` y escribe con reintento silencioso si la columna no existe
-- (mismo patrón que `experience_level`/`photo_focus`/`video_url`), así que
-- instalar el Onboarding de 8 pasos no exige correr esta migración de
-- inmediato — sólo hace que la radiografía no se recuerde entre sesiones
-- hasta que se corra.

alter table public.profiles
  add column if not exists advisor_profile_data jsonb;

comment on column public.profiles.advisor_profile_data is
  'Radiografía del Onboarding (pasos 3-8): { nombre, perfil, fortaleza, '
  'inquietud, mercado, disponibilidad, horario, motor }. "horario" es un '
  'arreglo de horas (0-23) marcadas libres en el mapa del Paso 7, no un '
  'texto único. Null = todavía no completó el cuestionario. Ver '
  'src/lib/advisorOnboarding.js.';
