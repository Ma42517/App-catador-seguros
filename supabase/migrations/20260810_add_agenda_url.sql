-- Enlace de agenda del asesor (Calendly, Google Calendar o similar).
--
-- Se guarda el enlace y no una integración: el asesor ya usa la herramienta que
-- prefiere, y lo único que hace falta es llevar al prospecto hasta ella.
--
-- `if not exists` deja el guion repetible: correrlo dos veces no falla, que es lo
-- que hace falta cuando no se recuerda si ya se aplicó.

alter table public.profiles
  add column if not exists agenda_url text;

comment on column public.profiles.agenda_url is
  'Enlace público donde el prospecto puede agendar una cita con el asesor.';

-- La vista pública se recrea para incluir la columna nueva.
--
-- Va con `drop` y no con `create or replace`: éste no admite cambiar la lista de
-- columnas y fallaría con «cannot change name of view column». El `cascade`
-- arrastra la política de `leads` que depende de la vista, así que se vuelve a
-- crear justo después.
drop view if exists public.public_cards cascade;

create view public.public_cards as
  select
    id,
    full_name,
    avatar_url,
    title,
    license_number,
    company,
    specialties,
    bio,
    phone,
    whatsapp,
    agenda_url
  from public.profiles
  -- Sólo asesores en activo. Una cuenta en revisión o revocada no debe seguir
  -- entregando contactos desde un enlace que ya circula por ahí.
  where role in ('advisor', 'promoter', 'admin');

comment on view public.public_cards is
  'Subconjunto publicable de profiles: lo que dibuja la tarjeta digital. '
  'Excluye correo y rol a propósito; no ampliar sin revisar quién puede leerla.';

grant select on public.public_cards to anon, authenticated;

-- Se repone la política que el `cascade` acaba de borrar.
drop policy if exists "cualquiera puede dejar sus datos" on public.leads;
create policy "cualquiera puede dejar sus datos"
  on public.leads for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.public_cards pc where pc.id = advisor_id)
    and length(trim(name)) > 0
  );
