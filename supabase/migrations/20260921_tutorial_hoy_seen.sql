-- Mini-tutorial de la pestaña "Hoy": recordar si la persona ya lo vio, para no
-- repetírselo aunque entre desde otro dispositivo.
--
-- Columna opcional, igual que `experience_level` y `advisor_profile_data`: el
-- código degrada en silencio si no existe (ver `isMissingColumn` en
-- profilesRepo.js), apoyándose mientras tanto en la memoria local del navegador.
-- La política de RLS "edita mi perfil" que ya existe cubre esta columna; el
-- trigger que protege `role` no la afecta.

alter table public.profiles
  add column if not exists tutorial_hoy_seen boolean not null default false;
