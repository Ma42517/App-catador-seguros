-- Tarjetas digitales públicas y captura de prospectos sin sesión.
--
-- Dos piezas: una vista para que cualquiera pueda leer la tarjeta de un asesor,
-- y una tabla para que un visitante pueda dejar sus datos sin tener cuenta.
--
-- Todo el guion es repetible: se puede correr dos veces sin fallar, que es lo
-- que hace falta cuando no se recuerda si ya se aplicó.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Vista pública de tarjetas
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Aquí está la decisión importante de este archivo, y va contra el atajo
-- habitual.
--
-- Lo rápido sería abrir la tabla entera:
--
--     create policy "Perfiles públicos visibles para todos"
--       on profiles for select using (true);
--
-- No se hace, porque la clave anónima de Supabase viaja dentro del paquete que
-- descarga el navegador: es pública por diseño. Con esa política, cualquiera
-- podría pedir `select * from profiles` y llevarse el correo y el rol de toda la
-- promotoría, no sólo del asesor cuya tarjeta abrió. Row Level Security decide
-- qué FILAS se ven, nunca qué COLUMNAS, así que no hay forma de esconder el
-- correo con una política.
--
-- La vista sí elige columnas. Lo que no aparece abajo no se puede pedir, ni
-- conociendo el identificador ni cambiando la consulta desde el cliente.
--
-- La vista NO se declara con `security_invoker`: se ejecuta con los permisos de
-- su dueño y por eso puede leer `profiles` aunque `anon` no tenga acceso a la
-- tabla. Es exactamente el mecanismo que permite publicar un subconjunto sin
-- abrir el resto.

-- Se borra antes de crear: `create or replace view` no admite cambiar la lista de
-- columnas, así que al reaplicar el guion tras quitar una columna fallaría con
-- «cannot change name of view column».
drop view if exists public.public_cards;

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
    whatsapp
  from public.profiles
  -- Sólo asesores en activo. Una cuenta en revisión o revocada no debe seguir
  -- entregando contactos desde un enlace que ya circula por ahí.
  where role in ('advisor', 'promoter', 'admin');

comment on view public.public_cards is
  'Subconjunto publicable de profiles: lo que dibuja la tarjeta digital. '
  'Excluye correo y rol a propósito; no ampliar sin revisar quién puede leerla.';

grant select on public.public_cards to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Prospectos
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  -- Si se borra el asesor, sus prospectos se van con él: son datos personales
  -- recogidos en su nombre y sin él no hay quien responda por ellos.
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  whatsapp text,
  source text default 'public_card',
  created_at timestamptz not null default now()
);

-- El asesor lista sus prospectos por fecha; sin el índice, cada consulta
-- recorrería la tabla completa de toda la promotoría.
create index if not exists leads_advisor_created_idx
  on public.leads (advisor_id, created_at desc);

-- Privilegios de Postgres, que son una capa distinta de las políticas.
--
-- Hacen falta LAS DOS COSAS. Sin el grant, la inserción falla con "permission
-- denied for table leads" (42501) aunque la política la permita: la política
-- decide qué filas puede tocar un rol que ya tiene permiso sobre la tabla, no le
-- concede ese permiso. Es el mismo tropiezo que está documentado para
-- `announcements` en .env.example.
--
-- `anon` recibe sólo `insert`. Nada de `select`: de eso se encarga la política,
-- pero negarlo también aquí deja la intención por escrito en los dos sitios.
grant usage on schema public to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant select, delete on public.leads to authenticated;

alter table public.leads enable row level security;

-- Inserción sin sesión: es el caso normal aquí. Quien llena el formulario en una
-- tarjeta compartida no tiene cuenta, así que si esto no se permite, la función
-- no existe.
drop policy if exists "cualquiera puede dejar sus datos" on public.leads;
create policy "cualquiera puede dejar sus datos"
  on public.leads for insert
  to anon, authenticated
  with check (
    -- Se exige que el destinatario sea un asesor con tarjeta publicada. Sin esta
    -- condición, la tabla queda abierta a escribir filas con cualquier
    -- `advisor_id`, incluso inventado.
    exists (select 1 from public.public_cards pc where pc.id = advisor_id)
    and length(trim(name)) > 0
  );

-- Lectura sólo del dueño. Es la mitad que suele olvidarse: si se concediera
-- `select` a `anon` "para probar", cualquiera con la clave pública podría
-- descargarse el nombre y el teléfono de todos los prospectos de la promotoría.
drop policy if exists "el asesor lee sus prospectos" on public.leads;
create policy "el asesor lee sus prospectos"
  on public.leads for select
  to authenticated
  using (auth.uid() = advisor_id);

drop policy if exists "el asesor borra sus prospectos" on public.leads;
create policy "el asesor borra sus prospectos"
  on public.leads for delete
  to authenticated
  using (auth.uid() = advisor_id);

-- No se define política de UPDATE: un prospecto es el registro de lo que alguien
-- escribió en un momento dado. Sin política, nadie puede modificarlo, que es la
-- garantía de que lo guardado es lo que se recibió.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Comprobación de las políticas de profiles
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Este bloque no cambia nada: avisa si `profiles` quedó abierta a lectura
-- anónima, que es justo lo que la vista viene a evitar. Aparece como aviso al
-- correr el guion.

do $$
declare
  abierta boolean;
begin
  select exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'SELECT'
      and 'anon' = any (roles)
  ) into abierta;

  if abierta then
    raise warning
      'public.profiles tiene una politica de SELECT para anon. La tarjeta publica '
      'no la necesita: usa la vista public_cards. Conviene revisarla, porque expone '
      'el correo y el rol de todos los perfiles.';
  end if;
end $$;
