-- Acceso por código de verificación y vínculo al dispositivo.
--
-- Sustituye la validación por WhatsApp. Aquella era un secreto adivinable:
-- cualquiera que conociera el número del dueño entraba, y reenviar el enlace
-- bastaba para propagar el pase. Aquí el enlace deja de ser suficiente por sí
-- solo y deja de ser portable.
--
-- ── Por qué el código no se puede sacar del navegador ──
-- Porque nunca viaja a él. Se genera dentro de Postgres, se guarda únicamente
-- su hash con sal, y el navegador sólo manda un candidato para que el servidor
-- diga sí o no. La clave publicable de Supabase viaja en el paquete del
-- navegador —es pública por diseño—, así que `anon` no recibe SELECT sobre
-- estas columnas ni sobre la tabla de dispositivos: sólo puede llamar los RPC
-- de abajo, que jamás devuelven el código ni su hash.
--
-- ── Por qué deja de pasarse de tercero en tercero ──
-- Tres capas: el código caduca y se agota, el pase queda amarrado al
-- dispositivo que lo reclamó, y autorizar un dispositivo nuevo exige un código
-- nuevo que sólo el asesor puede emitir. Reenviar el mensaje ya no alcanza.

create extension if not exists pgcrypto with schema extensions;

alter table public.diagnostics
  add column if not exists access_code_hash text,
  add column if not exists access_code_salt text,
  add column if not exists access_code_expires_at timestamptz,
  add column if not exists access_code_attempts integer not null default 0,
  add column if not exists access_code_uses_left integer not null default 0;

/*
  Un pase puede tener varios dispositivos autorizados, y cada uno guarda sólo el
  hash de su secreto. Si la base se filtrara, ninguno de esos hashes sirve para
  entrar: el secreto en claro existe únicamente en el navegador del dueño.
*/
create table if not exists public.diagnostic_devices (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references public.diagnostics (id) on delete cascade,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists diagnostic_devices_secret_unique
  on public.diagnostic_devices (secret_hash);
create index if not exists diagnostic_devices_diagnostic_idx
  on public.diagnostic_devices (diagnostic_id);

alter table public.diagnostic_devices enable row level security;

/*
  Nadie tiene acceso directo a la tabla, ni el asesor autenticado: los dispositivos
  se consultan por RPC, que devuelve un conteo y fechas, nunca los hashes. Sin
  políticas ni grants, RLS deniega todo por omisión.
*/
revoke all on public.diagnostic_devices from anon, authenticated;

-- Cuántos dispositivos puede reclamar un mismo código y cuánto vive.
-- Dos, porque el navegador interno de WhatsApp y el navegador normal del teléfono
-- son dos almacenamientos distintos: obligar a pedir otro código sólo por abrir
-- el enlace desde el chat y luego desde Chrome convertiría la seguridad en una
-- llamada al asesor.
create or replace function public.diagnostic_code_ttl()
returns interval language sql immutable as $$ select interval '24 hours' $$;

revoke all on function public.diagnostic_code_ttl() from public;

create or replace function public.diagnostic_hash(p_value text, p_salt text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(coalesce(p_value, '') || ':' || coalesce(p_salt, ''), 'sha256'), 'hex')
$$;

revoke all on function public.diagnostic_hash(text, text) from public;

-- ─────────────────────────────────────────────────────────────────────────────
-- Emisión del código: sólo el asesor dueño, y sólo bajo su decisión
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Es el único punto de todo el sistema que devuelve el código en claro, y lo
-- devuelve a una sesión autenticada que ya demostró ser dueña del pase. El
-- asesor lo entrega por WhatsApp con el enlace.
create or replace function public.issue_diagnostic_access_code(
  p_diagnostic_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_diagnostic public.diagnostics%rowtype;
  v_bytes bytea;
  v_code text;
  v_salt text;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_diagnostic
    from public.diagnostics
   where id = p_diagnostic_id
     and advisor_id = auth.uid();

  if v_diagnostic.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  v_bytes := gen_random_bytes(3);
  v_code := lpad(((
    get_byte(v_bytes, 0)::int * 65536
    + get_byte(v_bytes, 1)::int * 256
    + get_byte(v_bytes, 2)::int
  ) % 1000000)::text, 6, '0');

  v_salt := encode(gen_random_bytes(16), 'hex');
  v_expires := now() + public.diagnostic_code_ttl();

  update public.diagnostics
     set access_code_hash = public.diagnostic_hash(v_code, v_salt),
         access_code_salt = v_salt,
         access_code_expires_at = v_expires,
         access_code_attempts = 0,
         access_code_uses_left = 2,
         updated_at = now()
   where id = p_diagnostic_id;

  return jsonb_build_object(
    'outcome', 'ISSUED',
    'code', v_code,
    'expiresAt', v_expires
  );
end;
$$;

-- Cuántos dispositivos hay autorizados, para que el asesor lo vea sin exponer
-- ningún hash.
create or replace function public.diagnostic_device_summary(
  p_diagnostic_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid;
  v_count integer;
  v_last timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select advisor_id into v_advisor
    from public.diagnostics
   where id = p_diagnostic_id
     and advisor_id = auth.uid();

  if v_advisor is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  select count(*), max(last_seen_at) into v_count, v_last
    from public.diagnostic_devices
   where diagnostic_id = p_diagnostic_id;

  return jsonb_build_object(
    'outcome', 'READY',
    'devices', coalesce(v_count, 0),
    'lastSeenAt', v_last
  );
end;
$$;

-- Revocar: expulsa todos los dispositivos y mata el código vigente. Es la salida
-- para un teléfono perdido o un enlace que se compartió de más.
create or replace function public.revoke_diagnostic_devices(
  p_diagnostic_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor uuid;
  v_removed integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select advisor_id into v_advisor
    from public.diagnostics
   where id = p_diagnostic_id
     and advisor_id = auth.uid();

  if v_advisor is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  delete from public.diagnostic_devices
   where diagnostic_id = p_diagnostic_id;
  get diagnostics v_removed = row_count;

  update public.diagnostics
     set access_code_hash = null,
         access_code_salt = null,
         access_code_expires_at = null,
         access_code_attempts = 0,
         access_code_uses_left = 0,
         updated_at = now()
   where id = p_diagnostic_id;

  return jsonb_build_object('outcome', 'REVOKED', 'removed', coalesce(v_removed, 0));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Acceso público: primero el dispositivo, y sólo si no lo hay, el código
-- ─────────────────────────────────────────────────────────────────────────────

/*
  Carga útil de un acceso ya autorizado. Aquí sí va el nombre, porque quien pasó
  el candado es el dueño y son sus propios datos. `recipient_whatsapp` no sale
  nunca, en ningún camino.
*/
create or replace function public.diagnostic_payload(p_row public.diagnostics)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'outcome', 'AUTHORIZED',
    'id', p_row.id,
    'status', p_row.status,
    'recipientName', p_row.recipient_name,
    'responses', p_row.responses,
    'results', p_row.results,
    'revision', p_row.revision,
    'completedAt', p_row.completed_at
  )
$$;

revoke all on function public.diagnostic_payload(public.diagnostics) from public;

/*
  Apertura silenciosa: el dispositivo que ya se reclamó entra directo, sin pedir
  nada. Cualquier otro recibe CODE_REQUIRED — sin nombre, sin respuestas y sin
  ninguna pista de a quién pertenece el pase.
*/
create or replace function public.open_public_diagnostic(
  p_diagnostic_id uuid,
  p_device_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.diagnostics%rowtype;
  v_device_id uuid;
begin
  select * into v_row from public.diagnostics where id = p_diagnostic_id;
  if v_row.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if coalesce(p_device_secret, '') <> '' then
    select id into v_device_id
      from public.diagnostic_devices
     where diagnostic_id = p_diagnostic_id
       and secret_hash = public.diagnostic_hash(p_device_secret, v_row.id::text);

    if v_device_id is not null then
      update public.diagnostic_devices
         set last_seen_at = now()
       where id = v_device_id;
      return public.diagnostic_payload(v_row);
    end if;
  end if;

  return jsonb_build_object('outcome', 'CODE_REQUIRED');
end;
$$;

/*
  Reclamo de dispositivo con el código.

  El código se compara por hash y se agota: cada uso baja `uses_left`, cada
  intento fallido sube `attempts` y a los cinco se invalida por completo. Un
  código de seis dígitos con cinco intentos y caducidad de 24 h no se adivina;
  y como el servidor devuelve el secreto del dispositivo, la entropía de esa
  llave no depende del navegador.
*/
create or replace function public.claim_public_diagnostic_device(
  p_diagnostic_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.diagnostics%rowtype;
  v_secret text;
begin
  select * into v_row from public.diagnostics where id = p_diagnostic_id for update;
  if v_row.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  if v_row.access_code_hash is null
     or v_row.access_code_expires_at is null
     or v_row.access_code_expires_at < now()
     or v_row.access_code_uses_left <= 0 then
    return jsonb_build_object('outcome', 'CODE_EXPIRED');
  end if;

  if v_row.access_code_attempts >= 5 then
    return jsonb_build_object('outcome', 'TOO_MANY_ATTEMPTS');
  end if;

  if public.diagnostic_hash(regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g'),
                            v_row.access_code_salt) <> v_row.access_code_hash then
    update public.diagnostics
       set access_code_attempts = access_code_attempts + 1,
           updated_at = now()
     where id = p_diagnostic_id;
    return jsonb_build_object(
      'outcome', 'CODE_INVALID',
      'attemptsLeft', greatest(0, 4 - v_row.access_code_attempts)
    );
  end if;

  v_secret := encode(gen_random_bytes(32), 'hex');

  insert into public.diagnostic_devices (diagnostic_id, secret_hash)
  values (p_diagnostic_id, public.diagnostic_hash(v_secret, v_row.id::text));

  update public.diagnostics
     set access_code_uses_left = access_code_uses_left - 1,
         access_code_attempts = 0,
         updated_at = now()
   where id = p_diagnostic_id
  returning * into v_row;

  return public.diagnostic_payload(v_row) || jsonb_build_object('deviceSecret', v_secret);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Escrituras públicas: ahora acreditan dispositivo, no número de teléfono
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Hay que BORRARLAS antes de recrearlas, no basta `create or replace`: el
-- segundo parámetro pasa de `p_whatsapp` a `p_device_secret` y conserva el mismo
-- tipo, y PostgreSQL rechaza renombrar un parámetro de entrada sobre una función
-- existente ("cannot change name of input parameter", 42P13). Sin estos `drop`,
-- la migración fallaría a la mitad y dejaría el candado nuevo sin sus escrituras.

drop function if exists public.save_public_diagnostic_progress(uuid, text, jsonb, integer);
drop function if exists public.complete_public_diagnostic(uuid, text, jsonb, jsonb, integer);
drop function if exists public.capture_public_diagnostic_referrals(uuid, text, jsonb);

create or replace function public.diagnostic_device_matches(
  p_diagnostic_id uuid,
  p_device_secret text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.diagnostic_devices
     where diagnostic_id = p_diagnostic_id
       and secret_hash = public.diagnostic_hash(p_device_secret, p_diagnostic_id::text)
  )
$$;

revoke all on function public.diagnostic_device_matches(uuid, text) from public;

create or replace function public.save_public_diagnostic_progress(
  p_diagnostic_id uuid,
  p_device_secret text,
  p_responses jsonb,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision integer;
begin
  if not public.diagnostic_device_matches(p_diagnostic_id, p_device_secret) then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  update public.diagnostics
     set responses = coalesce(p_responses, '{}'::jsonb),
         revision = revision + 1,
         updated_at = now()
   where id = p_diagnostic_id
     and status = 'PENDIENTE'
     and revision = p_revision
  returning revision into v_revision;

  if v_revision is null then
    return jsonb_build_object('outcome', 'CONFLICT');
  end if;

  return jsonb_build_object('outcome', 'SAVED', 'revision', v_revision);
end;
$$;

create or replace function public.complete_public_diagnostic(
  p_diagnostic_id uuid,
  p_device_secret text,
  p_responses jsonb,
  p_results jsonb,
  p_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.diagnostics%rowtype;
begin
  if not public.diagnostic_device_matches(p_diagnostic_id, p_device_secret) then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  update public.diagnostics
     set responses = coalesce(p_responses, '{}'::jsonb),
         results = coalesce(p_results, '{}'::jsonb),
         status = 'COMPLETADO',
         revision = revision + 1,
         updated_at = now(),
         completed_at = now()
   where id = p_diagnostic_id
     and status = 'PENDIENTE'
     and revision = p_revision
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object('outcome', 'CONFLICT');
  end if;

  return public.diagnostic_payload(v_row) || jsonb_build_object('outcome', 'COMPLETED');
end;
$$;

create or replace function public.capture_public_diagnostic_referrals(
  p_diagnostic_id uuid,
  p_device_secret text,
  p_referrals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diagnostic public.diagnostics%rowtype;
  v_item jsonb;
  v_name text;
  v_phone text;
  v_created integer := 0;
begin
  if not public.diagnostic_device_matches(p_diagnostic_id, p_device_secret) then
    return jsonb_build_object('outcome', 'UNAUTHORIZED');
  end if;

  select * into v_diagnostic from public.diagnostics where id = p_diagnostic_id;

  if jsonb_typeof(p_referrals) <> 'array'
     or jsonb_array_length(p_referrals) < 1
     or jsonb_array_length(p_referrals) > 3 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  for v_item in select value from jsonb_array_elements(p_referrals)
  loop
    v_name := trim(coalesce(v_item->>'name', ''));
    v_phone := trim(coalesce(v_item->>'whatsapp', v_item->>'phone', ''));

    if length(v_name) < 2 or length(v_name) > 120
       or length(public.diagnostic_whatsapp_key(v_phone)) <> 10 then
      return jsonb_build_object('outcome', 'INVALID');
    end if;

    insert into public.leads (
      advisor_id, name, whatsapp, source, referred_by_name, referrer_diagnostic_id
    ) values (
      v_diagnostic.advisor_id, v_name, v_phone,
      'diagnostic_referral', v_diagnostic.recipient_name, v_diagnostic.id
    )
    on conflict do nothing;

    if found then
      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'outcome', 'CAPTURED',
    'created', v_created,
    'received', jsonb_array_length(p_referrals)
  );
end;
$$;

/*
  Quien recibió un enlace que no es suyo puede pedir su propio análisis. Ya no
  se le dice de quién era el pase: sólo se registra su interés. El asesor se
  resuelve dentro de la función, nunca desde el cliente.
*/
create or replace function public.capture_public_diagnostic_lead(
  p_diagnostic_id uuid,
  p_name text,
  p_whatsapp text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diagnostic public.diagnostics%rowtype;
  v_lead_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 2
     or length(public.diagnostic_whatsapp_key(p_whatsapp)) <> 10 then
    return jsonb_build_object('outcome', 'INVALID');
  end if;

  select * into v_diagnostic from public.diagnostics where id = p_diagnostic_id;
  if v_diagnostic.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;

  insert into public.leads (
    advisor_id, name, whatsapp, source, referred_by_name, referrer_diagnostic_id
  ) values (
    v_diagnostic.advisor_id, trim(p_name), trim(p_whatsapp),
    'public_diagnostic', v_diagnostic.recipient_name, v_diagnostic.id
  )
  on conflict do nothing
  returning id into v_lead_id;

  return jsonb_build_object('outcome', 'CREATED', 'alreadyCaptured', v_lead_id is null);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Se retira el camino anterior
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Dejarlo vivo mantendría abierta la puerta que este cambio viene a cerrar:
-- bastaría llamar al RPC viejo con el número del dueño para entrar sin código.
drop function if exists public.unlock_public_diagnostic(uuid, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on function public.issue_diagnostic_access_code(uuid) from public;
revoke all on function public.diagnostic_device_summary(uuid) from public;
revoke all on function public.revoke_diagnostic_devices(uuid) from public;
revoke all on function public.open_public_diagnostic(uuid, text) from public;
revoke all on function public.claim_public_diagnostic_device(uuid, text) from public;
revoke all on function public.save_public_diagnostic_progress(uuid, text, jsonb, integer) from public;
revoke all on function public.complete_public_diagnostic(uuid, text, jsonb, jsonb, integer) from public;
revoke all on function public.capture_public_diagnostic_referrals(uuid, text, jsonb) from public;
revoke all on function public.capture_public_diagnostic_lead(uuid, text, text) from public;

-- Emitir, revocar y consultar dispositivos es exclusivo del asesor con sesión.
grant execute on function public.issue_diagnostic_access_code(uuid) to authenticated;
grant execute on function public.diagnostic_device_summary(uuid) to authenticated;
grant execute on function public.revoke_diagnostic_devices(uuid) to authenticated;

-- Abrir, reclamar, guardar y compartir es del dueño del pase, sin sesión.
grant execute on function public.open_public_diagnostic(uuid, text) to anon, authenticated;
grant execute on function public.claim_public_diagnostic_device(uuid, text) to anon, authenticated;
grant execute on function public.save_public_diagnostic_progress(uuid, text, jsonb, integer)
  to anon, authenticated;
grant execute on function public.complete_public_diagnostic(uuid, text, jsonb, jsonb, integer)
  to anon, authenticated;
grant execute on function public.capture_public_diagnostic_referrals(uuid, text, jsonb)
  to anon, authenticated;
grant execute on function public.capture_public_diagnostic_lead(uuid, text, text)
  to anon, authenticated;
