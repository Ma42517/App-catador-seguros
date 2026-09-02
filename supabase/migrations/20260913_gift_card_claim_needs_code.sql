-- Registrarse en una tarjeta exige el código del asesor.
--
-- El problema que cierra: el enlace se puede reenviar, así que cualquiera que lo
-- recibiera podía crear su cuenta y quedarse con la tarjeta. Ahora el enlace por
-- sí solo no basta —el REGISTRO requiere el código de 6 dígitos que sólo el
-- asesor genera—. Sin código válido no se vincula la tarjeta, aunque se tenga la
-- sesión de correo iniciada.
--
-- Reglas (opción A confirmada, ajustada):
--   · El código es de UN SOLO USO: en cuanto alguien lo canjea, muere. Si alguien
--     más lo vio, ya no le sirve.
--   · NO caduca por tiempo: vive hasta que se usa o hasta que el asesor emite
--     otro. Cada tarjeta nueva trae un código distinto.
--   · Sólo el asesor lo genera (issue_gift_card_access_code, ya existente).
--   · Entrar como dueño YA vinculado no pide código: la contraseña de su cuenta
--     protege los inicios siguientes.
--
-- El formulario de registro pide: correo, contraseña y código de invitación.

-- ─────────────────────────────────────────────────────────────────────────────
-- claim_gift_card: ya no reclama en silencio; sólo confirma al dueño existente
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Antes, si la tarjeta estaba libre, la amarraba a quien llamara. Eso es
-- justamente lo que permitía que cualquiera con el enlace se quedara con ella.
-- Ahora una tarjeta libre devuelve NEEDS_CODE: el vínculo se hace sólo por
-- `claim_gift_card_with_signup`, que valida el código.

create or replace function public.claim_gift_card(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub text := auth.jwt() ->> 'sub';
  v_card public.gift_cards%rowtype;
begin
  if v_sub is null then
    return jsonb_build_object('outcome', 'NEEDS_LOGIN');
  end if;

  select * into v_card from public.gift_cards where id = p_card_id;
  if v_card.id is null then
    return jsonb_build_object('outcome', 'NOT_FOUND');
  end if;
  if v_card.status = 'REVOCADA' then
    return jsonb_build_object('outcome', 'REVOKED');
  end if;

  -- Dueño ya vinculado por su cuenta de correo: entra sin código.
  if v_card.owner_google_sub is not null then
    if v_card.owner_google_sub = v_sub then
      return jsonb_build_object('outcome', 'OWNER');
    end if;
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  -- Libre: hace falta el código del asesor para vincularla.
  return jsonb_build_object('outcome', 'NEEDS_CODE');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Vincular con código: el paso que reemplaza al reclamo silencioso
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Lo llama la sesión de correo recién creada, con el código que el asesor
-- compartió. Valida el código (mismo hash y caducidad que el de número+clave),
-- lo AGOTA para que sea de un solo uso, y amarra la tarjeta a esta cuenta.

create or replace function public.claim_gift_card_with_signup(
  p_card_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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

  -- Ya tiene dueño: si es esta cuenta, entra; si no, no. El código no arrebata
  -- una tarjeta ya vinculada.
  if v_card.owner_google_sub is not null then
    if v_card.owner_google_sub = v_sub then
      return jsonb_build_object('outcome', 'OWNER');
    end if;
    return jsonb_build_object('outcome', 'NOT_OWNER');
  end if;

  -- El código de invitación no caduca por tiempo: sólo importa que exista y que
  -- no se haya usado ya (uses_left). La caducidad quedó fuera a propósito —el
  -- control es "un solo uso" y "uno nuevo por tarjeta"—.
  if v_card.access_code_hash is null
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

  -- Código correcto: se amarra la tarjeta y se AGOTA el código (un solo uso).
  update public.gift_cards
     set owner_google_sub = v_sub,
         owner_email = v_email,
         status = 'ACTIVA',
         full_name = coalesce(full_name, v_card.recipient_name),
         claimed_at = now(),
         access_code_uses_left = 0,
         access_code_attempts = 0,
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'OWNER');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- El código de invitación no caduca por tiempo
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `issue_gift_card_access_code` ponía 15 minutos (heredado del acceso por
-- número+clave). Para el registro por correo eso estorbaba: el código debe vivir
-- hasta que se use o hasta que el asesor emita otro. Se le da una vigencia larga
-- para que la columna nunca lo invalide sola; el control real es `uses_left`.

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
  -- Vigencia larga: el código de invitación se controla por uso, no por reloj.
  v_expires := now() + interval '3650 days';

  update public.gift_cards
     set access_code_hash = public.diagnostic_hash(v_code, v_salt),
         access_code_salt = v_salt,
         access_code_expires_at = v_expires,
         access_code_attempts = 0,
         access_code_uses_left = 1,
         updated_at = now()
   where id = p_card_id;

  return jsonb_build_object('outcome', 'ISSUED', 'code', v_code);
end;
$$;

revoke all on function public.claim_gift_card(uuid) from public;
revoke all on function public.claim_gift_card_with_signup(uuid, text) from public;
revoke all on function public.issue_gift_card_access_code(uuid) from public;
grant execute on function public.claim_gift_card(uuid) to anon, authenticated;
grant execute on function public.claim_gift_card_with_signup(uuid, text) to anon, authenticated;
grant execute on function public.issue_gift_card_access_code(uuid) to authenticated;
