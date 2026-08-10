-- Encuadre de la foto de la tarjeta.
--
-- Guarda qué parte de la foto se muestra en el hueco del retrato: la posición
-- horizontal, la vertical y el acercamiento, como un pequeño JSON en texto.
--
-- Se guarda el encuadre en lugar de recortar el archivo porque recortar destruye
-- lo que queda fuera: un encuadre mal elegido sólo se podía arreglar volviendo a
-- subir la foto original, y quien ya la había borrado del teléfono se quedaba con
-- el retrato torcido. Con la imagen entera guardada, recolocarla es gratis y se
-- puede repetir siempre.
--
-- Es `text` y no `jsonb` a propósito: la app lo lee con un analizador tolerante
-- que cae al centro ante cualquier valor que no entienda, así que un dato
-- corrupto no debe impedir que la tarjeta se guarde. Con `jsonb`, Postgres
-- rechazaría la fila entera.

alter table public.profiles
  add column if not exists photo_focus text;

comment on column public.profiles.photo_focus is
  'Encuadre del retrato como JSON: {"x","y","zoom"}. x e y son porcentajes de '
  'object-position; zoom es el factor de escala. Sin valor, la foto se centra.';

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
    company,
    specialties,
    bio,
    phone,
    whatsapp,
    photo_focus
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
