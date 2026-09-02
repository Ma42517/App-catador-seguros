-- Segundo método de acceso a la tarjeta: número + clave única de 15 minutos.
--
-- Convive con Google. Quien prefiera no usar una cuenta de Google entra con su
-- número y una clave que el asesor le comparte por WhatsApp. La clave:
--   · se genera al crear la tarjeta, distinta para cada una;
--   · caduca a los 15 minutos;
--   · se guarda sólo como hash con sal —nunca viaja al navegador del cliente—;
--   · se agota a los 5 intentos fallidos.
--
-- ── Qué identifica al dueño cuando no hay Google ──
-- El DISPOSITIVO, con el mismo mecanismo que ya usa el diagnóstico: al validar la
-- clave el servidor emite un secreto largo que queda en ese navegador, y desde
-- entonces entra directo sin volver a pedir nada. Un número de teléfono por sí
-- solo no puede ser la llave permanente: es adivinable, y quien lo conozca
-- entraría. La clave demuestra que el mensaje le llegó; el secreto mantiene la
-- sesión sin depender de él.
--
-- ── Envío ──
-- La clave la entrega el asesor por WhatsApp junto con el enlace. Automatizarlo
-- exige la plataforma oficial de Meta —número dedicado, verificación del negocio
-- y plantillas aprobadas—, así que hasta entonces el envío es manual, igual que
-- el pase de diagnóstico.

alter table public.gift_cards
  add column if not exists owner_phone text,
  add column if not exists access_code_hash text,
  add column if not exists access_code_salt text,
  add column if not exists access_code_expires_at timestamptz,
  add column if not exists access_code_attempts integer not null default 0,
  add column if not exists access_code_uses_left integer not null default 0;

/*
  Dispositivos autorizados de una tarjeta. Se guarda sólo el hash del secreto: si
  la base se filtrara, ninguno de esos valores sirve para entrar.
*/
create table if not exists public.gift_card_devices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.gift_cards (id) on delete cascade,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists gift_card_devices_secret_unique
  on public.gift_card_devices (secret_hash);
create index if not exists gift_card_devices_card_idx
  on public.gift_card_devices (card_id);

alter table public.gift_card_devices enable row level security;
revoke all on public.gift_card_devices from anon, authenticated;

/** Cuánto vive la clave. Quince minutos, como se pidió. */
create or replace function public.gift_code_ttl()
returns interval language sql immutable as $$ select interval '15 minutes' $$;

revoke all on function public.gift_code_ttl() from public;

-- ─────────────────────────────────────────────────────────────────────────────
-- Emisión de la clave: sólo el asesor dueño de la tarjeta
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.issue_gift_card_access_code(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_advisor uuid := auth.uid();
  v_card public.gift_cards%rowtype;
  v_bytes bytea;
  v_code text;
  v_salt text;
  v_expires timestamptz;
begin
  if v_advisor is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_card from public.gift_cards
   where id = p_card_id and advisor_id = v_advisor;
  if v_card.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  v_bytes := gen_random_bytes(3);
  v_code := lpad(((
    get_byte(v_bytes, 0)::int * 65536
    + get_byte(v_bytes, 1)::int * 256
    + get_byte(v_bytes, 2)::int
  ) % 1000000)::text, 6, '0');

  v_salt := encode(gen_random_bytes(16), 'hex');
  v_expires := now() + public.gift_code_ttl();

  update public.gift_cards
     set access_code_hash = public.diagnostic_hash(v_code, v_salt),
         access_code_salt = v_salt,
         access_code_expires_at = v_expires,
         access_code_attempts = 0,
         access_code_uses_left = 2,
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'ISSUED', 'code', v_code, 'expiresAt', v_expires);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Autorización: Google o dispositivo
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.gift_card_authorized(
  p_card public.gift_cards,
  p_device_secret text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    -- Dueño por cuenta de Google.
    (p_card.owner_google_sub is not null
      and p_card.owner_google_sub = (auth.jwt() ->> 'sub'))
    -- O dispositivo autorizado con la clave.
    or (coalesce(p_device_secret, '') <> '' and exists (
      select 1 from public.gift_card_devices d
       where d.card_id = p_card.id
         and d.secret_hash = public.diagnostic_hash(p_device_secret, p_card.id::text)
    ))
$$;

revoke all on function public.gift_card_authorized(public.gift_cards, text) from public;

-- Entrar con número + clave. Devuelve el secreto del dispositivo, que el
-- navegador guarda para no volver a pedir la clave.
create or replace function public.claim_gift_card_with_code(
  p_card_id uuid,
  p_phone text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_card public.gift_cards%rowtype;
  v_secret text;
begin
  select * into v_card from public.gift_cards where id = p_card_id for update;
  if v_card.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if v_card.status = 'REVOCADA' then
    return jsonb_build_object('outcome', 'REVOKED');
  end if;

  if length(public.diagnostic_whatsapp_key(p_phone)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID_PHONE');
  end if;

  if v_card.access_code_hash is null
     or v_card.access_code_expires_at is null
     or v_card.access_code_expires_at < now()
     or v_card.access_code_uses_left <= 0 then
    return jsonb_build_object('outcome', 'CODE_EXPIRED');
  end if;

  if v_card.access_code_attempts >= 5 then
    return jsonb_build_object('outcome', 'TOO_MANY_ATTEMPTS');
  end if;

  if public.diagnostic_hash(regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g'),
                            v_card.access_code_salt) <> v_card.access_code_hash then
    update public.gift_cards
       set access_code_attempts = access_code_attempts + 1, updated_at = now()
     where id = p_card_id;
    return jsonb_build_object(
      'outcome', 'CODE_INVALID',
      'attemptsLeft', greatest(0, 4 - v_card.access_code_attempts)
    );
  end if;

  /*
    Si la tarjeta ya tiene dueño por Google, la clave no puede arrebatársela: sólo
    sirve para autorizar otro dispositivo del MISMO dueño. Y si aún no tiene
    dueño, este número queda registrado como tal.
  */
  v_secret := encode(gen_random_bytes(32), 'hex');

  insert into public.gift_card_devices (card_id, secret_hash)
  values (p_card_id, public.diagnostic_hash(v_secret, p_card_id::text));

  update public.gift_cards
     set owner_phone = coalesce(owner_phone, trim(p_phone)),
         status = case when status = 'PENDIENTE' then 'ACTIVA' else status end,
         full_name = coalesce(full_name, v_card.recipient_name),
         claimed_at = coalesce(claimed_at, now()),
         access_code_uses_left = access_code_uses_left - 1,
         access_code_attempts = 0,
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'AUTHORIZED', 'deviceSecret', v_secret);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lectura y escritura del dueño, ahora aceptando dispositivo
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Se borran antes de recrearse porque cambian de firma: añadir el secreto del
-- dispositivo como parámetro dejaría dos versiones vivas y PostgREST no sabría
-- cuál llamar.

drop function if exists public.my_gift_card(uuid);
drop function if exists public.save_gift_card(uuid, jsonb);
drop function if exists public.set_gift_card_photo(uuid, text, text);

create or replace function public.my_gift_card(
  p_card_id uuid,
  p_device_secret text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.gift_cards%rowtype;
begin
  select * into v from public.gift_cards where id = p_card_id;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if not public.gift_card_authorized(v, p_device_secret) then
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  update public.gift_card_devices set last_seen_at = now()
   where card_id = p_card_id
     and secret_hash = public.diagnostic_hash(p_device_secret, p_card_id::text);

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
    'photoFocus', v.photo_focus
  );
end;
$$;

create or replace function public.save_gift_card(
  p_card_id uuid,
  p_patch jsonb,
  p_device_secret text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.gift_cards%rowtype;
begin
  select * into v from public.gift_cards where id = p_card_id for update;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if not public.gift_card_authorized(v, p_device_secret) then
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

create or replace function public.set_gift_card_photo(
  p_card_id uuid,
  p_avatar_url text,
  p_avatar_path text,
  p_device_secret text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.gift_cards%rowtype;
  v_old text;
begin
  select * into v from public.gift_cards where id = p_card_id for update;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if not public.gift_card_authorized(v, p_device_secret) then
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  v_old := v.avatar_path;

  update public.gift_cards
     set avatar_url = p_avatar_url, avatar_path = p_avatar_path, updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'SAVED', 'previousPath', v_old);
end;
$$;

-- Abrir con el dispositivo ya autorizado, sin pedir clave ni Google.
create or replace function public.open_gift_card_with_device(
  p_card_id uuid,
  p_device_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.gift_cards%rowtype;
begin
  if coalesce(p_device_secret, '') = '' then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select * into v from public.gift_cards where id = p_card_id;
  if v.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if not exists (
    select 1 from public.gift_card_devices d
     where d.card_id = p_card_id
       and d.secret_hash = public.diagnostic_hash(p_device_secret, p_card_id::text)
  ) then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  return jsonb_build_object('outcome', 'AUTHORIZED');
end;
$$;

-- Revocar y restablecer también deben limpiar los dispositivos: si no, un
-- teléfono ya autorizado seguiría entrando a una tarjeta liberada.
create or replace function public.reset_gift_card(p_card_id uuid)
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

  select avatar_path into v_path
    from public.gift_cards
   where id = p_card_id and advisor_id = v_advisor;

  update public.gift_cards
     set owner_google_sub = null,
         owner_email = null,
         owner_phone = null,
         status = 'PENDIENTE',
         full_name = null, title = null, company = null,
         specialties = '[]'::jsonb, bio = null, phone = null, whatsapp = null,
         avatar_url = null, avatar_path = null, photo_focus = null,
         claimed_at = null,
         access_code_hash = null, access_code_salt = null,
         access_code_expires_at = null, access_code_attempts = 0,
         access_code_uses_left = 0,
         updated_at = now()
   where id = p_card_id and advisor_id = v_advisor;

  if not found then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  delete from public.gift_card_devices where card_id = p_card_id;

  return jsonb_build_object('outcome', 'RESET', 'avatarPath', v_path);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on function public.issue_gift_card_access_code(uuid) from public;
revoke all on function public.claim_gift_card_with_code(uuid, text, text) from public;
revoke all on function public.open_gift_card_with_device(uuid, text) from public;
revoke all on function public.my_gift_card(uuid, text) from public;
revoke all on function public.save_gift_card(uuid, jsonb, text) from public;
revoke all on function public.set_gift_card_photo(uuid, text, text, text) from public;
revoke all on function public.reset_gift_card(uuid) from public;

-- Emitir la clave es del asesor.
grant execute on function public.issue_gift_card_access_code(uuid) to authenticated;
grant execute on function public.reset_gift_card(uuid) to authenticated;

-- Entrar y editar es del dueño, con o sin cuenta de Google: por eso también anon.
grant execute on function public.claim_gift_card_with_code(uuid, text, text) to anon, authenticated;
grant execute on function public.open_gift_card_with_device(uuid, text) to anon, authenticated;
grant execute on function public.my_gift_card(uuid, text) to anon, authenticated;
grant execute on function public.save_gift_card(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.set_gift_card_photo(uuid, text, text, text) to anon, authenticated;
