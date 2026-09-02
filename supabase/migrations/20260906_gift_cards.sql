-- Tarjeta digital de regalo.
--
-- El asesor regala una tarjeta EN BLANCO a un contacto; ese contacto la reclama
-- con SU cuenta de Google, la personaliza con sus datos y una foto, y a cambio
-- deja referidos. Es independiente de la app del asesor: vive en su propia ruta
-- pública y el cliente nunca ve nada interno.
--
-- ── Identidad del dueño: el Google del cliente ──
-- La tarjeta se amarra al `sub` de Google (identificador único e inmutable de la
-- cuenta) en el momento en que se reclama. Desde entonces SÓLO esa cuenta la
-- edita. Reenviar el enlace no sirve: quien lo abra tendrá que entrar con su
-- propio Google, y si no es el dueño no puede tocar nada. Esto es lo que evita
-- que la tarjeta se pase de tercero en tercero.
--
-- ── Aislamiento del mundo asesor ──
-- Estas filas NO tocan `profiles`. El cliente que entra con Google en la ruta de
-- la tarjeta no crea ficha de asesor ni pasa por el Gate: su sesión de Google se
-- usa aquí sólo para leer su `sub`, y los RPC comparan contra `gift_cards`. La
-- app del asesor y el mundo del cliente comparten Supabase Auth pero nada más.
--
-- ── Cuidado del espacio ──
-- UNA foto por tarjeta, reemplazable. La app borra la anterior de Storage al
-- subir una nueva y al revocar. Aquí se guarda la ruta del archivo para poder
-- borrarlo; el modelo no acumula fotos huérfanas.

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles (id) on delete cascade,
  -- A quién se la regaló el asesor (nombre/WhatsApp del contacto), para su registro.
  recipient_name text not null,
  recipient_whatsapp text not null,

  -- Dueño real una vez reclamada: el `sub` de Google. Nulo hasta que alguien entra.
  owner_google_sub text,
  owner_email text,

  -- Contenido de la tarjeta, que el dueño llena. Misma forma que la del asesor.
  full_name text,
  title text,
  company text,
  specialties jsonb not null default '[]'::jsonb,
  bio text,
  phone text,
  whatsapp text,
  avatar_url text,
  avatar_path text,          -- ruta en Storage, para poder borrar la foto anterior
  photo_focus text,

  -- Propagación de un nivel: esta tarjeta permite regalar UNA más. `parent_card_id`
  -- marca de qué tarjeta nació; una tarjeta nacida de propagación NO vuelve a
  -- propagar (can_propagate = false).
  parent_card_id uuid references public.gift_cards (id) on delete set null,
  can_propagate boolean not null default true,
  propagated_at timestamptz,

  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE', 'ACTIVA', 'REVOCADA')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists gift_cards_advisor_idx
  on public.gift_cards (advisor_id, created_at desc);
create index if not exists gift_cards_owner_idx
  on public.gift_cards (owner_google_sub) where owner_google_sub is not null;

alter table public.gift_cards enable row level security;

-- El asesor lee y administra las tarjetas que regaló. La edición del contenido
-- por el cliente NO pasa por RLS de tabla: va por RPC que comparan el `sub` de
-- Google, porque el cliente no es "authenticated" en el sentido de la app.
grant select on public.gift_cards to authenticated;

drop policy if exists "el asesor ve sus tarjetas" on public.gift_cards;
create policy "el asesor ve sus tarjetas"
  on public.gift_cards for select
  to authenticated
  using (auth.uid() = advisor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vista pública: lo que se muestra de una tarjeta ACTIVA sin identidad
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Igual que las tarjetas de asesor: sólo columnas publicables, nunca el email
-- del dueño ni su `sub`. Una tarjeta pendiente o revocada no se muestra.

create or replace function public.public_gift_card(p_card_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when gc.id is null then jsonb_build_object('outcome', 'NOT_FOUND')
    when gc.status <> 'ACTIVA' then jsonb_build_object('outcome', gc.status)
    else jsonb_build_object(
      'outcome', 'ACTIVA',
      'id', gc.id,
      'fullName', gc.full_name,
      'title', gc.title,
      'company', gc.company,
      'specialties', gc.specialties,
      'bio', gc.bio,
      'phone', gc.phone,
      'whatsapp', gc.whatsapp,
      'avatarUrl', gc.avatar_url,
      'photoFocus', gc.photo_focus,
      'canPropagate', gc.can_propagate and gc.propagated_at is null
    )
  end
  from (select 1) s
  left join public.gift_cards gc on gc.id = p_card_id
$$;

revoke all on function public.public_gift_card(uuid) from public;
grant execute on function public.public_gift_card(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reclamo y edición por el dueño (identidad = sub de Google)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- El cliente entra con Google en la ruta de la tarjeta. Su token trae el `sub`.
-- `auth.jwt()->>'sub'` es la forma que Postgres tiene de leerlo dentro del RPC:
-- no se confía en un `sub` que mande el cliente por parámetro, se toma del token
-- verificado. Así nadie puede reclamar la tarjeta de otro pasando su `sub`.

create or replace function public.claim_gift_card(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v_email text := auth.jwt() ->> 'email';
  v_card public.gift_cards%rowtype;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select * into v_card from public.gift_cards where id = p_card_id for update;
  if v_card.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if v_card.status = 'REVOCADA' then
    return jsonb_build_object('outcome', 'REVOKED');
  end if;

  -- Ya tiene dueño: sólo ese dueño puede entrar; cualquier otro Google, no.
  if v_card.owner_google_sub is not null then
    if v_card.owner_google_sub = v_sub then
      return jsonb_build_object('outcome', 'OWNER');
    end if;
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  -- Primer reclamo: se amarra a esta cuenta de Google y se activa.
  update public.gift_cards
     set owner_google_sub = v_sub,
         owner_email = v_email,
         status = 'ACTIVA',
         full_name = coalesce(full_name, v_card.recipient_name),
         claimed_at = now(),
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'OWNER');
end;
$$;

-- Contenido editable, sólo para el dueño. Devuelve todos los campos que el
-- editor necesita; incluye email/whatsapp del propio dueño porque son suyos.
create or replace function public.my_gift_card(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v public.gift_cards%rowtype;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select * into v from public.gift_cards
   where id = p_card_id and owner_google_sub = v_sub;

  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  return jsonb_build_object(
    'outcome', 'OK',
    'id', v.id,
    'status', v.status,
    'fullName', v.full_name,
    'title', v.title,
    'company', v.company,
    'specialties', v.specialties,
    'bio', v.bio,
    'phone', v.phone,
    'whatsapp', v.whatsapp,
    'avatarUrl', v.avatar_url,
    'avatarPath', v.avatar_path,
    'photoFocus', v.photo_focus,
    'canPropagate', v.can_propagate and v.propagated_at is null
  );
end;
$$;

create or replace function public.save_gift_card(
  p_card_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v public.gift_cards%rowtype;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select * into v from public.gift_cards
   where id = p_card_id and owner_google_sub = v_sub for update;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;
  if v.status = 'REVOCADA' then
    return jsonb_build_object('outcome', 'REVOKED');
  end if;

  update public.gift_cards
     set full_name = coalesce(p_patch->>'fullName', full_name),
         title = coalesce(p_patch->>'title', title),
         company = coalesce(p_patch->>'company', company),
         specialties = coalesce(p_patch->'specialties', specialties),
         bio = coalesce(p_patch->>'bio', bio),
         phone = coalesce(p_patch->>'phone', phone),
         whatsapp = coalesce(p_patch->>'whatsapp', whatsapp),
         photo_focus = coalesce(p_patch->>'photoFocus', photo_focus),
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'SAVED');
end;
$$;

-- Guarda la foto nueva y DEVUELVE la ruta de la anterior, para que la app la
-- borre de Storage. Así no se acumulan fotos huérfanas.
create or replace function public.set_gift_card_photo(
  p_card_id uuid,
  p_avatar_url text,
  p_avatar_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v public.gift_cards%rowtype;
  v_old text;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select * into v from public.gift_cards
   where id = p_card_id and owner_google_sub = v_sub for update;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  v_old := v.avatar_path;

  update public.gift_cards
     set avatar_url = p_avatar_url,
         avatar_path = p_avatar_path,
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'SAVED', 'previousPath', v_old);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Propagación de un nivel: el dueño regala UNA tarjeta más (gratis)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- No toca inventario de nadie: es el regalo que la propia tarjeta lleva. Crea
-- una tarjeta hija PENDIENTE, atribuida al mismo asesor, con can_propagate=false
-- para que la cadena se corte aquí. Marca la tarjeta madre como ya propagada.

create or replace function public.propagate_gift_card(
  p_card_id uuid,
  p_name text,
  p_whatsapp text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v public.gift_cards%rowtype;
  v_child uuid;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  if length(trim(coalesce(p_name, ''))) < 2
     or length(public.diagnostic_whatsapp_key(p_whatsapp)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  select * into v from public.gift_cards
   where id = p_card_id and owner_google_sub = v_sub for update;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;
  if not v.can_propagate or v.propagated_at is not null then
    return jsonb_build_object('outcome', 'ALREADY_PROPAGATED');
  end if;

  insert into public.gift_cards (
    advisor_id, recipient_name, recipient_whatsapp,
    parent_card_id, can_propagate
  ) values (
    v.advisor_id, trim(p_name), trim(p_whatsapp),
    v.id, false
  )
  returning id into v_child;

  update public.gift_cards set propagated_at = now(), updated_at = now()
   where id = p_card_id;

  -- El referido también entra a Prospectos capturados del asesor, atribuido.
  insert into public.leads (
    advisor_id, name, whatsapp, source, referred_by_name, referrer_diagnostic_id
  ) values (
    v.advisor_id, trim(p_name), trim(p_whatsapp),
    'card_referral', coalesce(v.full_name, v.recipient_name), null
  )
  on conflict do nothing;

  return jsonb_build_object('outcome', 'PROPAGATED', 'childCardId', v_child);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lado del asesor: crear la tarjeta (consume inventario o emergencia) y revocar
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_gift_card_for_lead(
  p_lead_id uuid,
  p_use_emergency boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_lead public.leads%rowtype;
  v_existing public.gift_cards%rowtype;
  v_new public.gift_cards%rowtype;
  v_source text;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_lead from public.leads
   where id = p_lead_id and advisor_id = v_advisor;
  if v_lead.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  -- Una tarjeta viva por prospecto: si ya existe una no revocada, se devuelve.
  select * into v_existing from public.gift_cards
   where advisor_id = v_advisor
     and recipient_whatsapp = v_lead.whatsapp
     and status <> 'REVOCADA'
     and parent_card_id is null
   order by created_at desc limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'outcome', 'READY', 'cardId', v_existing.id,
      'status', v_existing.status, 'source', 'existing'
    );
  end if;

  v_source := public.consume_card(v_advisor, coalesce(p_use_emergency, false));
  if v_source = 'NEEDS_EMERGENCY' then
    return jsonb_build_object('outcome', 'NEEDS_EMERGENCY', 'kind', 'card');
  end if;
  if v_source = 'EMPTY' then
    return jsonb_build_object('outcome', 'EMPTY', 'kind', 'card');
  end if;

  insert into public.gift_cards (advisor_id, recipient_name, recipient_whatsapp)
  values (v_advisor, v_lead.name, v_lead.whatsapp)
  returning * into v_new;

  return jsonb_build_object(
    'outcome', 'READY', 'cardId', v_new.id,
    'status', v_new.status, 'source', v_source
  );
end;
$$;

create or replace function public.revoke_gift_card(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid := auth.uid();
  v_path text;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  update public.gift_cards
     set status = 'REVOCADA', updated_at = now()
   where id = p_card_id and advisor_id = v_advisor
  returning avatar_path into v_path;

  if not found then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  -- Devuelve la ruta de la foto para que la app la borre de Storage.
  return jsonb_build_object('outcome', 'REVOKED', 'avatarPath', v_path);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on function public.claim_gift_card(uuid) from public;
revoke all on function public.my_gift_card(uuid) from public;
revoke all on function public.save_gift_card(uuid, jsonb) from public;
revoke all on function public.set_gift_card_photo(uuid, text, text) from public;
revoke all on function public.propagate_gift_card(uuid, text, text) from public;
revoke all on function public.create_gift_card_for_lead(uuid, boolean) from public;
revoke all on function public.revoke_gift_card(uuid) from public;

-- El dueño de la tarjeta entra con Google: es authenticated, pero no asesor. Los
-- RPC comparan su sub internamente, así que se conceden a authenticated (y el
-- reclamo/lectura pública también a anon donde aplica).
grant execute on function public.claim_gift_card(uuid) to authenticated;
grant execute on function public.my_gift_card(uuid) to authenticated;
grant execute on function public.save_gift_card(uuid, jsonb) to authenticated;
grant execute on function public.set_gift_card_photo(uuid, text, text) to authenticated;
grant execute on function public.propagate_gift_card(uuid, text, text) to authenticated;

-- Crear y revocar es exclusivo del asesor con sesión.
grant execute on function public.create_gift_card_for_lead(uuid, boolean) to authenticated;
grant execute on function public.revoke_gift_card(uuid) to authenticated;
