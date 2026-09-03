-- Editor de tarjeta v2: modelo de datos ampliado (plantilla, píldoras, contactos, reverso).
--
-- Por qué esta migración es ADITIVA e IDEMPOTENTE:
-- Ya hay tarjetas reales ACTIVAS con el esquema viejo (full_name, title, company,
-- specialties, bio, phone, whatsapp, avatar_url, avatar_path, photo_focus). Ninguna
-- puede romperse ni quedarse vacía. Por eso aquí sólo se AÑADE (add column if not
-- exists) y se RECREA (create or replace) sin tocar ni renombrar columnas de
-- contenido existentes. El usuario aplica este SQL a mano en el SQL Editor de
-- Supabase, así que debe poder ejecutarse una y otra vez sin efectos secundarios.
--
-- ── El mapeo con lo que ya existe ──
-- · píldoras   ↔ specialties  (jsonb ya existente; es su equivalente natural)
-- · teléfono   ↔ phone        (columna ya existente)
-- · whatsapp   ↔ whatsapp     (columna ya existente)
-- Lo demás (plantilla, estado de la píldora superior, y todo lo que no tiene una
-- columna tipada propia) se guarda en columnas nuevas.

-- ── Columnas nuevas ──
-- template: qué plantilla usa la tarjeta. Default 'editorial' para que TODA tarjeta
--   vieja quede en una plantilla válida y con aspecto, nunca vacía. El check limita
--   a las dos plantillas soportadas por el editor.
-- estado_pill: texto libre de la "píldora" de estado que se muestra arriba (p.ej.
--   "Disponible"); nullable porque no toda tarjeta la usa.
-- card_extra: TODO lo que no cabe en una columna tipada propia. Se guarda como jsonb
--   a propósito: así evitamos una decena de columnas nullable (contactos.maps,
--   contactos.instagram, contactos.email, contactos.web, reverso.videoUrl,
--   reverso.ctaTitulo, reverso.ctaBadge, reverso.ctaSubtitulo, reverso.bookingUrl,
--   reverso.bookingTexto…) y podemos evolucionar el reverso o los contactos sin
--   escribir una migración nueva cada vez. Estructura esperada:
--     { "contactos": { "maps": ..., "instagram": ..., "email": ..., "web": ... },
--       "reverso":   { "videoUrl": ..., "ctaTitulo": ..., "ctaBadge": ...,
--                      "ctaSubtitulo": ..., "bookingUrl": ..., "bookingTexto": ... } }
--   Ojo: el teléfono y el whatsapp de contacto NO viven aquí; siguen en las columnas
--   phone/whatsapp para conservar el mapeo ya estabilizado.
alter table public.gift_cards
  add column if not exists template text not null default 'editorial'
    check (template in ('editorial', 'executive')),
  add column if not exists estado_pill text,
  add column if not exists card_extra jsonb not null default '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- Vista pública: se recrea conservando TODO lo previo y sumando lo nuevo
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Mantiene la misma firma public_gift_card(uuid) para no dejar dos versiones vivas.
-- No expone datos sensibles nuevos: card_extra sólo contiene lo que el propio dueño
-- puso en su tarjeta con intención de publicarlo (contactos, reverso). El email del
-- dueño (owner_email) sigue oculto; lo que aparece es únicamente contactos.email,
-- que es un dato de contacto que él eligió mostrar.
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
      -- píldoras es alias de specialties para que el front nuevo no dependa del
      -- nombre viejo; se envían ambos por compatibilidad.
      'pildoras', gc.specialties,
      'bio', gc.bio,
      'phone', gc.phone,
      'whatsapp', gc.whatsapp,
      'avatarUrl', gc.avatar_url,
      'photoFocus', gc.photo_focus,
      'template', coalesce(gc.template, 'editorial'),
      'estadoPill', gc.estado_pill,
      'contactos', coalesce(gc.card_extra->'contactos', '{}'::jsonb),
      'reverso', coalesce(gc.card_extra->'reverso', '{}'::jsonb),
      'canPropagate', gc.can_propagate and gc.propagated_at is null
    )
  end
  from (select 1) s
  left join public.gift_cards gc on gc.id = p_card_id
$$;

revoke all on function public.public_gift_card(uuid) from public;
grant execute on function public.public_gift_card(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lectura del dueño: misma firma (p_card_id, p_device_secret) y misma lógica de
-- gift_card_authorized. Se conservan TODOS los campos y se suman los nuevos.
-- ─────────────────────────────────────────────────────────────────────────────
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
    -- píldoras es alias de specialties; el editor trabaja con "pildoras".
    'pildoras', v.specialties,
    'bio', v.bio,
    'phone', v.phone,
    'whatsapp', v.whatsapp,
    'avatarUrl', v.avatar_url,
    'avatarPath', v.avatar_path,
    'photoFocus', v.photo_focus,
    'template', coalesce(v.template, 'editorial'),
    'estadoPill', v.estado_pill,
    -- cardExtra completo (contactos + reverso) para que el editor lo edite entero.
    'cardExtra', coalesce(v.card_extra, '{}'::jsonb)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Escritura del dueño: misma firma (p_card_id, p_patch, p_device_secret) y mismos
-- checks (gift_card_authorized, REVOCADA). Se suman los campos nuevos al UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────
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
         -- píldoras y specialties son lo mismo: si el editor manda 'pildoras' se
         -- escribe en specialties; se conserva 'specialties' por compatibilidad
         -- con lo que ya existía. El coalesce prioriza 'pildoras' cuando viene.
         specialties = coalesce(p_patch->'pildoras', p_patch->'specialties', specialties),
         bio = coalesce(p_patch->>'bio', bio),
         phone = coalesce(p_patch->>'phone', phone),
         whatsapp = coalesce(p_patch->>'whatsapp', whatsapp),
         photo_focus = coalesce(p_patch->>'photoFocus', photo_focus),
         template = coalesce(p_patch->>'template', template),
         estado_pill = coalesce(p_patch->>'estadoPill', estado_pill),
         -- merge SUPERFICIAL de card_extra: el operador || fusiona el jsonb enviado
         -- sobre el existente sin borrar sub-claves que el patch no incluyó. Así el
         -- editor puede guardar sólo 'contactos' sin perder 'reverso' (y viceversa).
         card_extra = coalesce(card_extra, '{}'::jsonb)
                      || coalesce(p_patch->'cardExtra', '{}'::jsonb),
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'SAVED');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos: se re-otorgan porque create or replace puede requerirlo, replicando
-- los de las migraciones existentes (a anon/authenticated donde corresponde).
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.public_gift_card(uuid) from public;
revoke all on function public.my_gift_card(uuid, text) from public;
revoke all on function public.save_gift_card(uuid, jsonb, text) from public;

grant execute on function public.public_gift_card(uuid) to anon, authenticated;
grant execute on function public.my_gift_card(uuid, text) to anon, authenticated;
grant execute on function public.save_gift_card(uuid, jsonb, text) to anon, authenticated;
